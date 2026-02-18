import { describe, expect, it } from "vitest"
import {
  captureRuntimeKeyDown,
  captureRuntimeKeyUp,
  clearRuntimeKeyEdges,
  releaseAllRuntimeKeys,
  resetRuntimeKeyBuffer
} from "./runtime-input-buffer.js"

describe("runtime input buffer", () => {
  it("captures key edges for down and up transitions", () => {
    const pressedKeys = new Set<string>()
    const justPressedKeys = new Set<string>()
    const justReleasedKeys = new Set<string>()

    captureRuntimeKeyDown(pressedKeys, justPressedKeys, "ArrowDown")
    expect(pressedKeys.has("ArrowDown")).toBe(true)
    expect(justPressedKeys.has("ArrowDown")).toBe(true)

    captureRuntimeKeyDown(pressedKeys, justPressedKeys, "ArrowDown")
    expect(justPressedKeys.size).toBe(1)

    captureRuntimeKeyUp(pressedKeys, justReleasedKeys, "ArrowDown")
    expect(pressedKeys.has("ArrowDown")).toBe(false)
    expect(justReleasedKeys.has("ArrowDown")).toBe(true)
  })

  it("releases all pressed keys and only flushes once", () => {
    const pressedKeys = new Set<string>(["ArrowUp", "ArrowLeft"])
    const justReleasedKeys = new Set<string>()

    releaseAllRuntimeKeys(pressedKeys, justReleasedKeys)
    expect(pressedKeys.size).toBe(0)
    expect(justReleasedKeys).toEqual(new Set(["ArrowUp", "ArrowLeft"]))

    releaseAllRuntimeKeys(pressedKeys, justReleasedKeys)
    expect(justReleasedKeys).toEqual(new Set(["ArrowUp", "ArrowLeft"]))
  })

  it("clears edge sets and supports hard reset for run start", () => {
    const pressedKeys = new Set<string>(["Space"])
    const justPressedKeys = new Set<string>(["Space"])
    const justReleasedKeys = new Set<string>(["ArrowDown"])

    clearRuntimeKeyEdges(justPressedKeys, justReleasedKeys)
    expect(justPressedKeys.size).toBe(0)
    expect(justReleasedKeys.size).toBe(0)
    expect(pressedKeys.has("Space")).toBe(true)

    resetRuntimeKeyBuffer(pressedKeys, justPressedKeys, justReleasedKeys)
    expect(pressedKeys.size).toBe(0)
    expect(justPressedKeys.size).toBe(0)
    expect(justReleasedKeys.size).toBe(0)
  })
})
