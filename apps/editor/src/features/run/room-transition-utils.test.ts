import { describe, expect, it } from "vitest"
import { getRoomTransitionAnimationClass, ROOM_TRANSITION_DURATION_MS } from "./room-transition-utils.js"

describe("room transition utils", () => {
  it("maps transition values to expected css classes", () => {
    expect(getRoomTransitionAnimationClass("none")).toBeNull()
    expect(getRoomTransitionAnimationClass("fade")).toBe("mvp15-room-transition-fade")
    expect(getRoomTransitionAnimationClass("slideLeft")).toBe("mvp15-room-transition-slide-left")
    expect(getRoomTransitionAnimationClass("slideRight")).toBe("mvp15-room-transition-slide-right")
  })

  it("uses fixed transition duration", () => {
    expect(ROOM_TRANSITION_DURATION_MS).toBe(420)
  })
})
