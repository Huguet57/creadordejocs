import { useState } from "react"
import { hexRgbaToCss } from "../utils/pixel-rgba.js"
import { normalizePixelGrid } from "../utils/sprite-grid.js"
import type { SpriteEditorTool } from "../types/sprite-editor.js"
import type { SpritePointerActionPhase } from "../hooks/use-sprite-pixel-actions.js"
import { SPRITE_TOOL_BY_ID } from "../utils/sprite-tools/tool-registry.js"

type SpriteCanvasGridProps = {
  width: number
  height: number
  pixelsRgba: string[]
  zoom: number
  showGrid: boolean
  activeTool: SpriteEditorTool
  onPaint: (x: number, y: number, tool: SpriteEditorTool, phase: SpritePointerActionPhase) => void
  onHoverColorChange?: (color: string | null) => void
}

export function SpriteCanvasGrid({
  width,
  height,
  pixelsRgba,
  zoom,
  showGrid,
  activeTool,
  onPaint,
  onHoverColorChange
}: SpriteCanvasGridProps) {
  const [isPointerDown, setIsPointerDown] = useState(false)
  const safePixels = normalizePixelGrid(pixelsRgba, width, height)

  return (
    <div className="mvp16-sprite-grid-wrapper flex-1 overflow-auto bg-slate-50 p-4">
      <div
        className="mvp16-sprite-grid inline-grid border border-slate-300 shadow-sm"
        style={{
          gridTemplateColumns: `repeat(${width}, ${zoom}px)`,
          gridTemplateRows: `repeat(${height}, ${zoom}px)`,
          cursor: SPRITE_TOOL_BY_ID[activeTool]?.cursor ?? "default",
          backgroundColor: "#ffffff",
          backgroundImage:
            "linear-gradient(45deg, #d0d0d0 25%, transparent 25%, transparent 75%, #d0d0d0 75%), " +
            "linear-gradient(45deg, #d0d0d0 25%, transparent 25%, transparent 75%, #d0d0d0 75%)",
          backgroundSize: `${Math.max(zoom, 8)}px ${Math.max(zoom, 8)}px`,
          backgroundPosition: `0 0, ${Math.max(zoom, 8) / 2}px ${Math.max(zoom, 8) / 2}px`
        }}
        onMouseLeave={() => {
          setIsPointerDown(false)
          onHoverColorChange?.(null)
        }}
      >
        {safePixels.map((pixelEntry, index) => {
          const x = index % width
          const y = Math.floor(index / width)
          return (
            <button
              key={`${x}-${y}`}
              type="button"
              className={`mvp16-sprite-cell p-0 ${showGrid ? "border border-slate-200" : "border-0"}`}
              style={{
                width: `${zoom}px`,
                height: `${zoom}px`,
                backgroundColor: hexRgbaToCss(pixelEntry),
                cursor: "inherit"
              }}
              onMouseDown={() => {
                setIsPointerDown(true)
                onPaint(x, y, activeTool, "pointerDown")
              }}
              onMouseUp={() => setIsPointerDown(false)}
              onMouseEnter={() => {
                onHoverColorChange?.(pixelEntry)
                if (isPointerDown) {
                  onPaint(x, y, activeTool, "pointerDrag")
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
