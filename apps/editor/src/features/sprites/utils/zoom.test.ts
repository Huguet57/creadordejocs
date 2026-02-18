import { describe, expect, it } from "vitest"
import { clampZoom, computeFitZoom, MAX_SPRITE_ZOOM, MIN_SPRITE_ZOOM } from "./zoom.js"

describe("clampZoom", () => {
  it("clamps to min when value is too low", () => {
    expect(clampZoom(0)).toBe(MIN_SPRITE_ZOOM)
  })

  it("clamps to max when value is too high", () => {
    expect(clampZoom(999)).toBe(MAX_SPRITE_ZOOM)
  })

  it("rounds and keeps values inside range", () => {
    expect(clampZoom(3.6)).toBe(4)
  })
})

describe("computeFitZoom", () => {
  it("returns min zoom when sprite is larger than viewport", () => {
    expect(
      computeFitZoom({
        viewportWidth: 320,
        viewportHeight: 180,
        spriteWidth: 256,
        spriteHeight: 200
      })
    ).toBe(MIN_SPRITE_ZOOM)
  })

  it("returns a zoom larger than 1 when viewport allows it", () => {
    expect(
      computeFitZoom({
        viewportWidth: 1200,
        viewportHeight: 900,
        spriteWidth: 256,
        spriteHeight: 200
      })
    ).toBe(4)
  })

  it("always clamps fit zoom to min/max bounds", () => {
    expect(
      computeFitZoom({
        viewportWidth: 99999,
        viewportHeight: 99999,
        spriteWidth: 1,
        spriteHeight: 1
      })
    ).toBe(MAX_SPRITE_ZOOM)

    expect(
      computeFitZoom({
        viewportWidth: 0,
        viewportHeight: 0,
        spriteWidth: 256,
        spriteHeight: 200
      })
    ).toBe(MIN_SPRITE_ZOOM)
  })
})
