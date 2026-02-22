import { createEmptyProjectV1, parseProjectV1, serializeProjectV1 } from "@creadordejocs/project-format"
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
    expect(result.conflictCopies).toEqual([])
  })

  it("keeps remote version when remote updatedAt is newer", () => {
    const result = mergeProjectCatalog(
      [local({ updatedAtIso: "2026-02-20T10:00:00.000Z" })],
      [local({ name: "Remote", updatedAtIso: "2026-02-20T10:00:02.000Z" })]
    )

    expect(result.merged).toHaveLength(1)
    expect(result.merged[0]?.name).toBe("Remote")
    expect(result.toUpload).toEqual([])
    expect(result.conflictCopies).toEqual([])
  })

  it("includes local-only project and schedules upload", () => {
    const result = mergeProjectCatalog(
      [local({ projectId: "project-local-only", name: "Only local" })],
      []
    )

    expect(result.merged).toHaveLength(1)
    expect(result.merged[0]?.projectId).toBe("project-local-only")
    expect(result.toUpload).toHaveLength(1)
    expect(result.conflictCopies).toEqual([])
  })

  it("includes remote-only project without scheduling upload", () => {
    const result = mergeProjectCatalog([], [local({ projectId: "project-remote-only", name: "Only remote" })])

    expect(result.merged).toHaveLength(1)
    expect(result.merged[0]?.projectId).toBe("project-remote-only")
    expect(result.toUpload).toEqual([])
    expect(result.conflictCopies).toEqual([])
  })

  it("does not schedule upload when timestamps are equal", () => {
    const timestamp = "2026-02-20T10:00:00.000Z"
    const result = mergeProjectCatalog(
      [local({ updatedAtIso: timestamp })],
      [local({ name: "Remote", updatedAtIso: timestamp })]
    )

    expect(result.toUpload).toEqual([])
    expect(result.merged[0]?.updatedAtIso).toBe(timestamp)
    expect(result.conflictCopies).toEqual([])
  })

  it("when timestamps are equal but content differs, keeps remote and emits local conflict copy", () => {
    const timestamp = "2026-02-20T10:00:00.000Z"
    const result = mergeProjectCatalog(
      [local({ name: "Local version", projectSource: "{\"version\":1,\"id\":\"local\"}", updatedAtIso: timestamp })],
      [local({ name: "Remote version", projectSource: "{\"version\":1,\"id\":\"remote\"}", updatedAtIso: timestamp })]
    )

    expect(result.merged).toHaveLength(1)
    expect(result.merged[0]?.name).toBe("Remote version")
    expect(result.toUpload).toEqual([])
    expect(result.conflictCopies).toHaveLength(1)
    expect(result.conflictCopies[0]?.projectId).not.toBe("project-1")
    expect(result.conflictCopies[0]?.name).toContain("Local version")
    expect(result.conflictCopies[0]?.name).toContain("conflict")
    expect(result.conflictCopies[0]?.projectSource).toContain("\"local\"")
  })

  it("when timestamps are equal and source differs only by json formatting, does not emit conflict copy", () => {
    const timestamp = "2026-02-20T10:00:00.000Z"
    const sourceProject = createEmptyProjectV1("Formatting only")
    const canonicalSource = serializeProjectV1(sourceProject)
    const prettyPrintedSource = JSON.stringify(JSON.parse(canonicalSource), null, 2)

    const result = mergeProjectCatalog(
      [local({ name: "Local", projectSource: canonicalSource, updatedAtIso: timestamp })],
      [local({ name: "Remote", projectSource: prettyPrintedSource, updatedAtIso: timestamp })]
    )

    expect(result.toUpload).toEqual([])
    expect(result.conflictCopies).toEqual([])
  })

  it("when timestamps are equal and source differs only by projectLoad metric, does not emit conflict copy", () => {
    const timestamp = "2026-02-20T10:00:00.000Z"
    const sourceProject = createEmptyProjectV1("Project load only")
    const localSource = serializeProjectV1({
      ...sourceProject,
      metrics: {
        ...sourceProject.metrics,
        projectLoad: 40
      }
    })
    const remoteSource = serializeProjectV1({
      ...sourceProject,
      metrics: {
        ...sourceProject.metrics,
        projectLoad: 41
      }
    })

    const result = mergeProjectCatalog(
      [local({ name: "Local", projectSource: localSource, updatedAtIso: timestamp })],
      [local({ name: "Remote", projectSource: remoteSource, updatedAtIso: timestamp })]
    )

    expect(result.toUpload).toEqual([])
    expect(result.conflictCopies).toEqual([])
  })

  it("when timestamps are equal and one source is legacy actions[] format, does not emit conflict copy", () => {
    const timestamp = "2026-02-20T10:00:00.000Z"
    const baseProject = createEmptyProjectV1("Legacy sync")
    const legacySource = JSON.stringify({
      ...baseProject,
      objects: [
        {
          id: "object-player",
          name: "Player",
          spriteId: null,
          x: 0,
          y: 0,
          speed: 0,
          direction: 0,
          events: [
            {
              id: "event-step",
              type: "Step",
              key: null,
              targetObjectId: null,
              intervalMs: null,
              actions: [{ id: "action-move", type: "move", dx: 2, dy: 1 }]
            }
          ]
        }
      ]
    })
    const normalizedSource = serializeProjectV1(parseProjectV1(legacySource))

    const result = mergeProjectCatalog(
      [local({ name: "Local", projectSource: legacySource, updatedAtIso: timestamp })],
      [local({ name: "Remote", projectSource: normalizedSource, updatedAtIso: timestamp })]
    )

    expect(result.toUpload).toEqual([])
    expect(result.conflictCopies).toEqual([])
  })
})
