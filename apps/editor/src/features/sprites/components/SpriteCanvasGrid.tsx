import { useMemo, useState } from "react"
import { hexRgbaToCss } from "../utils/pixel-rgba.js"
import { getPixelIndicesInRadius, normalizePixelGrid } from "../utils/sprite-grid.js"
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
  eraserRadius: number
  selectedIndices: Set<number>
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
  eraserRadius,
  selectedIndices,
  onPaint,
  onHoverColorChange
}: SpriteCanvasGridProps) {
  const [isPointerDown, setIsPointerDown] = useState(false)
  const [hoveredCell, setHoveredCell] = useState<{ x: number; y: number } | null>(null)
  const safePixels = normalizePixelGrid(pixelsRgba, width, height)

  const eraserPreviewSet = useMemo(() => {
    if (activeTool !== "eraser" || !hoveredCell) return new Set<number>()
    return new Set(getPixelIndicesInRadius(hoveredCell.x, hoveredCell.y, eraserRadius, width, height))
  }, [activeTool, hoveredCell, eraserRadius, width, height])

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
          setHoveredCell(null)
          onHoverColorChange?.(null)
        }}
      >
        {safePixels.map((pixelEntry, index) => {
          const x = index % width
          const y = Math.floor(index / width)
          const isEraserPreview = eraserPreviewSet.has(index)
          const isSelected = selectedIndices.has(index)
          const isPickerHover = activeTool === "color_picker" && hoveredCell?.x === x && hoveredCell?.y === y
          return (
            <button
              key={`${x}-${y}`}
              type="button"
              className={`mvp16-sprite-cell p-0 ${showGrid ? "border border-slate-200" : "border-0"}`}
              style={{
                width: `${zoom}px`,
                height: `${zoom}px`,
                backgroundColor: hexRgbaToCss(pixelEntry),
                cursor: "inherit",
                ...(isEraserPreview
                  ? { boxShadow: "inset 0 0 0 100px rgba(239, 68, 68, 0.35)" }
                  : {}),
                ...(isSelected
                  ? { boxShadow: "inset 0 0 0 100px rgba(99, 102, 241, 0.3)", outline: "1px dashed rgba(99, 102, 241, 0.7)" }
                  : {}),
                ...(isPickerHover
                  ? { outline: "2px solid rgba(99, 102, 241, 0.9)", outlineOffset: "-2px", zIndex: 1 }
                  : {})
              }}
              onMouseDown={() => {
                setIsPointerDown(true)
                onPaint(x, y, activeTool, "pointerDown")
              }}
              onMouseUp={() => setIsPointerDown(false)}
              onMouseEnter={() => {
                setHoveredCell({ x, y })
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
