import { describe, expect, it } from "vitest"
import {
  buildRoomStateSignatures,
  closeRoomTab,
  pinRoomTab,
  promoteActivePreviewTabIfRoomChanged,
  selectRoomPreviewTab,
  type RoomTabState
} from "./room-tab-state.js"

describe("room tab state", () => {
  it("opens selected room as preview tab (not pinned)", () => {
    const tabs = selectRoomPreviewTab([], "room-a")

    expect(tabs).toEqual([{ id: "room-a", pinned: false }])
  })

  it("replaces previous preview when opening another room and keeps pinned tabs", () => {
    const startTabs: RoomTabState[] = [
      { id: "room-pinned", pinned: true },
      { id: "room-preview", pinned: false }
    ]

    const nextTabs = selectRoomPreviewTab(startTabs, "room-b")

    expect(nextTabs).toEqual([
      { id: "room-pinned", pinned: true },
      { id: "room-b", pinned: false }
    ])
  })

  it("pins a tab on manual pin action and keeps it opened", () => {
    const startTabs: RoomTabState[] = [{ id: "room-preview", pinned: false }]

    const nextTabs = pinRoomTab(startTabs, "room-preview")

    expect(nextTabs).toEqual([{ id: "room-preview", pinned: true }])
  })

  it("promotes active preview tab to pinned when active room changes", () => {
    const startTabs: RoomTabState[] = [{ id: "room-a", pinned: false }]
    const previousSignatures = buildRoomStateSignatures([
      { id: "room-a", name: "Room A", instances: [], width: 320, height: 240, backgroundSpriteId: null, backgroundPaintStamps: [] }
    ])
    const currentSignatures = buildRoomStateSignatures([
      {
        id: "room-a",
        name: "Room A",
        instances: [{ id: "inst-1", objectId: "obj-1", x: 0, y: 0 }],
        width: 320,
        height: 240,
        backgroundSpriteId: null,
        backgroundPaintStamps: []
      }
    ])

    const nextTabs = promoteActivePreviewTabIfRoomChanged(startTabs, "room-a", previousSignatures, currentSignatures)

    expect(nextTabs).toEqual([{ id: "room-a", pinned: true }])
  })

  it("returns empty active room id when closing the last active tab", () => {
    const result = closeRoomTab([{ id: "room-a", pinned: false }], "room-a", "room-a")

    expect(result).toEqual({
      tabs: [],
      nextActiveRoomId: ""
    })
  })
})
