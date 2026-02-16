import { describe, expect, it } from "vitest"
import { cropRgbaPixels, scaleNearestRgbaPixels } from "./image-to-pixels.js"

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

describe("cropRgbaPixels", () => {
  it("extracts a sub-region from the source pixel buffer", () => {
    const source = new Uint8ClampedArray([
      ...rgba(1, 1, 1), ...rgba(2, 2, 2), ...rgba(3, 3, 3),
      ...rgba(4, 4, 4), ...rgba(5, 5, 5), ...rgba(6, 6, 6),
      ...rgba(7, 7, 7), ...rgba(8, 8, 8), ...rgba(9, 9, 9)
    ])
    const result = cropRgbaPixels(source, 3, { x: 1, y: 1, width: 2, height: 2 })
    expect(Array.from(result)).toEqual([
      ...rgba(5, 5, 5), ...rgba(6, 6, 6),
      ...rgba(8, 8, 8), ...rgba(9, 9, 9)
    ])
  })

  it("returns full buffer when crop covers entire image", () => {
    const source = new Uint8ClampedArray([...rgba(10, 20, 30), ...rgba(40, 50, 60)])
    const result = cropRgbaPixels(source, 2, { x: 0, y: 0, width: 2, height: 1 })
    expect(Array.from(result)).toEqual(Array.from(source))
  })

  it("fills transparent pixels when crop extends beyond image bounds", () => {
    const source = new Uint8ClampedArray([...rgba(100, 100, 100)])
    const result = cropRgbaPixels(source, 1, { x: -1, y: 0, width: 2, height: 1 }, 1)
    expect(Array.from(result)).toEqual([...rgba(0, 0, 0, 0), ...rgba(100, 100, 100)])
  })
})
