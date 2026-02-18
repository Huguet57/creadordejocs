import { describe, expect, it } from "vitest"
import type { ProjectV1 } from "@creadordejocs/project-format"
import { orderMatchingEventsForExecution, shouldRunKeyboardEvent } from "./runtime-keyboard-trigger.js"

type ObjectEventEntry = ProjectV1["objects"][number]["events"][number]

function createKeyboardEvent(
  id: string,
  keyboardMode: "down" | "press" | "release",
  key: "ArrowUp" | "ArrowDown" | "ArrowLeft" | "ArrowRight" | "Space" | "<any>"
): ObjectEventEntry {
  return {
    id,
    type: "Keyboard",
    key,
    keyboardMode,
    targetObjectId: null,
    intervalMs: null,
    items: []
  }
}

function createStepEvent(id: string): ObjectEventEntry {
  return {
    id,
    type: "Step",
    key: null,
    keyboardMode: null,
    targetObjectId: null,
    intervalMs: null,
    items: []
  }
}

describe("runtime keyboard trigger", () => {
  it("puts release after down when both match in the same tick", () => {
    const downAnyEvent = createKeyboardEvent("event-down-any", "down", "<any>")
    const releaseArrowDownEvent = createKeyboardEvent("event-release-arrow-down", "release", "ArrowDown")
    const pressedKeys = new Set<string>(["ArrowUp"])
    const justPressedKeys = new Set<string>()
    const justReleasedKeys = new Set<string>(["ArrowDown"])

    expect(shouldRunKeyboardEvent(downAnyEvent, pressedKeys, justPressedKeys, justReleasedKeys)).toBe(true)
    expect(shouldRunKeyboardEvent(releaseArrowDownEvent, pressedKeys, justPressedKeys, justReleasedKeys)).toBe(true)

    const ordered = orderMatchingEventsForExecution([releaseArrowDownEvent, downAnyEvent])
    expect(ordered.map((eventEntry) => eventEntry.id)).toEqual(["event-down-any", "event-release-arrow-down"])
  })

  it("orders matching keyboard events as press, down, release", () => {
    const ordered = orderMatchingEventsForExecution([
      createStepEvent("event-step"),
      createKeyboardEvent("event-release", "release", "ArrowDown"),
      createKeyboardEvent("event-down", "down", "<any>"),
      createKeyboardEvent("event-press", "press", "ArrowUp")
    ])

    expect(ordered.map((eventEntry) => eventEntry.id)).toEqual([
      "event-step",
      "event-press",
      "event-down",
      "event-release"
    ])
  })

  it("matches quick tap edges where press and release happen in the same tick", () => {
    const pressedKeys = new Set<string>()
    const justPressedKeys = new Set<string>(["ArrowDown"])
    const justReleasedKeys = new Set<string>(["ArrowDown"])

    const pressEvent = createKeyboardEvent("event-press", "press", "ArrowDown")
    const downEvent = createKeyboardEvent("event-down", "down", "ArrowDown")
    const releaseEvent = createKeyboardEvent("event-release", "release", "ArrowDown")

    expect(shouldRunKeyboardEvent(pressEvent, pressedKeys, justPressedKeys, justReleasedKeys)).toBe(true)
    expect(shouldRunKeyboardEvent(downEvent, pressedKeys, justPressedKeys, justReleasedKeys)).toBe(false)
    expect(shouldRunKeyboardEvent(releaseEvent, pressedKeys, justPressedKeys, justReleasedKeys)).toBe(true)
  })

  it("keeps <any>/release explicit and only fires when all keys are up", () => {
    const releaseAnyEvent = createKeyboardEvent("event-release-any", "release", "<any>")

    expect(
      shouldRunKeyboardEvent(releaseAnyEvent, new Set(["ArrowUp"]), new Set(), new Set(["ArrowDown"]))
    ).toBe(false)

    expect(
      shouldRunKeyboardEvent(releaseAnyEvent, new Set(), new Set(), new Set(["ArrowDown"]))
    ).toBe(true)
  })
})
