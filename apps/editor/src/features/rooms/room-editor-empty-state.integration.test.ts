import { createElement } from "react"
import { renderToStaticMarkup } from "react-dom/server"
import { describe, expect, it, vi } from "vitest"
import { RoomEditorSection } from "./RoomEditorSection.js"
import type { EditorController } from "../editor-state/use-editor-controller.js"

function createControllerStub(activeRoomId: string, activeRoom: { id: string; name: string; instances: unknown[] } | null): EditorController {
  const noop = vi.fn()

  return {
    project: {
      rooms: [
        {
          id: "room-1",
          name: "Room 1",
          instances: []
        }
      ],
      objects: [],
      resources: {
        sprites: []
      }
    },
    activeRoomId,
    activeRoom,
    setActiveRoomId: noop
  } as unknown as EditorController
}

describe("Room editor empty-state integration", () => {
  it("shows empty state when there is no selected room tab", () => {
    const controller = createControllerStub("", { id: "room-1", name: "Room 1", instances: [] })

    const markup = renderToStaticMarkup(createElement(RoomEditorSection, { controller }))

    expect(markup).toContain("Select a room to start editing")
    expect(markup).not.toContain("mvp18-room-grid-canvas")
    expect(markup).not.toContain("Zoom")
    expect(markup).not.toContain("Width")
    expect(markup).not.toContain("Height")
  })

  it("shows room editor when there is an active room tab", () => {
    const controller = createControllerStub("room-1", { id: "room-1", name: "Room 1", instances: [] })

    const markup = renderToStaticMarkup(createElement(RoomEditorSection, { controller }))

    expect(markup).not.toContain("Select a room to start editing")
    expect(markup).toContain("mvp18-room-grid-canvas")
    expect(markup).toContain("Zoom")
    expect(markup).toContain("Width")
    expect(markup).toContain("Height")
  })
})
