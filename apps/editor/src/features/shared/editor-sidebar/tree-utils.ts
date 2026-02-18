type NamedNode = {
  id: string
  name: string
}

type ParentNode = NamedNode & {
  parentId?: string | null | undefined
}

type FolderBoundNode = NamedNode & {
  folderId?: string | null | undefined
}

export function buildFolderChildrenByParent<TFolder extends ParentNode>(folders: TFolder[]): Map<string | null, TFolder[]> {
  const map = new Map<string | null, TFolder[]>()
  for (const folderEntry of folders) {
    const parentId = folderEntry.parentId ?? null
    const current = map.get(parentId) ?? []
    current.push(folderEntry)
    map.set(parentId, current)
  }
  for (const [parentId, children] of map.entries()) {
    map.set(
      parentId,
      [...children].sort((left, right) => left.name.localeCompare(right.name, "ca"))
    )
  }
  return map
}

export function buildEntriesByFolder<TEntry extends FolderBoundNode>(entries: TEntry[]): Map<string | null, TEntry[]> {
  const map = new Map<string | null, TEntry[]>()
  for (const entry of entries) {
    const folderId = entry.folderId ?? null
    const current = map.get(folderId) ?? []
    current.push(entry)
    map.set(folderId, current)
  }
  for (const [folderId, folderEntries] of map.entries()) {
    map.set(
      folderId,
      [...folderEntries].sort((left, right) => left.name.localeCompare(right.name, "ca"))
    )
  }
  return map
}

export function isFolderDescendant(folderId: string, ancestorId: string, folders: ParentNode[]): boolean {
  let current = folderId
  const visited = new Set<string>()
  while (current) {
    if (visited.has(current)) return false
    visited.add(current)
    if (current === ancestorId) return true
    const folder = folders.find((entry) => entry.id === current)
    if (!folder?.parentId) return false
    current = folder.parentId
  }
  return false
}
