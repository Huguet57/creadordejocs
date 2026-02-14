import { describe, expect, it } from "vitest"
import { getRuntimeKeyFromKeyboardEvent } from "./use-editor-controller.js"

describe("getRuntimeKeyFromKeyboardEvent", () => {
  it("uses KeyboardEvent.code for Space instead of KeyboardEvent.key", () => {
    const runtimeKey = getRuntimeKeyFromKeyboardEvent({
      key: " ",
      code: "Space"
    })

    expect(runtimeKey).toBe("Space")
  })

  it("keeps Arrow keys unchanged", () => {
    const runtimeKey = getRuntimeKeyFromKeyboardEvent({
      key: "ArrowLeft",
      code: "ArrowLeft"
    })

    expect(runtimeKey).toBe("ArrowLeft")
  })
})
