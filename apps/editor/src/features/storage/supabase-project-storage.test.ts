import { createEmptyProjectV1, serializeProjectV1 } from "@creadordejocs/project-format"
import { describe, expect, it, vi } from "vitest"
import { deleteUserProject, listUserProjects, upsertUserProject } from "./supabase-project-storage.js"

describe("supabase-project-storage", () => {
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
    project.metadata.id = "project-42"
    const updatedAtIso = "2026-02-20T11:00:00.000Z"

    const result = await upsertUserProject(client, "user-1", {
      project,
      updatedAtIso
    })

    expect(rpc).toHaveBeenCalledWith("upsert_project_if_newer", {
      p_user_id: "user-1",
      p_project_id: "project-42",
      p_name: "Sync me",
      p_project_source: serializeProjectV1(project),
      p_updated_at: updatedAtIso
    })
    expect(result.updatedAtIso).toBe(updatedAtIso)
  })

  it("deletes a user project", async () => {
    const eqProject = vi.fn().mockResolvedValue({ error: null })
    const eqUser = vi.fn().mockReturnValue({ eq: eqProject })
    const del = vi.fn().mockReturnValue({ eq: eqUser })
    const from = vi.fn().mockReturnValue({ delete: del })
    const client = { from } as unknown as Parameters<typeof deleteUserProject>[0]

    await deleteUserProject(client, "user-1", "project-9")

    expect(del).toHaveBeenCalled()
    expect(eqUser).toHaveBeenCalledWith("user_id", "user-1")
    expect(eqProject).toHaveBeenCalledWith("project_id", "project-9")
  })
})
