import { describe, expect, it } from "vitest"
import {
  applyBrushStrokeToStamps,
  eraseTopmostStampAtPoint,
  snapBackgroundPaintPosition,
  type RoomBackgroundPaintStamp
} from "./room-background-paint-utils.js"

describe("room background paint utils", () => {
  it("snaps brush coordinates by sprite size and clamps inside room bounds", () => {
    expect(
      snapBackgroundPaintPosition({
        pointerX: 95,
        pointerY: 79,
        spriteWidth: 32,
        spriteHeight: 32,
        roomWidth: 128,
        roomHeight: 96
      })
    ).toEqual({ x: 64, y: 64 })

    expect(
      snapBackgroundPaintPosition({
        pointerX: 500,
        pointerY: 500,
        spriteWidth: 32,
        spriteHeight: 32,
        roomWidth: 128,
        roomHeight: 96
      })
    ).toEqual({ x: 96, y: 64 })
  })

  it("interpolates drag strokes without gaps in sprite-grid steps", () => {
    const painted = applyBrushStrokeToStamps({
      stamps: [],
      spriteId: "sprite-a",
      from: { x: 0, y: 0 },
      to: { x: 96, y: 64 },
      spriteWidth: 32,
      spriteHeight: 32
    })

    expect(painted).toEqual([
      { spriteId: "sprite-a", x: 0, y: 0 },
      { spriteId: "sprite-a", x: 32, y: 32 },
      { spriteId: "sprite-a", x: 64, y: 32 },
      { spriteId: "sprite-a", x: 96, y: 64 }
    ])
  })

  it("erases the topmost stamp under pointer coordinates", () => {
    const stamps: RoomBackgroundPaintStamp[] = [
      { spriteId: "sprite-a", x: 0, y: 0 },
      { spriteId: "sprite-b", x: 0, y: 0 },
      { spriteId: "sprite-c", x: 32, y: 0 }
    ]

    const erased = eraseTopmostStampAtPoint({
      stamps,
      pointX: 12,
      pointY: 4,
      resolveSpriteDimensions: () => ({ width: 32, height: 32 })
    })

    expect(erased).toEqual([
      { spriteId: "sprite-a", x: 0, y: 0 },
      { spriteId: "sprite-c", x: 32, y: 0 }
    ])
  })
})
