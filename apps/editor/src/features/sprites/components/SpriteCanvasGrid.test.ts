import { createElement } from "react"
import { renderToStaticMarkup } from "react-dom/server"
import { describe, expect, it, vi } from "vitest"
import { SpriteCanvasGrid } from "./SpriteCanvasGrid.js"

function renderGrid(width: number, height: number): string {
  return renderToStaticMarkup(
    createElement(SpriteCanvasGrid, {
      width,
      height,
      pixelsRgba: Array.from({ length: width * height }, () => "#00000000"),
      zoom: 4,
      showGrid: true,
      activeTool: "pencil",
      eraserRadius: 1,
      selectedIndices: new Set<number>(),
      selectDragRect: null,
      onPaint: vi.fn(),
      onHoverColorChange: vi.fn(),
      onPointerUpOutside: vi.fn()
    })
  )
}

describe("SpriteCanvasGrid", () => {
  it("renders a single canvas even for large sprites", () => {
    const markup = renderGrid(256, 200)
    expect(markup).toContain("<canvas")
  })

  it("does not render per-pixel button cells", () => {
    const markup = renderGrid(256, 200)
    expect(markup).not.toContain("mvp16-sprite-cell")
  })
})
