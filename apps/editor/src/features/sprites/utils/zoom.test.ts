import { describe, expect, it } from "vitest"
import { ABSOLUTE_MAX_MAX_ZOOM, ABSOLUTE_MIN_MAX_ZOOM, clampZoom, computeFitZoom, computeMaxZoom, MIN_SPRITE_ZOOM } from "./zoom.js"

describe("clampZoom", () => {
  it("clamps to min when value is too low", () => {
    expect(clampZoom(0)).toBe(MIN_SPRITE_ZOOM)
  })

  it("clamps to max when value is too high", () => {
    expect(clampZoom(999, 1, 24)).toBe(24)
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
        spriteHeight: 1,
        maxZoom: 24
      })
    ).toBe(24)

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

describe("computeMaxZoom", () => {
  it("returns 24 for a standard 32x32 sprite", () => {
    expect(computeMaxZoom(32, 32)).toBe(24)
  })

  it("returns 12 for a 64x64 sprite", () => {
    expect(computeMaxZoom(64, 64)).toBe(12)
  })

  it("returns 6 for a 128x128 sprite", () => {
    expect(computeMaxZoom(128, 128)).toBe(6)
  })

  it("clamps to ABSOLUTE_MIN_MAX_ZOOM for very large sprites", () => {
    expect(computeMaxZoom(256, 200)).toBe(ABSOLUTE_MIN_MAX_ZOOM)
    expect(computeMaxZoom(512, 512)).toBe(ABSOLUTE_MIN_MAX_ZOOM)
  })

  it("clamps to ABSOLUTE_MAX_MAX_ZOOM for tiny sprites", () => {
    expect(computeMaxZoom(16, 16)).toBe(ABSOLUTE_MAX_MAX_ZOOM)
    expect(computeMaxZoom(8, 8)).toBe(ABSOLUTE_MAX_MAX_ZOOM)
  })

  it("uses the largest dimension for non-square sprites", () => {
    expect(computeMaxZoom(256, 32)).toBe(ABSOLUTE_MIN_MAX_ZOOM)
    expect(computeMaxZoom(32, 256)).toBe(ABSOLUTE_MIN_MAX_ZOOM)
  })

  it("returns ABSOLUTE_MIN_MAX_ZOOM for zero or negative dimensions", () => {
    expect(computeMaxZoom(0, 32)).toBe(ABSOLUTE_MIN_MAX_ZOOM)
    expect(computeMaxZoom(32, 0)).toBe(ABSOLUTE_MIN_MAX_ZOOM)
    expect(computeMaxZoom(-1, -1)).toBe(ABSOLUTE_MIN_MAX_ZOOM)
  })
})
