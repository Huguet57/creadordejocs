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
  listLocalProjects,
  listLegacyLocalProjects,
  loadProjectFromLocalStorage,
  loadSnapshotProject,
  loadSnapshotsFromLocalStorage,
  renameLocalProject,
  saveCheckpointSnapshot,
  saveProjectLocally,
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

    expect(hasLegacyLocalProjects()).toBe(true)
    expect(listLegacyLocalProjects()).toHaveLength(1)

    const targetScope = "user-migrated"
    expect(listLocalProjects(targetScope)).toEqual([])

    const imported = importLegacyLocalProjectsToScope(targetScope)
    expect(imported.imported).toBe(1)

    const scopedProjects = listLocalProjects(targetScope)
    expect(scopedProjects).toHaveLength(1)
    expect(scopedProjects[0]?.projectId).toBe(legacyProject.metadata.id)
    expect(scopedProjects[0]?.name).toBe("Legacy project")
    expect(loadProjectFromLocalStorage(legacyProject.metadata.id, targetScope)?.metadata.name).toBe("Legacy project")
  })
})
