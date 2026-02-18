import { describe, expect, it } from "vitest"
import { getSpritePixelFromCanvasPointer } from "./sprite-canvas-coords.js"

describe("getSpritePixelFromCanvasPointer", () => {
  it("maps pointer coordinates to sprite pixel using zoom", () => {
    expect(
      getSpritePixelFromCanvasPointer({
        clientX: 120,
        clientY: 90,
        canvasLeft: 100,
        canvasTop: 80,
        zoom: 4,
        spriteWidth: 256,
        spriteHeight: 200
      })
    ).toEqual({ x: 5, y: 2 })
  })

  it("returns null when pointer is outside canvas bounds", () => {
    expect(
      getSpritePixelFromCanvasPointer({
        clientX: 10,
        clientY: 10,
        canvasLeft: 100,
        canvasTop: 80,
        zoom: 4,
        spriteWidth: 256,
        spriteHeight: 200
      })
    ).toBeNull()
  })

  it("works when canvas origin is shifted by scroll", () => {
    expect(
      getSpritePixelFromCanvasPointer({
        clientX: 300,
        clientY: 220,
        canvasLeft: -200,
        canvasTop: -100,
        zoom: 2,
        spriteWidth: 256,
        spriteHeight: 200
      })
    ).toEqual({ x: 250, y: 160 })
  })
})
