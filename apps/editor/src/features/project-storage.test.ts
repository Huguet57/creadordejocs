import { createEmptyProjectV1, serializeProjectV1 } from "@creadordejocs/project-format"
import { afterEach, beforeEach, describe, expect, it } from "vitest"
import { InMemoryKvProvider } from "./storage/in-memory-kv-provider.js"
import { resetKvStorageProvider, setKvStorageProvider } from "./storage/get-kv-storage-provider.js"
import {
  createLocalProject,
  deleteLocalProject,
  ensureLocalProjectState,
  hasLegacyLocalProjects,
  importLegacyLocalProjectsToScope,
  getActiveProjectIdFromLocalStorage,
  LEGACY_LOCAL_PROJECT_KEY_PREFIX,
  LEGACY_LOCAL_PROJECTS_INDEX_KEY,
  LEGACY_LOCAL_SNAPSHOTS_KEY_PREFIX,
  LOCAL_PROJECT_KEY_PREFIX,
  LOCAL_PROJECTS_INDEX_KEY,
  LOCAL_SNAPSHOTS_KEY_PREFIX,
  listLocalProjects,
  listLegacyLocalProjects,
  loadProjectFromLocalStorage,
  loadSnapshotProject,
  loadSnapshotsFromLocalStorage,
  renameLocalProject,
  saveCheckpointSnapshot,
  saveProjectLocally,
  saveProjectByIdLocally,
  setActiveProjectIdInLocalStorage
} from "./project-storage.js"

describe("project-storage (multi-project)", () => {
  let kv: InMemoryKvProvider

  beforeEach(() => {
    kv = new InMemoryKvProvider()
    setKvStorageProvider(kv)
  })

  afterEach(() => {
    resetKvStorageProvider()
  })

  it("creates initial local project state when storage is empty", () => {
    const state = ensureLocalProjectState(() => createEmptyProjectV1("Primer joc"))

    expect(state.project.metadata.name).toBe("Primer joc")
    expect(state.activeProjectId).toBe(state.project.metadata.id)
    expect(listLocalProjects()).toHaveLength(1)
    expect(getActiveProjectIdFromLocalStorage()).toBe(state.project.metadata.id)
  })

  it("creates a second project and can switch active project", () => {
    const initial = ensureLocalProjectState(() => createEmptyProjectV1("Joc A"))
    const second = createLocalProject(createEmptyProjectV1("Joc B"))

    expect(listLocalProjects()).toHaveLength(2)
    expect(getActiveProjectIdFromLocalStorage()).toBe(second.projectId)

    const switched = setActiveProjectIdInLocalStorage(initial.activeProjectId)
    expect(switched).toBe(true)
    expect(getActiveProjectIdFromLocalStorage()).toBe(initial.activeProjectId)

    const loaded = loadProjectFromLocalStorage()
    expect(loaded?.metadata.name).toBe("Joc A")
  })

  it("normalizes non-UUID project ids when creating locally", () => {
    const imported = createEmptyProjectV1("Imported non uuid")
    imported.metadata.id = "proj-pkmn-0000-4000-8000-000000000000"

    const summary = createLocalProject(imported)
    const loaded = loadProjectFromLocalStorage(summary.projectId)

    expect(summary.projectId).not.toBe("proj-pkmn-0000-4000-8000-000000000000")
    expect(summary.projectId).toMatch(/^[0-9a-f-]{36}$/i)
    expect(loaded?.metadata.id).toBe(summary.projectId)
  })

  it("migrates snapshots when saving with a legacy non-UUID project id", () => {
    const legacyProject = createEmptyProjectV1("Legacy id")
    legacyProject.metadata.id = "proj-pkmn-0000-4000-8000-000000000000"
    const legacySummary = saveProjectByIdLocally(legacyProject.metadata.id, legacyProject, { setActive: true })

    saveCheckpointSnapshot(legacyProject, "legacy-snapshot", legacySummary.projectId)

    const updated = createEmptyProjectV1("Legacy id updated")
    updated.metadata.id = legacySummary.projectId
    const saved = saveProjectByIdLocally(legacySummary.projectId, updated, { setActive: true })

    expect(saved.projectId).toMatch(/^[0-9a-f-]{36}$/i)
    expect(loadSnapshotsFromLocalStorage(saved.projectId)).toHaveLength(1)
  })

  it("renames an existing project", () => {
    const state = ensureLocalProjectState(() => createEmptyProjectV1("Abans"))

    const renamed = renameLocalProject(state.activeProjectId, "Despres")

    expect(renamed).not.toBeNull()
    expect(listLocalProjects()[0]?.name).toBe("Despres")
    expect(loadProjectFromLocalStorage(state.activeProjectId)?.metadata.name).toBe("Despres")
  })

  it("deletes a project and reassigns active project to the remaining one", () => {
    const first = ensureLocalProjectState(() => createEmptyProjectV1("Joc 1"))
    const second = createLocalProject(createEmptyProjectV1("Joc 2"))

    deleteLocalProject(second.projectId)

    expect(listLocalProjects()).toHaveLength(1)
    expect(getActiveProjectIdFromLocalStorage()).toBe(first.activeProjectId)
    expect(loadProjectFromLocalStorage(first.activeProjectId)?.metadata.name).toBe("Joc 1")
  })

  it("stores snapshots per project id", () => {
    const first = ensureLocalProjectState(() => createEmptyProjectV1("Joc 1"))
    const second = createLocalProject(createEmptyProjectV1("Joc 2"))

    const snapA = saveCheckpointSnapshot(createEmptyProjectV1("Joc 1 state"), "first checkpoint", first.activeProjectId)
    const snapB = saveCheckpointSnapshot(createEmptyProjectV1("Joc 2 state"), "second checkpoint", second.projectId)

    expect(loadSnapshotsFromLocalStorage(first.activeProjectId)).toHaveLength(1)
    expect(loadSnapshotsFromLocalStorage(second.projectId)).toHaveLength(1)

    const restoredA = loadSnapshotProject(snapA[0]!.id, first.activeProjectId)
    const restoredB = loadSnapshotProject(snapB[0]!.id, second.projectId)

    expect(restoredA?.metadata.name).toBe("Joc 1 state")
    expect(restoredB?.metadata.name).toBe("Joc 2 state")
  })

  it("updates project summary timestamp when saving active project", () => {
    const state = ensureLocalProjectState(() => createEmptyProjectV1("Timer"))
    const initialSummary = listLocalProjects()[0]

    const next = createEmptyProjectV1("Timer edited")
    next.metadata.id = state.activeProjectId
    saveProjectLocally(next)

    const updatedSummary = listLocalProjects()[0]
    expect(updatedSummary).toBeDefined()
    expect(updatedSummary?.projectId).toBe(state.activeProjectId)
    expect(updatedSummary?.name).toBe("Timer edited")
    expect(updatedSummary!.updatedAtIso >= (initialSummary?.updatedAtIso ?? "")).toBe(true)
  })

  it("migrates legacy non-UUID active project ids during ensureLocalProjectState", () => {
    const legacyId = "proj-pkmn-0000-4000-8000-000000000000"
    const legacyProject = createEmptyProjectV1("Legacy non uuid")
    legacyProject.metadata.id = legacyId

    kv.setItem(
      LOCAL_PROJECTS_INDEX_KEY,
      JSON.stringify({
        version: 2,
        activeProjectId: legacyId,
        projects: [
          {
            projectId: legacyId,
            name: legacyProject.metadata.name,
            updatedAtIso: "2026-02-20T10:00:00.000Z"
          }
        ]
      })
    )
    kv.setItem(`${LOCAL_PROJECT_KEY_PREFIX}__local__.${legacyId}`, serializeProjectV1(legacyProject))
    kv.setItem(
      `${LOCAL_SNAPSHOTS_KEY_PREFIX}__local__.${legacyId}`,
      JSON.stringify([
        {
          id: "legacy-snapshot",
          label: "old",
          savedAtIso: "2026-02-20T09:00:00.000Z",
          projectSource: serializeProjectV1(legacyProject)
        }
      ])
    )

    const state = ensureLocalProjectState(() => createEmptyProjectV1("should-not-be-used"))

    expect(state.activeProjectId).not.toBe(legacyId)
    expect(state.activeProjectId).toMatch(/^[0-9a-f-]{36}$/i)
    expect(state.project.metadata.id).toBe(state.activeProjectId)
    expect(kv.getItem(`${LOCAL_PROJECT_KEY_PREFIX}__local__.${legacyId}`)).toBeNull()
    expect(kv.getItem(`${LOCAL_SNAPSHOTS_KEY_PREFIX}__local__.${legacyId}`)).toBeNull()
    expect(loadSnapshotsFromLocalStorage(state.activeProjectId)).toHaveLength(1)
  })

  it("isolates project catalogs by scopeUserId", () => {
    const scopeA = "user-a"
    const scopeB = "user-b"

    const stateA = ensureLocalProjectState(() => createEmptyProjectV1("Scope A"), scopeA)
    const stateB = ensureLocalProjectState(() => createEmptyProjectV1("Scope B"), scopeB)

    expect(stateA.activeProjectId).not.toBe(stateB.activeProjectId)
    expect(listLocalProjects(scopeA)).toHaveLength(1)
    expect(listLocalProjects(scopeB)).toHaveLength(1)
    expect(listLocalProjects(scopeA)[0]?.name).toBe("Scope A")
    expect(listLocalProjects(scopeB)[0]?.name).toBe("Scope B")
    expect(loadProjectFromLocalStorage(stateA.activeProjectId, scopeA)?.metadata.name).toBe("Scope A")
    expect(loadProjectFromLocalStorage(stateB.activeProjectId, scopeB)?.metadata.name).toBe("Scope B")
    expect(loadProjectFromLocalStorage(stateA.activeProjectId, scopeB)).toBeNull()
  })

  it("supports manual import of legacy v2 local projects into a scoped catalog", () => {
    const legacyProject = createEmptyProjectV1("Legacy project")
    legacyProject.metadata.id = "legacy-project-1"
    const legacyUpdatedAt = "2026-02-20T10:00:00.000Z"
    const legacySnapshots = [
      {
        id: "legacy-snapshot-1",
        label: "before crash",
        savedAtIso: "2026-02-20T09:00:00.000Z",
        projectSource: serializeProjectV1(legacyProject)
      }
    ]

    kv.setItem(
      LEGACY_LOCAL_PROJECTS_INDEX_KEY,
      JSON.stringify({
        version: 2,
        activeProjectId: legacyProject.metadata.id,
        projects: [
          {
            projectId: legacyProject.metadata.id,
            name: legacyProject.metadata.name,
            updatedAtIso: legacyUpdatedAt
          }
        ]
      })
    )
    kv.setItem(`${LEGACY_LOCAL_PROJECT_KEY_PREFIX}${legacyProject.metadata.id}`, serializeProjectV1(legacyProject))
    kv.setItem(`${LEGACY_LOCAL_SNAPSHOTS_KEY_PREFIX}${legacyProject.metadata.id}`, JSON.stringify(legacySnapshots))

    expect(hasLegacyLocalProjects()).toBe(true)
    expect(listLegacyLocalProjects()).toHaveLength(1)

    const targetScope = "user-migrated"
    expect(listLocalProjects(targetScope)).toEqual([])

    const imported = importLegacyLocalProjectsToScope(targetScope)
    expect(imported.imported).toBe(1)

    const scopedProjects = listLocalProjects(targetScope)
    expect(scopedProjects).toHaveLength(1)
    expect(scopedProjects[0]?.projectId).toMatch(/^[0-9a-f-]{36}$/i)
    expect(scopedProjects[0]?.projectId).not.toBe(legacyProject.metadata.id)
    expect(scopedProjects[0]?.name).toBe("Legacy project")
    expect(loadProjectFromLocalStorage(scopedProjects[0]?.projectId, targetScope)?.metadata.name).toBe("Legacy project")
    expect(loadSnapshotsFromLocalStorage(scopedProjects[0]?.projectId, targetScope)).toHaveLength(1)

    // Imported legacy keys are removed to avoid repeated import prompts on reload.
    expect(kv.getItem(LEGACY_LOCAL_PROJECTS_INDEX_KEY)).toBeNull()
    expect(kv.getItem(`${LEGACY_LOCAL_PROJECT_KEY_PREFIX}${legacyProject.metadata.id}`)).toBeNull()
    expect(kv.getItem(`${LEGACY_LOCAL_SNAPSHOTS_KEY_PREFIX}${legacyProject.metadata.id}`)).toBeNull()
    expect(hasLegacyLocalProjects()).toBe(false)
  })

  it("prunes stale legacy index entries that no longer have a valid project payload", () => {
    const missingProjectId = "legacy-missing"
    const corruptedProjectId = "legacy-corrupted"

    kv.setItem(
      LEGACY_LOCAL_PROJECTS_INDEX_KEY,
      JSON.stringify({
        version: 2,
        activeProjectId: missingProjectId,
        projects: [
          {
            projectId: missingProjectId,
            name: "Missing",
            updatedAtIso: "2026-02-20T10:00:00.000Z"
          },
          {
            projectId: corruptedProjectId,
            name: "Corrupted",
            updatedAtIso: "2026-02-20T10:01:00.000Z"
          }
        ]
      })
    )
    kv.setItem(`${LEGACY_LOCAL_PROJECT_KEY_PREFIX}${corruptedProjectId}`, "{not-json")

    expect(hasLegacyLocalProjects()).toBe(true)
    const imported = importLegacyLocalProjectsToScope("user-prune")
    expect(imported.imported).toBe(0)

    expect(kv.getItem(LEGACY_LOCAL_PROJECTS_INDEX_KEY)).toBeNull()
    expect(kv.getItem(`${LEGACY_LOCAL_PROJECT_KEY_PREFIX}${missingProjectId}`)).toBeNull()
    expect(kv.getItem(`${LEGACY_LOCAL_PROJECT_KEY_PREFIX}${corruptedProjectId}`)).toBeNull()
    expect(hasLegacyLocalProjects()).toBe(false)
  })
})
