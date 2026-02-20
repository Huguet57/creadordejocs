import { useEffect, useRef, useState, type Dispatch, type SetStateAction } from "react"

const STORAGE_PREFIX = "creadordejocs:folder-expansion:"

/**
 * Manages folder expansion state with localStorage persistence.
 * Auto-expands newly created folders while preserving user's manual collapse choices.
 */
export function useFolderExpansion(
  storageKey: string,
  currentFolderIds: ReadonlyMap<string, unknown>
): [Set<string>, Dispatch<SetStateAction<Set<string>>>] {
  const knownIdsRef = useRef<Set<string> | null>(null)

  const [expandedIds, setExpandedIds] = useState<Set<string>>(() => {
    const key = STORAGE_PREFIX + storageKey
    try {
      const raw = localStorage.getItem(key)
      if (raw) {
        const parsed: unknown = JSON.parse(raw)
        if (Array.isArray(parsed)) {
          const restored = new Set<string>()
          for (const item of parsed) {
            if (typeof item === "string" && currentFolderIds.has(item)) {
              restored.add(item)
            }
          }
          knownIdsRef.current = new Set(currentFolderIds.keys())
          return restored
        }
      }
    } catch {
      // Ignore parse errors
    }
    // No stored state — expand all current folders
    knownIdsRef.current = new Set(currentFolderIds.keys())
    return new Set(currentFolderIds.keys())
  })

  // Auto-expand new folders and clean up deleted ones
  useEffect(() => {
    const known = knownIdsRef.current ?? new Set<string>()

    setExpandedIds((prev) => {
      const next = new Set(prev)
      let changed = false

      for (const [id] of currentFolderIds) {
        if (!known.has(id)) {
          next.add(id)
          changed = true
        }
      }

      for (const id of next) {
        if (!currentFolderIds.has(id)) {
          next.delete(id)
          changed = true
        }
      }

      return changed ? next : prev
    })

    for (const [id] of currentFolderIds) {
      known.add(id)
    }
  }, [currentFolderIds])

  // Persist to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_PREFIX + storageKey, JSON.stringify([...expandedIds]))
    } catch {
      // Ignore quota errors
    }
  }, [expandedIds, storageKey])

  return [expandedIds, setExpandedIds]
}
