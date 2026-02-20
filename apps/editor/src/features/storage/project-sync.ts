export type SyncCatalogEntry = {
  projectId: string
  name: string
  projectSource: string
  updatedAtIso: string
}

export type MergeProjectCatalogResult = {
  merged: SyncCatalogEntry[]
  toUpload: SyncCatalogEntry[]
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
        merged.push(localEntry)
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

  return {
    merged,
    toUpload
  }
}
