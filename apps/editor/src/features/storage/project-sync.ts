import { generateUUID, parseProjectV1, serializeProjectV1 } from "@creadordejocs/project-format"

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

function sortJsonValue(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map((entry) => sortJsonValue(entry))
  }

  if (value && typeof value === "object") {
    const sortedEntries = Object.entries(value as Record<string, unknown>).sort(([left], [right]) => left.localeCompare(right))
    const normalizedObject: Record<string, unknown> = {}
    for (const [key, entryValue] of sortedEntries) {
      normalizedObject[key] = sortJsonValue(entryValue)
    }
    return normalizedObject
  }

  return value
}

function canonicalizeJsonSource(source: string): string | null {
  try {
    const parsed = JSON.parse(source) as unknown
    return JSON.stringify(sortJsonValue(parsed))
  } catch {
    return null
  }
}

function canonicalizeProjectSource(source: string): string | null {
  try {
    const parsed = parseProjectV1(source)
    const withoutVolatileMetrics = {
      ...parsed,
      metrics: {
        ...parsed.metrics,
        projectLoad: 0
      }
    }
    return JSON.stringify(sortJsonValue(withoutVolatileMetrics))
  } catch {
    return canonicalizeJsonSource(source)
  }
}

function projectSourcesMatch(localSource: string, remoteSource: string): boolean {
  if (localSource === remoteSource) {
    return true
  }

  const localCanonical = canonicalizeProjectSource(localSource)
  const remoteCanonical = canonicalizeProjectSource(remoteSource)
  if (localCanonical === null || remoteCanonical === null) {
    return false
  }
  return localCanonical === remoteCanonical
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
        if (!projectSourcesMatch(localEntry.projectSource, remoteEntry.projectSource)) {
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
    const parsed = parseProjectV1(localEntry.projectSource)
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
