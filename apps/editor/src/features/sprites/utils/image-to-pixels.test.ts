import { describe, expect, it } from "vitest"
import { scaleNearestRgbaPixels } from "./image-to-pixels.js"

function rgba(r: number, g: number, b: number, a = 255): number[] {
  return [r, g, b, a]
}

describe("scaleNearestRgbaPixels", () => {
  it("keeps pixels when source and target size are equal", () => {
    const source = new Uint8ClampedArray([...rgba(255, 0, 0), ...rgba(0, 255, 0), ...rgba(0, 0, 255), ...rgba(255, 255, 0)])
    const result = scaleNearestRgbaPixels(source, 2, 2, 2, 2)
    expect(Array.from(result)).toEqual(Array.from(source))
  })

  it("scales 2x2 image to 1x1 using top-left nearest pixel", () => {
    const source = new Uint8ClampedArray([...rgba(10, 20, 30), ...rgba(50, 60, 70), ...rgba(100, 110, 120), ...rgba(130, 140, 150)])
    const result = scaleNearestRgbaPixels(source, 2, 2, 1, 1)
    expect(Array.from(result)).toEqual(rgba(10, 20, 30))
  })
})
