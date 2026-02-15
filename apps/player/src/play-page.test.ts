import { createEmptyProjectV1, serializeProjectV1 } from "@creadordejocs/project-format"
import { describe, expect, it, vi } from "vitest"
import { extractShareIdFromPath, loadPublishedProject } from "./play-page.js"

describe("extractShareIdFromPath", () => {
  it("returns the id for /play/:id", () => {
    expect(extractShareIdFromPath("/play/share_123")).toBe("share_123")
  })

  it("handles trailing slash", () => {
    expect(extractShareIdFromPath("/play/share_123/")).toBe("share_123")
  })

  it("returns null for non play routes", () => {
    expect(extractShareIdFromPath("/editor")).toBeNull()
  })
})

describe("loadPublishedProject", () => {
  it("loads and validates project data from share API", async () => {
    const project = createEmptyProjectV1("Shared project")
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          id: "share_123",
          projectSource: serializeProjectV1(project)
        }),
        { status: 200, headers: { "content-type": "application/json" } }
      )
    )

    const loaded = await loadPublishedProject("share_123", fetchMock)

    expect(loaded.metadata.name).toBe("Shared project")
    expect(fetchMock).toHaveBeenCalledWith("/api/share/share_123")
  })

  it("throws when API does not find the project", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({ error: "share_not_found" }), { status: 404 }))

    await expect(loadPublishedProject("missing", fetchMock)).rejects.toThrow("Game not found.")
  })
})
