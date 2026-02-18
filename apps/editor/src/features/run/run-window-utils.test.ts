import { describe, expect, it } from "vitest"
import { mapPointerToWorldCoordinates, isInstanceVisibleInWindow, toScreenCoordinates } from "./run-window-utils.js"

describe("run window utils", () => {
  it("maps pointer coordinates to world coordinates using window offset and room clamp", () => {
    const mapped = mapPointerToWorldCoordinates({
      clientX: 120,
      clientY: 90,
      rectLeft: 20,
      rectTop: 10,
      windowX: 500,
      windowY: 300,
      roomWidth: 2000,
      roomHeight: 1200
    })

    expect(mapped).toEqual({ x: 600, y: 380 })
  })

  it("clamps mapped pointer coordinates to room edges", () => {
    const mapped = mapPointerToWorldCoordinates({
      clientX: 2000,
      clientY: 2000,
      rectLeft: 0,
      rectTop: 0,
      windowX: 1400,
      windowY: 900,
      roomWidth: 1600,
      roomHeight: 1000
    })

    expect(mapped).toEqual({ x: 1600, y: 1000 })
  })

  it("culls instances outside the current window", () => {
    expect(
      isInstanceVisibleInWindow({
        instanceX: 1000,
        instanceY: 200,
        instanceWidth: 32,
        instanceHeight: 32,
        windowX: 0,
        windowY: 0
      })
    ).toBe(false)

    expect(
      isInstanceVisibleInWindow({
        instanceX: 810,
        instanceY: 470,
        instanceWidth: 32,
        instanceHeight: 32,
        windowX: 0,
        windowY: 0
      })
    ).toBe(true)
  })

  it("converts world coordinates to screen coordinates", () => {
    expect(toScreenCoordinates(900, 700, 400, 250)).toEqual({ x: 500, y: 450 })
  })
})
