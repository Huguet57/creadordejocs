import { describe, expect, it } from "vitest"
import { mergeProjectCatalog, type SyncCatalogEntry } from "./project-sync.js"

describe("project-sync mergeProjectCatalog", () => {
  const local = (overrides: Partial<SyncCatalogEntry>): SyncCatalogEntry => ({
    projectId: "project-1",
    name: "Local",
    projectSource: "{\"version\":1}",
    updatedAtIso: "2026-02-20T10:00:00.000Z",
    ...overrides
  })

  it("keeps local version when local updatedAt is newer and schedules upload", () => {
    const result = mergeProjectCatalog(
      [local({ updatedAtIso: "2026-02-20T10:00:01.000Z" })],
      [local({ name: "Remote", updatedAtIso: "2026-02-20T10:00:00.000Z" })]
    )

    expect(result.merged).toHaveLength(1)
    expect(result.merged[0]?.name).toBe("Local")
    expect(result.toUpload).toHaveLength(1)
    expect(result.toUpload[0]?.name).toBe("Local")
  })

  it("keeps remote version when remote updatedAt is newer", () => {
    const result = mergeProjectCatalog(
      [local({ updatedAtIso: "2026-02-20T10:00:00.000Z" })],
      [local({ name: "Remote", updatedAtIso: "2026-02-20T10:00:02.000Z" })]
    )

    expect(result.merged).toHaveLength(1)
    expect(result.merged[0]?.name).toBe("Remote")
    expect(result.toUpload).toEqual([])
  })

  it("includes local-only project and schedules upload", () => {
    const result = mergeProjectCatalog(
      [local({ projectId: "project-local-only", name: "Only local" })],
      []
    )

    expect(result.merged).toHaveLength(1)
    expect(result.merged[0]?.projectId).toBe("project-local-only")
    expect(result.toUpload).toHaveLength(1)
  })

  it("includes remote-only project without scheduling upload", () => {
    const result = mergeProjectCatalog([], [local({ projectId: "project-remote-only", name: "Only remote" })])

    expect(result.merged).toHaveLength(1)
    expect(result.merged[0]?.projectId).toBe("project-remote-only")
    expect(result.toUpload).toEqual([])
  })

  it("does not schedule upload when timestamps are equal", () => {
    const timestamp = "2026-02-20T10:00:00.000Z"
    const result = mergeProjectCatalog(
      [local({ updatedAtIso: timestamp })],
      [local({ name: "Remote", updatedAtIso: timestamp })]
    )

    expect(result.toUpload).toEqual([])
    expect(result.merged[0]?.updatedAtIso).toBe(timestamp)
  })
})
