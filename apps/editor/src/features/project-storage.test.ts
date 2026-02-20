import { createEmptyProjectV1 } from "@creadordejocs/project-format"
import { afterEach, beforeEach, describe, expect, it } from "vitest"
import { InMemoryKvProvider } from "./storage/in-memory-kv-provider.js"
import { resetKvStorageProvider, setKvStorageProvider } from "./storage/get-kv-storage-provider.js"
import {
  LOCAL_PROJECT_KEY,
  LOCAL_SNAPSHOTS_KEY,
  loadProjectFromLocalStorage,
  loadSnapshotProject,
  loadSnapshotsFromLocalStorage,
  saveCheckpointSnapshot,
  saveProjectLocally
} from "./project-storage.js"

describe("project-storage", () => {
  let kv: InMemoryKvProvider

  beforeEach(() => {
    kv = new InMemoryKvProvider()
    setKvStorageProvider(kv)
  })

  afterEach(() => {
    resetKvStorageProvider()
  })

  describe("saveProjectLocally / loadProjectFromLocalStorage", () => {
    it("round-trips a project through save and load", () => {
      const project = createEmptyProjectV1("Test Game")
      saveProjectLocally(project)

      const loaded = loadProjectFromLocalStorage()
      expect(loaded).not.toBeNull()
      expect(loaded!.metadata.name).toBe("Test Game")
    })

    it("returns null when no project is stored", () => {
      expect(loadProjectFromLocalStorage()).toBeNull()
    })

    it("returns null when stored data is corrupted", () => {
      kv.setItem(LOCAL_PROJECT_KEY, "not valid json {{{")
      expect(loadProjectFromLocalStorage()).toBeNull()
    })

    it("stores under the expected key", () => {
      saveProjectLocally(createEmptyProjectV1("Key Test"))
      expect(kv.getItem(LOCAL_PROJECT_KEY)).not.toBeNull()
    })
  })

  describe("snapshots", () => {
    it("saves and loads a checkpoint snapshot", () => {
      const project = createEmptyProjectV1("Snapshot Game")
      const snapshots = saveCheckpointSnapshot(project, "before refactor")

      expect(snapshots).toHaveLength(1)
      expect(snapshots[0]!.label).toBe("before refactor")
    })

    it("limits snapshots to 8", () => {
      const project = createEmptyProjectV1("Many Snapshots")
      for (let i = 0; i < 10; i++) {
        saveCheckpointSnapshot(project, `snapshot ${i}`)
      }

      const loaded = loadSnapshotsFromLocalStorage()
      expect(loaded).toHaveLength(8)
      expect(loaded[0]!.label).toBe("snapshot 9")
    })

    it("returns empty array when no snapshots exist", () => {
      expect(loadSnapshotsFromLocalStorage()).toEqual([])
    })

    it("returns empty array when stored snapshots are corrupted", () => {
      kv.setItem(LOCAL_SNAPSHOTS_KEY, "not json")
      expect(loadSnapshotsFromLocalStorage()).toEqual([])
    })

    it("loads a specific snapshot project by id", () => {
      const project = createEmptyProjectV1("Loadable")
      const snapshots = saveCheckpointSnapshot(project, "checkpoint")
      const snapshotId = snapshots[0]!.id

      const loaded = loadSnapshotProject(snapshotId)
      expect(loaded).not.toBeNull()
      expect(loaded!.metadata.name).toBe("Loadable")
    })

    it("returns null for a non-existent snapshot id", () => {
      expect(loadSnapshotProject("does-not-exist")).toBeNull()
    })
  })
})
