import { describe, expect, it } from "vitest"
import { flipHorizontal, flipVertical, rotateCW, rotateCCW } from "./sprite-transforms.js"

// 2x3 grid (width=2, height=3):
//   A B
//   C D
//   E F
const grid2x3 = {
  width: 2,
  height: 3,
  pixelsRgba: ["A", "B", "C", "D", "E", "F"]
}

describe("flipHorizontal", () => {
  it("mirrors pixels left-to-right", () => {
    const result = flipHorizontal(grid2x3)
    expect(result.width).toBe(2)
    expect(result.height).toBe(3)
    // B A / D C / F E
    expect(result.pixelsRgba).toEqual(["B", "A", "D", "C", "F", "E"])
  })

  it("is its own inverse", () => {
    const result = flipHorizontal(flipHorizontal(grid2x3))
    expect(result.pixelsRgba).toEqual(grid2x3.pixelsRgba)
  })
})

describe("flipVertical", () => {
  it("mirrors pixels top-to-bottom", () => {
    const result = flipVertical(grid2x3)
    expect(result.width).toBe(2)
    expect(result.height).toBe(3)
    // E F / C D / A B
    expect(result.pixelsRgba).toEqual(["E", "F", "C", "D", "A", "B"])
  })

  it("is its own inverse", () => {
    const result = flipVertical(flipVertical(grid2x3))
    expect(result.pixelsRgba).toEqual(grid2x3.pixelsRgba)
  })
})

describe("rotateCW", () => {
  it("rotates 90° clockwise and swaps dimensions", () => {
    const result = rotateCW(grid2x3)
    // Original (2x3):    Rotated CW (3x2):
    //   A B                E C A
    //   C D                F D B
    //   E F
    expect(result.width).toBe(3)
    expect(result.height).toBe(2)
    expect(result.pixelsRgba).toEqual(["E", "C", "A", "F", "D", "B"])
  })

  it("four rotations return to original", () => {
    const result = rotateCW(rotateCW(rotateCW(rotateCW(grid2x3))))
    expect(result.width).toBe(grid2x3.width)
    expect(result.height).toBe(grid2x3.height)
    expect(result.pixelsRgba).toEqual(grid2x3.pixelsRgba)
  })
})

describe("rotateCCW", () => {
  it("rotates 90° counter-clockwise and swaps dimensions", () => {
    const result = rotateCCW(grid2x3)
    // Original (2x3):    Rotated CCW (3x2):
    //   A B                B D F
    //   C D                A C E
    //   E F
    expect(result.width).toBe(3)
    expect(result.height).toBe(2)
    expect(result.pixelsRgba).toEqual(["B", "D", "F", "A", "C", "E"])
  })

  it("rotateCCW is inverse of rotateCW", () => {
    const result = rotateCCW(rotateCW(grid2x3))
    expect(result.width).toBe(grid2x3.width)
    expect(result.height).toBe(grid2x3.height)
    expect(result.pixelsRgba).toEqual(grid2x3.pixelsRgba)
  })
})
