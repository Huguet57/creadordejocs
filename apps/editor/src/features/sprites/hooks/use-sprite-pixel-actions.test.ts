import { describe, expect, it } from "vitest"
import { TRANSPARENT_RGBA } from "../utils/pixel-rgba.js"
import {
  applyBucketFillTool,
  readPixelColorAt,
  selectContiguousPixels
} from "./use-sprite-pixel-actions.js"

describe("use-sprite-pixel-actions helpers", () => {
  it("fills only contiguous area for bucket fill", () => {
    const width = 3
    const height = 3
    const pixels = [
      "#111111FF", "#111111FF", "#222222FF",
      "#111111FF", "#222222FF", "#222222FF",
      "#333333FF", "#333333FF", "#333333FF"
    ]
    const next = applyBucketFillTool({
      width,
      height,
      pixelsRgba: pixels,
      x: 0,
      y: 0,
      targetColor: "#FF0000FF",
      connectivity: 4
    })

    expect(next).toEqual([
      "#FF0000FF", "#FF0000FF", "#222222FF",
      "#FF0000FF", "#222222FF", "#222222FF",
      "#333333FF", "#333333FF", "#333333FF"
    ])
  })

  it("returns same pixels when bucket fill color already matches", () => {
    const pixels = ["#AA00AAFF", "#000000FF", "#000000FF", "#000000FF"]
    const next = applyBucketFillTool({
      width: 2,
      height: 2,
      pixelsRgba: pixels,
      x: 0,
      y: 0,
      targetColor: "#AA00AAFF",
      connectivity: 4
    })
    expect(next).toEqual(pixels)
  })

  it("selects contiguous pixels for magic wand", () => {
    const selected = selectContiguousPixels({
      width: 3,
      height: 3,
      pixelsRgba: [
        "#A0A0A0FF", "#A0A0A0FF", "#B0B0B0FF",
        "#A0A0A0FF", "#B0B0B0FF", "#B0B0B0FF",
        "#A0A0A0FF", "#A0A0A0FF", "#A0A0A0FF"
      ],
      x: 2,
      y: 0,
      connectivity: 4
    })
    expect(selected).toEqual(new Set([2, 4, 5]))
  })

  it("picks pixel color and falls back to transparent for out-of-bounds", () => {
    const pixels = ["#112233FF", "#445566FF", "#778899FF", "#AABBCCFF"]
    expect(readPixelColorAt({ width: 2, height: 2, pixelsRgba: pixels, x: 1, y: 0 })).toBe("#445566FF")
    expect(readPixelColorAt({ width: 2, height: 2, pixelsRgba: pixels, x: 4, y: 1 })).toBe(TRANSPARENT_RGBA)
  })
})
