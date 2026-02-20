import { generateUUID, loadProjectV1, serializeProjectV1, type ProjectV1 } from "@creadordejocs/project-format"
import { getKvStorageProvider } from "./storage/get-kv-storage-provider.js"

export const LOCAL_PROJECT_KEY = "creadordejocs.editor.project.v1"
export const LOCAL_SNAPSHOTS_KEY = "creadordejocs.editor.snapshots.v1"
const MAX_SNAPSHOTS = 8

export type SaveStatus = "idle" | "saved" | "saving" | "error"

export type LocalSnapshot = {
  id: string
  label: string
  savedAtIso: string
  projectSource: string
}

export function saveProjectLocally(project: ProjectV1): void {
  const serialized = serializeProjectV1(project)
  getKvStorageProvider().setItem(LOCAL_PROJECT_KEY, serialized)
}

export function loadProjectFromLocalStorage(): ProjectV1 | null {
  const source = getKvStorageProvider().getItem(LOCAL_PROJECT_KEY)
  if (!source) {
    return null
  }

  try {
    return loadProjectV1(source)
  } catch {
    return null
  }
}

export function loadSnapshotsFromLocalStorage(): LocalSnapshot[] {
  const source = getKvStorageProvider().getItem(LOCAL_SNAPSHOTS_KEY)
  if (!source) {
    return []
  }

  try {
    const parsed = JSON.parse(source) as unknown
    if (!Array.isArray(parsed)) {
      return []
    }

    return parsed.filter((value): value is LocalSnapshot => {
      if (typeof value !== "object" || value === null) {
        return false
      }
      const candidate = value as Partial<LocalSnapshot>
      return (
        typeof candidate.id === "string" &&
        typeof candidate.label === "string" &&
        typeof candidate.savedAtIso === "string" &&
        typeof candidate.projectSource === "string"
      )
    })
  } catch {
    return []
  }
}

export function saveCheckpointSnapshot(project: ProjectV1, label: string): LocalSnapshot[] {
  const snapshots = loadSnapshotsFromLocalStorage()
  const next: LocalSnapshot = {
    id: generateUUID(),
    label,
    savedAtIso: new Date().toISOString(),
    projectSource: serializeProjectV1(project)
  }
  const merged = [next, ...snapshots].slice(0, MAX_SNAPSHOTS)
  getKvStorageProvider().setItem(LOCAL_SNAPSHOTS_KEY, JSON.stringify(merged))
  return merged
}

export function loadSnapshotProject(snapshotId: string): ProjectV1 | null {
  const snapshot = loadSnapshotsFromLocalStorage().find((entry) => entry.id === snapshotId)
  if (!snapshot) {
    return null
  }

  try {
    return loadProjectV1(snapshot.projectSource)
  } catch {
    return null
  }
}
