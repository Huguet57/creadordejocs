import { generateUUID, loadProjectV1, serializeProjectV1 } from "@creadordejocs/project-format"

export type SyncCatalogEntry = {
  projectId: string
  name: string
  projectSource: string
  updatedAtIso: string
}

export type MergeProjectCatalogResult = {
  merged: SyncCatalogEntry[]
  toUpload: SyncCatalogEntry[]
  conflictCopies: SyncCatalogEntry[]
}

function compareIsoDate(left: string, right: string): number {
  const leftMs = Date.parse(left)
  const rightMs = Date.parse(right)

  if (Number.isFinite(leftMs) && Number.isFinite(rightMs)) {
    return leftMs - rightMs
  }

  // Fallback for unexpected non-ISO values.
  return left.localeCompare(right)
}

export function mergeProjectCatalog(local: SyncCatalogEntry[], remote: SyncCatalogEntry[]): MergeProjectCatalogResult {
  const localById = new Map(local.map((entry) => [entry.projectId, entry] as const))
  const remoteById = new Map(remote.map((entry) => [entry.projectId, entry] as const))
  const allProjectIds = new Set([...localById.keys(), ...remoteById.keys()])

  const merged: SyncCatalogEntry[] = []
  const toUpload: SyncCatalogEntry[] = []
  const conflictCopies: SyncCatalogEntry[] = []

  for (const projectId of allProjectIds) {
    const localEntry = localById.get(projectId)
    const remoteEntry = remoteById.get(projectId)

    if (localEntry && remoteEntry) {
      const dateDiff = compareIsoDate(localEntry.updatedAtIso, remoteEntry.updatedAtIso)
      if (dateDiff > 0) {
        merged.push(localEntry)
        toUpload.push(localEntry)
      } else if (dateDiff < 0) {
        merged.push(remoteEntry)
      } else {
        if (localEntry.projectSource !== remoteEntry.projectSource) {
          merged.push(remoteEntry)
          conflictCopies.push(createConflictCopy(localEntry))
        } else {
          merged.push(remoteEntry)
        }
      }
      continue
    }

    if (localEntry) {
      merged.push(localEntry)
      toUpload.push(localEntry)
      continue
    }

    if (remoteEntry) {
      merged.push(remoteEntry)
    }
  }

  const byDateDesc = (left: SyncCatalogEntry, right: SyncCatalogEntry): number =>
    compareIsoDate(right.updatedAtIso, left.updatedAtIso)

  merged.sort(byDateDesc)
  toUpload.sort(byDateDesc)
  conflictCopies.sort(byDateDesc)

  return {
    merged,
    toUpload,
    conflictCopies
  }
}

function createConflictCopy(localEntry: SyncCatalogEntry): SyncCatalogEntry {
  const conflictProjectId = generateUUID()
  const createdAtIso = new Date().toISOString()
  const conflictName = `${localEntry.name} (conflict ${formatConflictTimestamp(createdAtIso)})`

  try {
    const parsed = loadProjectV1(localEntry.projectSource)
    const withConflictMetadata = {
      ...parsed,
      metadata: {
        ...parsed.metadata,
        id: conflictProjectId,
        name: conflictName
      }
    }
    return {
      projectId: conflictProjectId,
      name: conflictName,
      projectSource: serializeProjectV1(withConflictMetadata),
      updatedAtIso: createdAtIso
    }
  } catch {
    return {
      projectId: conflictProjectId,
      name: conflictName,
      projectSource: localEntry.projectSource,
      updatedAtIso: createdAtIso
    }
  }
}

function formatConflictTimestamp(isoDate: string): string {
  const date = new Date(isoDate)
  const year = String(date.getFullYear())
  const month = String(date.getMonth() + 1).padStart(2, "0")
  const day = String(date.getDate()).padStart(2, "0")
  const hours = String(date.getHours()).padStart(2, "0")
  const minutes = String(date.getMinutes()).padStart(2, "0")
  return `${year}-${month}-${day} ${hours}:${minutes}`
}
