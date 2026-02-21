import { createEmptyProjectV1, serializeProjectV1 } from "@creadordejocs/project-format"
import { beforeEach, describe, expect, it, vi } from "vitest"
import {
  deleteUserProject,
  listUserProjects,
  resetSupabaseProjectStorageStateForTests,
  upsertUserProject
} from "./supabase-project-storage.js"

describe("supabase-project-storage", () => {
  beforeEach(() => {
    resetSupabaseProjectStorageStateForTests()
  })

  it("lists user projects sorted by updated_at desc", async () => {
    const order = vi.fn().mockResolvedValue({
      data: [
        {
          project_id: "project-2",
          name: "B",
          project_source: "{\"version\":1}",
          updated_at: "2026-02-20T10:00:00.000Z"
        },
        {
          project_id: "project-1",
          name: "A",
          project_source: "{\"version\":1}",
          updated_at: "2026-02-20T09:00:00.000Z"
        }
      ],
      error: null
    })

    const eq = vi.fn().mockReturnValue({ order })
    const select = vi.fn().mockReturnValue({ eq })
    const from = vi.fn().mockReturnValue({ select })
    const client = { from } as unknown as Parameters<typeof listUserProjects>[0]

    const result = await listUserProjects(client, "user-1")

    expect(from).toHaveBeenCalledWith("projects")
    expect(select).toHaveBeenCalledWith("project_id,name,project_source,updated_at")
    expect(eq).toHaveBeenCalledWith("user_id", "user-1")
    expect(order).toHaveBeenCalledWith("updated_at", { ascending: false })
    expect(result.map((entry) => entry.projectId)).toEqual(["project-2", "project-1"])
  })

  it("upserts project_source for a user project", async () => {
    const rpc = vi.fn().mockResolvedValue({
      data: {
        updated_at: "2026-02-20T11:00:00.000Z"
      },
      error: null
    })
    const client = { rpc } as unknown as Parameters<typeof upsertUserProject>[0]

    const project = createEmptyProjectV1("Sync me")
    project.metadata.id = "1f3cf9a8-7608-4fd3-bf89-905f3809cf42"
    const updatedAtIso = "2026-02-20T11:00:00.000Z"

    const result = await upsertUserProject(client, "user-1", {
      project,
      updatedAtIso
    })

    expect(rpc).toHaveBeenCalledWith("upsert_project_if_newer", {
      p_user_id: "user-1",
      p_project_id: "1f3cf9a8-7608-4fd3-bf89-905f3809cf42",
      p_name: "Sync me",
      p_project_source: serializeProjectV1(project),
      p_updated_at: updatedAtIso
    })
    expect(result.updatedAtIso).toBe(updatedAtIso)
  })

  it("falls back to direct table upsert when rpc is missing", async () => {
    const rpc = vi.fn().mockResolvedValue({
      data: null,
      error: {
        code: "PGRST202",
        message: "Could not find the function public.upsert_project_if_newer(...) in the schema cache"
      }
    })

    const maybeSingle = vi.fn().mockResolvedValue({ data: null, error: null })
    const eqProject = vi.fn().mockReturnValue({ maybeSingle })
    const eqUser = vi.fn().mockReturnValue({ eq: eqProject })
    const select = vi.fn().mockReturnValue({ eq: eqUser })
    const upsert = vi.fn().mockResolvedValue({ error: null })
    const from = vi.fn().mockReturnValue({ select, upsert })
    const client = { rpc, from } as unknown as Parameters<typeof upsertUserProject>[0]

    const project = createEmptyProjectV1("Fallback me")
    project.metadata.id = "153f9943-fca9-49a7-b88e-f9f52f4735c5"
    const updatedAtIso = "2026-02-20T11:00:00.000Z"

    const result = await upsertUserProject(client, "user-1", {
      project,
      updatedAtIso
    })

    expect(from).toHaveBeenCalledWith("projects")
    expect(select).toHaveBeenCalledWith("updated_at")
    expect(eqUser).toHaveBeenCalledWith("user_id", "user-1")
    expect(eqProject).toHaveBeenCalledWith("project_id", "153f9943-fca9-49a7-b88e-f9f52f4735c5")
    expect(upsert).toHaveBeenCalledWith(
      {
        user_id: "user-1",
        project_id: "153f9943-fca9-49a7-b88e-f9f52f4735c5",
        name: "Fallback me",
        project_source: serializeProjectV1(project),
        updated_at: updatedAtIso
      },
      {
        onConflict: "user_id,project_id"
      }
    )
    expect(result.updatedAtIso).toBe(updatedAtIso)
  })

  it("skips fallback upsert when remote row is newer", async () => {
    const rpc = vi.fn().mockResolvedValue({
      data: null,
      error: {
        code: "PGRST202",
        message: "Could not find the function public.upsert_project_if_newer(...) in the schema cache"
      }
    })

    const maybeSingle = vi.fn().mockResolvedValue({
      data: { updated_at: "2026-02-20T12:00:00.000Z" },
      error: null
    })
    const eqProject = vi.fn().mockReturnValue({ maybeSingle })
    const eqUser = vi.fn().mockReturnValue({ eq: eqProject })
    const select = vi.fn().mockReturnValue({ eq: eqUser })
    const upsert = vi.fn().mockResolvedValue({ error: null })
    const from = vi.fn().mockReturnValue({ select, upsert })
    const client = { rpc, from } as unknown as Parameters<typeof upsertUserProject>[0]

    const project = createEmptyProjectV1("Fallback me")
    project.metadata.id = "8e579437-67d2-4a88-a568-3a7f0dbe0296"

    const result = await upsertUserProject(client, "user-1", {
      project,
      updatedAtIso: "2026-02-20T11:00:00.000Z"
    })

    expect(upsert).not.toHaveBeenCalled()
    expect(result.updatedAtIso).toBe("2026-02-20T12:00:00.000Z")
  })

  it("skips remote upsert when project id is not a UUID", async () => {
    const rpc = vi.fn()
    const from = vi.fn()
    const client = { rpc, from } as unknown as Parameters<typeof upsertUserProject>[0]

    const project = createEmptyProjectV1("Legacy id")
    project.metadata.id = "proj-pkmn-0000-4000-8000-000000000000"
    const updatedAtIso = "2026-02-20T11:00:00.000Z"

    const result = await upsertUserProject(client, "user-1", { project, updatedAtIso })

    expect(rpc).not.toHaveBeenCalled()
    expect(from).not.toHaveBeenCalled()
    expect(result.updatedAtIso).toBe(updatedAtIso)
  })

  it("stops calling RPC after first not-found response and uses table fallback", async () => {
    const rpc = vi
      .fn()
      .mockResolvedValueOnce({
        data: null,
        error: {
          code: "PGRST202",
          message: "Could not find the function public.upsert_project_if_newer(...) in the schema cache"
        }
      })
      .mockResolvedValueOnce({
        data: null,
        error: {
          code: "PGRST202",
          message: "Could not find the function public.upsert_project_if_newer(...) in the schema cache"
        }
      })

    const maybeSingle = vi.fn().mockResolvedValue({ data: null, error: null })
    const eqProject = vi.fn().mockReturnValue({ maybeSingle })
    const eqUser = vi.fn().mockReturnValue({ eq: eqProject })
    const select = vi.fn().mockReturnValue({ eq: eqUser })
    const upsert = vi.fn().mockResolvedValue({ error: null })
    const from = vi.fn().mockReturnValue({ select, upsert })
    const client = { rpc, from } as unknown as Parameters<typeof upsertUserProject>[0]

    const projectA = createEmptyProjectV1("A")
    projectA.metadata.id = "f370c9a8-b302-4c4d-a0d8-786965c99712"
    await upsertUserProject(client, "user-1", { project: projectA, updatedAtIso: "2026-02-20T11:00:00.000Z" })

    const projectB = createEmptyProjectV1("B")
    projectB.metadata.id = "d186263e-2a47-4ba2-917d-95e89d4eb4d4"
    await upsertUserProject(client, "user-1", { project: projectB, updatedAtIso: "2026-02-20T11:01:00.000Z" })

    expect(rpc).toHaveBeenCalledTimes(1)
    expect(from).toHaveBeenCalledTimes(4)
  })

  it("deletes a user project", async () => {
    const eqProject = vi.fn().mockResolvedValue({ error: null })
    const eqUser = vi.fn().mockReturnValue({ eq: eqProject })
    const del = vi.fn().mockReturnValue({ eq: eqUser })
    const from = vi.fn().mockReturnValue({ delete: del })
    const client = { from } as unknown as Parameters<typeof deleteUserProject>[0]

    await deleteUserProject(client, "user-1", "f35f539f-f60d-48a6-ae74-f7fcb0ac0499")

    expect(del).toHaveBeenCalled()
    expect(eqUser).toHaveBeenCalledWith("user_id", "user-1")
    expect(eqProject).toHaveBeenCalledWith("project_id", "f35f539f-f60d-48a6-ae74-f7fcb0ac0499")
  })

  it("skips delete when project id is not a UUID", async () => {
    const from = vi.fn()
    const client = { from } as unknown as Parameters<typeof deleteUserProject>[0]

    await deleteUserProject(client, "user-1", "proj-pkmn-0000-4000-8000-000000000000")

    expect(from).not.toHaveBeenCalled()
  })
})
