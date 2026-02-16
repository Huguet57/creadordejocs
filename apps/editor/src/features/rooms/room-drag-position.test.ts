import { describe, expect, it } from "vitest"
import { calculateRoomDragPosition, snapToGrid } from "./RoomEditorSection.js"

describe("room drag snapping", () => {
  it("snaps coordinate values to the closest grid step", () => {
    expect(snapToGrid(10, 4)).toBe(12)
    expect(snapToGrid(9, 4)).toBe(8)
    expect(snapToGrid(16, 4)).toBe(16)
  })

  it("calculates drag position with clamping and 4px snap", () => {
    const position = calculateRoomDragPosition({
      clientX: 133,
      clientY: 95,
      rectLeft: 10,
      rectTop: 20,
      roomWidth: 840,
      roomHeight: 480,
      instanceWidth: 32,
      instanceHeight: 32,
      snapSize: 4
    })

    expect(position).toEqual({ x: 108, y: 60 })
  })

  it("does not exceed room bounds after snapping", () => {
    const position = calculateRoomDragPosition({
      clientX: 5000,
      clientY: 5000,
      rectLeft: 0,
      rectTop: 0,
      roomWidth: 840,
      roomHeight: 480,
      instanceWidth: 32,
      instanceHeight: 32,
      snapSize: 4
    })

    expect(position).toEqual({ x: 808, y: 448 })
  })
})
