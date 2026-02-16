import { createElement } from "react"
import { renderToStaticMarkup } from "react-dom/server"
import { describe, expect, it, vi } from "vitest"
import { RoomEditorSection } from "./rooms/RoomEditorSection.js"
import type { EditorController } from "./editor-state/use-editor-controller.js"
import { RunSection, type RunSectionController } from "./run/RunSection.js"

function createRoomControllerMock(): EditorController {
  return {
    project: {
      rooms: [
        {
          id: "room-1",
          name: "Test Room",
          instances: []
        }
      ],
      objects: [],
      resources: {
        sprites: []
      }
    },
    activeRoomId: "room-1",
    activeRoom: {
      id: "room-1",
      name: "Test Room",
      instances: []
    },
    addRoom: vi.fn(),
    setActiveRoomId: vi.fn(),
    addInstanceToActiveRoom: vi.fn(),
    moveInstance: vi.fn(),
    removeInstance: vi.fn()
  } as unknown as EditorController
}

function createRunControllerMock(): RunSectionController {
  return {
    project: {
      rooms: [
        {
          id: "room-1",
          name: "Run Room",
          instances: []
        }
      ],
      objects: [],
      resources: {
        sprites: []
      },
      variables: {
        global: []
      }
    },
    runtimeState: {
      score: 0,
      gameOver: false,
      message: "",
      activeToast: null,
      globalVariables: {}
    },
    activeRoom: {
      id: "room-1",
      name: "Run Room",
      instances: []
    },
    isRunning: false,
    run: vi.fn(),
    reset: vi.fn(),
    updateRuntimeMousePosition: vi.fn(),
    setRuntimeMouseButton: vi.fn()
  } as unknown as RunSectionController
}

describe("rooms and run canvas layout", () => {
  it("renders room canvas area without internal p-4 and with grid marker", () => {
    const markup = renderToStaticMarkup(
      createElement(RoomEditorSection, {
        controller: createRoomControllerMock()
      })
    )

    expect(markup).not.toContain("flex-1 overflow-auto p-4")
    expect(markup).toContain("mvp18-room-grid-canvas")
  })

  it("renders run canvas area without internal p-4", () => {
    const markup = renderToStaticMarkup(
      createElement(RunSection, {
        controller: createRunControllerMock()
      })
    )

    expect(markup).not.toContain("flex-1 overflow-auto p-4")
  })
})
