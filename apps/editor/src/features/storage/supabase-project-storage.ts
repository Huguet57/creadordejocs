import { serializeProjectV1, type ProjectV1 } from "@creadordejocs/project-format"
import type { SupabaseClient } from "@supabase/supabase-js"

type ProjectSelectRow = {
  project_id: string
  name: string
  project_source: string
  updated_at: string
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
  const payload = {
    user_id: userId,
    project_id: input.project.metadata.id,
    name: input.project.metadata.name,
    project_source: serializeProjectV1(input.project),
    updated_at: updatedAtIso
  }

  const { data, error } = await client
    .from("projects")
    .upsert(payload, { onConflict: "user_id,project_id" })
    .select("updated_at")
    .single()

  if (error) {
    throw new Error(`Could not upsert user project: ${error.message}`)
  }

  const updatedAt = (data as { updated_at?: string } | null)?.updated_at ?? updatedAtIso
  return { updatedAtIso: updatedAt }
}

export async function deleteUserProject(client: SupabaseClient, userId: string, projectId: string): Promise<void> {
  const { error } = await client.from("projects").delete().eq("user_id", userId).eq("project_id", projectId)

  if (error) {
    throw new Error(`Could not delete user project: ${error.message}`)
  }
}
