import { createElement } from "react"
import { renderToStaticMarkup } from "react-dom/server"
import { describe, expect, it, vi } from "vitest"
import type { ProjectV1 } from "@creadordejocs/project-format"
import type { RuntimeState } from "../editor-state/runtime.js"
import { RunSection, type RunSectionController } from "./RunSection.js"

function createProject(): ProjectV1 {
  return {
    version: 1,
    metadata: {
      id: "project-run-section-text",
      name: "RunSection text",
      locale: "ca",
      createdAtIso: new Date().toISOString()
    },
    resources: { sprites: [], sounds: [] },
    variables: { global: [], objectByObjectId: {} },
    objects: [
      {
        id: "object-text",
        name: "Text object",
        spriteId: null,
        x: 0,
        y: 0,
        speed: 0,
        direction: 0,
        width: 64,
        height: 32,
        visible: true,
        solid: false,
        events: []
      }
    ],
    rooms: [
      {
        id: "room-1",
        name: "Room 1",
        instances: [{ id: "instance-text", objectId: "object-text", x: 32, y: 48 }]
      }
    ],
    scenes: [],
    metrics: {
      appStart: 0,
      projectLoad: 0,
      runtimeErrors: 0,
      tutorialCompletion: 0,
      stuckRate: 0,
      timeToFirstPlayableFunMs: null
    }
  }
}

function createRuntimeState(justification: "left" | "center" | "right"): RuntimeState {
  return {
    score: 0,
    gameOver: false,
    message: "",
    activeToast: null,
    queuedToasts: [],
    initializedInstanceIds: [],
    playedSoundIds: [],
    instanceStartPositions: {},
    globalVariables: {},
    mouse: { x: 0, y: 0 },
    objectInstanceVariables: {},
    nextRoomId: null,
    restartRoomRequested: false,
    timerElapsedByEventId: {},
    waitElapsedByInstanceActionId: {},
    eventLocksByKey: {},
    customEventQueue: [],
    spriteOverrideByInstanceId: {},
    spriteSpeedMsByInstanceId: {},
    spriteAnimationElapsedMsByInstanceId: {},
    windowByRoomId: { "room-1": { x: 0, y: 0 } },
    objectTextByInstanceId: {
      "instance-text": {
        text: "Línia 1\nLínia 2",
        justification,
        remainingMs: null
      }
    }
  }
}

function createController(justification: "left" | "center" | "right"): RunSectionController {
  const project = createProject()
  return {
    project,
    runtimeState: createRuntimeState(justification),
    activeRoom: project.rooms[0] ?? null,
    isRunning: true,
    run: vi.fn(),
    reset: vi.fn(),
    updateRuntimeMousePosition: vi.fn(),
    setRuntimeMouseButton: vi.fn()
  }
}

describe("RunSection object text overlay", () => {
  it("renders object text overlay inside instance bounds with wrapping classes", () => {
    const markup = renderToStaticMarkup(createElement(RunSection, { controller: createController("center") }))

    expect(markup).toContain("mvp24-run-instance-text")
    expect(markup).toContain("Línia 1")
    expect(markup).toContain("whitespace-pre-wrap")
    expect(markup).toContain("[overflow-wrap:anywhere]")
    expect(markup).toContain("text-align:center")
  })

  it("applies left and right text justification styles", () => {
    const leftMarkup = renderToStaticMarkup(createElement(RunSection, { controller: createController("left") }))
    const rightMarkup = renderToStaticMarkup(createElement(RunSection, { controller: createController("right") }))

    expect(leftMarkup).toContain("text-align:left")
    expect(rightMarkup).toContain("text-align:right")
  })
})
