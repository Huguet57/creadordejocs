import { describe, expect, it, vi } from "vitest"
import { createFixedTimestepLoop } from "../src/index.js"

describe("createFixedTimestepLoop", () => {
  it("executes update and draw in order", () => {
    const calls: string[] = []
    const updateSpy = vi.fn(() => calls.push("update"))
    const drawSpy = vi.fn(() => calls.push("draw"))

    const loop = createFixedTimestepLoop({
      update: updateSpy,
      draw: drawSpy
    })

    loop.step(16.67)

    expect(updateSpy).toHaveBeenCalledWith(16.67)
    expect(drawSpy).toHaveBeenCalledTimes(1)
    expect(calls).toEqual(["update", "draw"])
  })
})
