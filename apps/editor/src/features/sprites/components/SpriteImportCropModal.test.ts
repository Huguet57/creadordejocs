import { describe, expect, it } from "vitest"
import { resolvePreviewCellSize } from "./SpriteImportCropModal.js"

describe("resolvePreviewCellSize", () => {
  it("keeps default cell size for small sprites", () => {
    expect(resolvePreviewCellSize(32, 32)).toBe(6)
  })

  it("reduces cell size for large sprites to keep preview bounded", () => {
    const cell = resolvePreviewCellSize(256, 200)
    expect(cell).toBeLessThan(1)

    const previewWidth = Math.round(256 * cell)
    const previewHeight = Math.round(200 * cell)
    expect(previewWidth).toBeLessThanOrEqual(220)
    expect(previewHeight).toBeLessThanOrEqual(220)
  })

  it("handles invalid sizes with default value", () => {
    expect(resolvePreviewCellSize(0, 200)).toBe(6)
    expect(resolvePreviewCellSize(256, 0)).toBe(6)
  })
})
