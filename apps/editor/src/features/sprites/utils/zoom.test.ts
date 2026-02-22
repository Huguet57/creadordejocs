import { describe, expect, it } from "vitest"
import {
  ABSOLUTE_MAX_MAX_ZOOM,
  ABSOLUTE_MIN_MAX_ZOOM,
  ABSOLUTE_MIN_MIN_ZOOM,
  clampZoom,
  computeFitZoom,
  computeMaxZoom,
  computeMinZoom,
  computeZoomStep,
  MIN_SPRITE_ZOOM
} from "./zoom.js"

describe("clampZoom", () => {
  it("clamps to min when value is too low", () => {
    expect(clampZoom(0)).toBe(MIN_SPRITE_ZOOM)
  })

  it("clamps to max when value is too high", () => {
    expect(clampZoom(999, 1, 24)).toBe(24)
  })

  it("rounds and keeps values inside range (integer step)", () => {
    expect(clampZoom(3.6)).toBe(4)
  })

  it("rounds to fractional step", () => {
    expect(clampZoom(1.9, 1, 6, 0.25)).toBe(2)
    expect(clampZoom(1.3, 1, 6, 0.25)).toBe(1.25)
    expect(clampZoom(2.7, 1, 12, 0.5)).toBe(2.5)
  })
})

describe("computeZoomStep", () => {
  it("returns fine step for small zoom range", () => {
    // range=5, ideal=5/60=0.083 → picks 0.1
    expect(computeZoomStep(1, 6)).toBe(0.1)
  })

  it("returns medium step for medium zoom range", () => {
    // range=11, ideal=11/60=0.183 → picks 0.2
    expect(computeZoomStep(1, 12)).toBe(0.2)
  })

  it("returns coarser step for large zoom range", () => {
    // range=23, ideal=23/60=0.383 → picks 0.5
    expect(computeZoomStep(1, 24)).toBe(0.5)
    // range=39, ideal=39/60=0.65 → picks 1
    expect(computeZoomStep(1, 40)).toBe(1)
  })

  it("accounts for sub-1 minZoom in range calculation", () => {
    // range=5.75, ideal=5.75/60=0.096 → picks 0.1
    expect(computeZoomStep(0.25, 6)).toBe(0.1)
  })

  it("returns smallest step for very small ranges", () => {
    // range=0.5, ideal=0.5/60=0.008 → picks 0.01
    expect(computeZoomStep(0.5, 1)).toBe(0.01)
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

  it("floors to fractional step for a tighter fit", () => {
    // viewport 750x380, sprite 256x200 → ratios 2.93, 1.9 → floor(1.9/0.25)*0.25 = 1.75
    expect(
      computeFitZoom({
        viewportWidth: 750,
        viewportHeight: 380,
        spriteWidth: 256,
        spriteHeight: 200,
        step: 0.25
      })
    ).toBe(1.75)
  })

  it("returns sub-1 zoom when minZoom allows it and sprite is large", () => {
    // ratios: 400/768=0.52, 300/512=0.586 → min is 0.52 → floor(0.52/0.1)*0.1 = 0.5
    expect(
      computeFitZoom({
        viewportWidth: 400,
        viewportHeight: 300,
        spriteWidth: 768,
        spriteHeight: 512,
        minZoom: 0.25,
        maxZoom: 6,
        step: 0.1
      })
    ).toBe(0.5)
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

describe("computeMinZoom", () => {
  it("returns 1 for small sprites (max dimension <= 384)", () => {
    expect(computeMinZoom(32, 32)).toBe(1)
    expect(computeMinZoom(128, 128)).toBe(1)
    expect(computeMinZoom(256, 200)).toBe(1)
    expect(computeMinZoom(384, 384)).toBe(1)
  })

  it("returns sub-1 for large sprites (max dimension > 384)", () => {
    expect(computeMinZoom(768, 512)).toBe(0.25)
    expect(computeMinZoom(512, 512)).toBe(0.4)
    expect(computeMinZoom(400, 300)).toBe(0.5)
  })

  it("clamps to ABSOLUTE_MIN_MIN_ZOOM for very large sprites", () => {
    expect(computeMinZoom(5000, 5000)).toBe(ABSOLUTE_MIN_MIN_ZOOM)
  })

  it("returns 1 for zero or negative dimensions", () => {
    expect(computeMinZoom(0, 32)).toBe(1)
    expect(computeMinZoom(32, 0)).toBe(1)
    expect(computeMinZoom(-1, -1)).toBe(1)
  })

  it("uses the largest dimension for non-square sprites", () => {
    expect(computeMinZoom(768, 32)).toBe(0.25)
    expect(computeMinZoom(32, 768)).toBe(0.25)
  })
})
