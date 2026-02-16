import { useState } from "react"
import { hexRgbaToCss } from "../utils/pixel-rgba.js"
import { normalizePixelGrid } from "../utils/sprite-grid.js"
import type { SpriteEditorTool } from "../types/sprite-editor.js"

type SpriteCanvasGridProps = {
  width: number
  height: number
  pixelsRgba: string[]
  zoom: number
  activeTool: SpriteEditorTool
  onPaint: (x: number, y: number, tool: SpriteEditorTool) => void
}

export function SpriteCanvasGrid({ width, height, pixelsRgba, zoom, activeTool, onPaint }: SpriteCanvasGridProps) {
  const [isPointerDown, setIsPointerDown] = useState(false)
  const safePixels = normalizePixelGrid(pixelsRgba, width, height)

  return (
    <div className="mvp16-sprite-grid-wrapper flex-1 overflow-auto bg-slate-50 p-4">
      <div
        className="mvp16-sprite-grid inline-grid border border-slate-300 bg-white shadow-sm"
        style={{
          gridTemplateColumns: `repeat(${width}, ${zoom}px)`,
          gridTemplateRows: `repeat(${height}, ${zoom}px)`
        }}
        onMouseLeave={() => setIsPointerDown(false)}
      >
        {safePixels.map((pixelEntry, index) => {
          const x = index % width
          const y = Math.floor(index / width)
          return (
            <button
              key={`${x}-${y}`}
              type="button"
              className="mvp16-sprite-cell border border-slate-200 p-0"
              style={{
                width: `${zoom}px`,
                height: `${zoom}px`,
                backgroundColor: hexRgbaToCss(pixelEntry)
              }}
              onMouseDown={() => {
                setIsPointerDown(true)
                onPaint(x, y, activeTool)
              }}
              onMouseUp={() => setIsPointerDown(false)}
              onMouseEnter={() => {
                if (isPointerDown) {
                  onPaint(x, y, activeTool)
                }
              }}
              aria-label={`Pixel ${x},${y}`}
            />
          )
        })}
      </div>
    </div>
  )
}
