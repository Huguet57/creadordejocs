import type { ProjectV1 } from "@creadordejocs/project-format"

export type RoomTabState = {
  id: string
  pinned: boolean
}

export function pruneRoomTabs(tabs: RoomTabState[], roomIds: Set<string>): RoomTabState[] {
  return tabs.filter((tabEntry) => roomIds.has(tabEntry.id))
}

export function selectRoomPreviewTab(tabs: RoomTabState[], roomId: string): RoomTabState[] {
  const existing = tabs.find((tabEntry) => tabEntry.id === roomId)
  const pinnedTabs = tabs.filter((tabEntry) => tabEntry.pinned)
  if (existing?.pinned) {
    return [...pinnedTabs]
  }
  return [...pinnedTabs, { id: roomId, pinned: false }]
}

export function pinRoomTab(tabs: RoomTabState[], roomId: string): RoomTabState[] {
  const tabIndex = tabs.findIndex((tabEntry) => tabEntry.id === roomId)
  if (tabIndex === -1) {
    return [...tabs, { id: roomId, pinned: true }]
  }
  return tabs.map((tabEntry, index) => (index === tabIndex ? { ...tabEntry, pinned: true } : tabEntry))
}

export function ensureActiveRoomTabVisible(tabs: RoomTabState[], activeRoomId: string): RoomTabState[] {
  if (!activeRoomId) {
    return tabs
  }
  if (tabs.some((tabEntry) => tabEntry.id === activeRoomId)) {
    return tabs
  }
  return [...tabs.filter((tabEntry) => tabEntry.pinned), { id: activeRoomId, pinned: false }]
}

export function closeRoomTab(
  tabs: RoomTabState[],
  tabId: string,
  activeRoomId: string
): { tabs: RoomTabState[]; nextActiveRoomId: string } {
  const currentIndex = tabs.findIndex((tabEntry) => tabEntry.id === tabId)
  const remainingTabs = tabs.filter((tabEntry) => tabEntry.id !== tabId)

  if (activeRoomId !== tabId) {
    return { tabs: remainingTabs, nextActiveRoomId: activeRoomId }
  }

  const nextActiveRoomId =
    remainingTabs.length > 0 ? (remainingTabs[Math.min(currentIndex, remainingTabs.length - 1)]?.id ?? "") : ""
  return { tabs: remainingTabs, nextActiveRoomId }
}

export function buildRoomStateSignatures(rooms: ProjectV1["rooms"]): Record<string, string> {
  const signatures: Record<string, string> = {}
  for (const roomEntry of rooms) {
    signatures[roomEntry.id] = JSON.stringify(roomEntry)
  }
  return signatures
}

export function promoteActivePreviewTabIfRoomChanged(
  tabs: RoomTabState[],
  activeRoomId: string,
  previousSignaturesByRoomId: Record<string, string>,
  currentSignaturesByRoomId: Record<string, string>
): RoomTabState[] {
  if (!activeRoomId) {
    return tabs
  }

  const previousSignature = previousSignaturesByRoomId[activeRoomId]
  const currentSignature = currentSignaturesByRoomId[activeRoomId]
  if (!previousSignature || !currentSignature || previousSignature === currentSignature) {
    return tabs
  }

  return tabs.map((tabEntry) => (tabEntry.id === activeRoomId && !tabEntry.pinned ? { ...tabEntry, pinned: true } : tabEntry))
}
