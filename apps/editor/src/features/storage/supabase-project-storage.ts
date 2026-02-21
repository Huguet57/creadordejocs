import { serializeProjectV1, type ProjectV1 } from "@creadordejocs/project-format"
import type { SupabaseClient } from "@supabase/supabase-js"

type ProjectSelectRow = {
  project_id: string
  name: string
  project_source: string
  updated_at: string
}

type UpsertProjectRpcRow = {
  updated_at: string
}

type SupabaseErrorLike = {
  message: string
  code?: string
}

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
let rpcUpsertUnavailable = false

/** For tests only. */
export function resetSupabaseProjectStorageStateForTests(): void {
  rpcUpsertUnavailable = false
}

export type UserProjectRecord = {
  projectId: string
  name: string
  projectSource: string
  updatedAtIso: string
}

export type UpsertUserProjectInput = {
  project: ProjectV1
  updatedAtIso?: string
}

function toUserProjectRecord(row: ProjectSelectRow): UserProjectRecord {
  return {
    projectId: row.project_id,
    name: row.name,
    projectSource: row.project_source,
    updatedAtIso: row.updated_at
  }
}

export async function listUserProjects(client: SupabaseClient, userId: string): Promise<UserProjectRecord[]> {
  const { data, error } = await client
    .from("projects")
    .select("project_id,name,project_source,updated_at")
    .eq("user_id", userId)
    .order("updated_at", { ascending: false })

  if (error) {
    throw new Error(`Could not list user projects: ${error.message}`)
  }

  const rows = (data ?? []) as ProjectSelectRow[]
  return rows.map((entry) => toUserProjectRecord(entry))
}

export async function upsertUserProject(
  client: SupabaseClient,
  userId: string,
  input: UpsertUserProjectInput
): Promise<{ updatedAtIso: string }> {
  const updatedAtIso = input.updatedAtIso ?? new Date().toISOString()
  if (!isUuid(input.project.metadata.id)) {
    // Local legacy records may use non-UUID ids; skip remote sync for that stale payload.
    return { updatedAtIso }
  }

  const projectSource = serializeProjectV1(input.project)

  if (rpcUpsertUnavailable) {
    return upsertUserProjectWithTableFallback(client, userId, input, projectSource, updatedAtIso)
  }

  const rpcResponse = (await client.rpc("upsert_project_if_newer", {
    p_user_id: userId,
    p_project_id: input.project.metadata.id,
    p_name: input.project.metadata.name,
    p_project_source: projectSource,
    p_updated_at: updatedAtIso
  })) as {
    data: UpsertProjectRpcRow[] | UpsertProjectRpcRow | null
    error: SupabaseErrorLike | null
  }
  const data = rpcResponse.data
  const error = rpcResponse.error

  if (error) {
    if (shouldFallbackToTableUpsert(error)) {
      rpcUpsertUnavailable = true
      return upsertUserProjectWithTableFallback(client, userId, input, projectSource, updatedAtIso)
    }
    throw new Error(`Could not upsert user project: ${error.message}`)
  }

  const resolvedData = Array.isArray(data) ? (data[0] as { updated_at?: string } | undefined) : (data as { updated_at?: string } | null)
  const updatedAt = resolvedData?.updated_at ?? updatedAtIso
  return { updatedAtIso: updatedAt }
}

export async function deleteUserProject(client: SupabaseClient, userId: string, projectId: string): Promise<void> {
  if (!isUuid(projectId)) {
    return
  }
  const { error } = await client.from("projects").delete().eq("user_id", userId).eq("project_id", projectId)

  if (error) {
    throw new Error(`Could not delete user project: ${error.message}`)
  }
}

function shouldFallbackToTableUpsert(error: SupabaseErrorLike): boolean {
  if (error.code === "PGRST202") {
    return true
  }

  const normalizedMessage = error.message.toLowerCase()
  return normalizedMessage.includes("could not find the function public.upsert_project_if_newer")
}

function isUuid(value: string): boolean {
  return UUID_PATTERN.test(value.trim())
}

function compareIsoDate(left: string, right: string): number {
  const leftMs = Date.parse(left)
  const rightMs = Date.parse(right)

  if (Number.isFinite(leftMs) && Number.isFinite(rightMs)) {
    return leftMs - rightMs
  }

  return left.localeCompare(right)
}

async function upsertUserProjectWithTableFallback(
  client: SupabaseClient,
  userId: string,
  input: UpsertUserProjectInput,
  projectSource: string,
  updatedAtIso: string
): Promise<{ updatedAtIso: string }> {
  const projectId = input.project.metadata.id

  const existingResponse = (await client
    .from("projects")
    .select("updated_at")
    .eq("user_id", userId)
    .eq("project_id", projectId)
    .maybeSingle()) as {
    data: { updated_at?: string } | null
    error: SupabaseErrorLike | null
  }

  if (existingResponse.error) {
    throw new Error(`Could not upsert user project: ${existingResponse.error.message}`)
  }

  const existingUpdatedAtIso = existingResponse.data?.updated_at
  if (typeof existingUpdatedAtIso === "string" && compareIsoDate(existingUpdatedAtIso, updatedAtIso) > 0) {
    return { updatedAtIso: existingUpdatedAtIso }
  }

  const upsertResponse = (await client.from("projects").upsert(
    {
      user_id: userId,
      project_id: projectId,
      name: input.project.metadata.name,
      project_source: projectSource,
      updated_at: updatedAtIso
    },
    {
      onConflict: "user_id,project_id"
    }
  )) as {
    error: SupabaseErrorLike | null
  }

  if (upsertResponse.error) {
    throw new Error(`Could not upsert user project: ${upsertResponse.error.message}`)
  }

  return { updatedAtIso }
}
