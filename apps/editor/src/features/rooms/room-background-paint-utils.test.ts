import { describe, expect, it } from "vitest"
import {
  applyBrushStrokeToStamps,
  eraseStampsAlongStroke,
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

  it("interpolates drag strokes using original sprite size without gaps", () => {
    const painted = applyBrushStrokeToStamps({
      stamps: [],
      spriteId: "sprite-a",
      from: { x: 0, y: 0 },
      to: { x: 144, y: 32 },
      spriteWidth: 48,
      spriteHeight: 16
    })

    expect(painted).toEqual([
      { spriteId: "sprite-a", x: 0, y: 0 },
      { spriteId: "sprite-a", x: 48, y: 16 },
      { spriteId: "sprite-a", x: 96, y: 16 },
      { spriteId: "sprite-a", x: 144, y: 32 }
    ])
  })

  it("skips brush stamps when candidate rect overlaps existing stamps", () => {
    const painted = applyBrushStrokeToStamps({
      stamps: [
        { spriteId: "sprite-a", x: 0, y: 0 },
        { spriteId: "sprite-b", x: 64, y: 0 }
      ],
      spriteId: "sprite-c",
      from: { x: 0, y: 0 },
      to: { x: 96, y: 0 },
      spriteWidth: 32,
      spriteHeight: 32,
      resolveSpriteDimensions: (spriteId) => {
        if (spriteId === "sprite-a") {
          return { width: 32, height: 32 }
        }
        if (spriteId === "sprite-b") {
          return { width: 16, height: 16 }
        }
        if (spriteId === "sprite-c") {
          return { width: 32, height: 32 }
        }
        return null
      }
    })

    expect(painted).toEqual([
      { spriteId: "sprite-a", x: 0, y: 0 },
      { spriteId: "sprite-b", x: 64, y: 0 },
      { spriteId: "sprite-c", x: 32, y: 0 },
      { spriteId: "sprite-c", x: 96, y: 0 }
    ])
  })

  it("erases all intersecting stamps along eraser stroke", () => {
    const erased = eraseStampsAlongStroke({
      stamps: [
        { spriteId: "sprite-a", x: 0, y: 0 },
        { spriteId: "sprite-b", x: 32, y: 0 },
        { spriteId: "sprite-c", x: 64, y: 0 },
        { spriteId: "sprite-d", x: 96, y: 32 }
      ],
      from: { x: 0, y: 0 },
      to: { x: 64, y: 0 },
      eraserWidth: 32,
      eraserHeight: 32,
      resolveSpriteDimensions: (spriteId) => {
        if (spriteId === "sprite-a") {
          return { width: 16, height: 16 }
        }
        if (spriteId === "sprite-b") {
          return { width: 32, height: 32 }
        }
        if (spriteId === "sprite-c") {
          return { width: 16, height: 16 }
        }
        if (spriteId === "sprite-d") {
          return { width: 16, height: 16 }
        }
        return null
      }
    })

    expect(erased).toEqual([
      { spriteId: "sprite-d", x: 96, y: 32 }
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
