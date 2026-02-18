import { useEffect, useMemo, useRef, useState, type PointerEvent as ReactPointerEvent } from "react"
import { getPixelIndicesInRadius, normalizePixelGrid } from "../utils/sprite-grid.js"
import type { SpriteEditorTool } from "../types/sprite-editor.js"
import type { SpritePointerActionPhase } from "../hooks/use-sprite-pixel-actions.js"
import { SPRITE_TOOL_BY_ID } from "../utils/sprite-tools/tool-registry.js"
import { getSpritePixelFromCanvasPointer } from "../utils/sprite-canvas-coords.js"

const MIN_GRID_ZOOM = 4
const MIN_CHECKER_SIZE = 8
const SELECTION_FILL = "rgba(99, 102, 241, 0.3)"
const SELECTION_STROKE = "rgba(99, 102, 241, 0.7)"
const HOVER_STROKE = "rgba(99, 102, 241, 0.9)"
const ERASER_PREVIEW_FILL = "rgba(239, 68, 68, 0.35)"

type ColorChannels = readonly [number, number, number, number]

export type SelectDragRect = {
  startX: number
  startY: number
  endX: number
  endY: number
}

type SpriteCanvasGridProps = {
  width: number
  height: number
  pixelsRgba: string[]
  zoom: number
  showGrid: boolean
  activeTool: SpriteEditorTool
  eraserRadius: number
  selectedIndices: Set<number>
  selectDragRect: SelectDragRect | null
  onPaint: (x: number, y: number, tool: SpriteEditorTool, phase: SpritePointerActionPhase) => void
  onHoverColorChange?: (color: string | null) => void
  onPointerUpOutside?: () => void
  onViewportElementChange?: (element: HTMLDivElement | null) => void
}

function resolveDragBounds(rect: SelectDragRect | null): { minX: number; maxX: number; minY: number; maxY: number } | null {
  if (!rect) return null
  return {
    minX: Math.min(rect.startX, rect.endX),
    maxX: Math.max(rect.startX, rect.endX),
    minY: Math.min(rect.startY, rect.endY),
    maxY: Math.max(rect.startY, rect.endY)
  }
}

function getColorChannels(hexRgba: string, cache: Map<string, ColorChannels>): ColorChannels {
  const cached = cache.get(hexRgba)
  if (cached) return cached

  const channels: ColorChannels = [
    Number.parseInt(hexRgba.slice(1, 3), 16),
    Number.parseInt(hexRgba.slice(3, 5), 16),
    Number.parseInt(hexRgba.slice(5, 7), 16),
    Number.parseInt(hexRgba.slice(7, 9), 16)
  ]
  cache.set(hexRgba, channels)
  return channels
}

function createCheckerPattern(ctx: CanvasRenderingContext2D, checkerSize: number): CanvasPattern | null {
  const tile = document.createElement("canvas")
  tile.width = checkerSize * 2
  tile.height = checkerSize * 2

  const tileCtx = tile.getContext("2d")
  if (!tileCtx) return null

  tileCtx.fillStyle = "#ffffff"
  tileCtx.fillRect(0, 0, tile.width, tile.height)
  tileCtx.fillStyle = "#d0d0d0"
  tileCtx.fillRect(0, 0, checkerSize, checkerSize)
  tileCtx.fillRect(checkerSize, checkerSize, checkerSize, checkerSize)

  return ctx.createPattern(tile, "repeat")
}

function drawCellOverlay(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  zoom: number,
  fillColor: string | null,
  strokeColor: string | null,
  lineWidth = 1
): void {
  const left = x * zoom
  const top = y * zoom

  if (fillColor) {
    ctx.fillStyle = fillColor
    ctx.fillRect(left, top, zoom, zoom)
  }

  if (strokeColor) {
    const strokeInset = lineWidth / 2
    ctx.strokeStyle = strokeColor
    ctx.lineWidth = lineWidth
    ctx.strokeRect(left + strokeInset, top + strokeInset, Math.max(0, zoom - lineWidth), Math.max(0, zoom - lineWidth))
  }
}

function drawGrid(ctx: CanvasRenderingContext2D, width: number, height: number, zoom: number): void {
  ctx.beginPath()
  ctx.strokeStyle = "rgba(203, 213, 225, 0.9)"
  ctx.lineWidth = 1

  for (let x = 0; x <= width; x += 1) {
    const xPos = x * zoom + 0.5
    ctx.moveTo(xPos, 0)
    ctx.lineTo(xPos, height * zoom)
  }

  for (let y = 0; y <= height; y += 1) {
    const yPos = y * zoom + 0.5
    ctx.moveTo(0, yPos)
    ctx.lineTo(width * zoom, yPos)
  }

  ctx.stroke()
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
  selectDragRect,
  onPaint,
  onHoverColorChange,
  onPointerUpOutside,
  onViewportElementChange
}: SpriteCanvasGridProps) {
  const [hoveredCell, setHoveredCell] = useState<{ x: number; y: number } | null>(null)
  const viewportRef = useRef<HTMLDivElement | null>(null)
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const sourceCanvasRef = useRef<HTMLCanvasElement | null>(null)
  const pointerDownRef = useRef(false)
  const lastDragCellKeyRef = useRef<string | null>(null)
  const colorChannelCacheRef = useRef<Map<string, ColorChannels>>(new Map())
  const checkerPatternCacheRef = useRef<Map<number, CanvasPattern | null>>(new Map())

  const safePixels = useMemo(() => normalizePixelGrid(pixelsRgba, width, height), [pixelsRgba, width, height])

  const eraserPreviewSet = useMemo(() => {
    if (activeTool !== "eraser" || !hoveredCell) return new Set<number>()
    return new Set(getPixelIndicesInRadius(hoveredCell.x, hoveredCell.y, eraserRadius, width, height))
  }, [activeTool, hoveredCell, eraserRadius, width, height])

  const dragBounds = useMemo(() => resolveDragBounds(selectDragRect), [selectDragRect])

  useEffect(() => {
    onViewportElementChange?.(viewportRef.current)
    return () => onViewportElementChange?.(null)
  }, [onViewportElementChange])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas || width <= 0 || height <= 0 || zoom <= 0 || typeof window === "undefined") {
      return
    }

    const cssWidth = width * zoom
    const cssHeight = height * zoom
    const devicePixelRatio = Math.max(1, window.devicePixelRatio || 1)
    const nextCanvasWidth = Math.max(1, Math.round(cssWidth * devicePixelRatio))
    const nextCanvasHeight = Math.max(1, Math.round(cssHeight * devicePixelRatio))

    if (canvas.width !== nextCanvasWidth || canvas.height !== nextCanvasHeight) {
      canvas.width = nextCanvasWidth
      canvas.height = nextCanvasHeight
      checkerPatternCacheRef.current.clear()
    }

    const ctx = canvas.getContext("2d")
    if (!ctx) return

    ctx.setTransform(devicePixelRatio, 0, 0, devicePixelRatio, 0, 0)
    ctx.clearRect(0, 0, cssWidth, cssHeight)

    const checkerSize = Math.max(zoom, MIN_CHECKER_SIZE)
    let checkerPattern = checkerPatternCacheRef.current.get(checkerSize)
    if (checkerPattern === undefined) {
      checkerPattern = createCheckerPattern(ctx, checkerSize)
      checkerPatternCacheRef.current.set(checkerSize, checkerPattern)
    }

    if (checkerPattern) {
      ctx.fillStyle = checkerPattern
      ctx.fillRect(0, 0, cssWidth, cssHeight)
    } else {
      ctx.fillStyle = "#ffffff"
      ctx.fillRect(0, 0, cssWidth, cssHeight)
    }

    sourceCanvasRef.current ??= document.createElement("canvas")
    const sourceCanvas = sourceCanvasRef.current
    sourceCanvas.width = width
    sourceCanvas.height = height
    const sourceCtx = sourceCanvas.getContext("2d")
    if (!sourceCtx) return

    const imageData = sourceCtx.createImageData(width, height)
    for (let index = 0; index < safePixels.length; index += 1) {
      const color = safePixels[index] ?? "#00000000"
      const [r, g, b, a] = getColorChannels(color, colorChannelCacheRef.current)
      const offset = index * 4
      imageData.data[offset] = r
      imageData.data[offset + 1] = g
      imageData.data[offset + 2] = b
      imageData.data[offset + 3] = a
    }

    sourceCtx.putImageData(imageData, 0, 0)

    ctx.imageSmoothingEnabled = false
    ctx.drawImage(sourceCanvas, 0, 0, cssWidth, cssHeight)

    if (showGrid && zoom >= MIN_GRID_ZOOM) {
      drawGrid(ctx, width, height, zoom)
    }

    for (const selectedIndex of eraserPreviewSet) {
      const x = selectedIndex % width
      const y = Math.floor(selectedIndex / width)
      drawCellOverlay(ctx, x, y, zoom, ERASER_PREVIEW_FILL, null)
    }

    for (const selectedIndex of selectedIndices) {
      const x = selectedIndex % width
      const y = Math.floor(selectedIndex / width)
      drawCellOverlay(ctx, x, y, zoom, SELECTION_FILL, SELECTION_STROKE)
    }

    if (dragBounds) {
      for (let y = dragBounds.minY; y <= dragBounds.maxY; y += 1) {
        for (let x = dragBounds.minX; x <= dragBounds.maxX; x += 1) {
          if (x < 0 || y < 0 || x >= width || y >= height) continue
          drawCellOverlay(ctx, x, y, zoom, SELECTION_FILL, SELECTION_STROKE)
        }
      }
    }

    if ((activeTool === "pencil" || activeTool === "color_picker") && hoveredCell) {
      drawCellOverlay(ctx, hoveredCell.x, hoveredCell.y, zoom, null, HOVER_STROKE, 2)
    }
  }, [activeTool, dragBounds, eraserPreviewSet, height, hoveredCell, safePixels, selectedIndices, showGrid, width, zoom])

  const resolvePixelFromPointer = (event: ReactPointerEvent<HTMLCanvasElement>): { x: number; y: number } | null => {
    const rect = event.currentTarget.getBoundingClientRect()
    return getSpritePixelFromCanvasPointer({
      clientX: event.clientX,
      clientY: event.clientY,
      canvasLeft: rect.left,
      canvasTop: rect.top,
      zoom,
      spriteWidth: width,
      spriteHeight: height
    })
  }

  const updateHoverColor = (pixel: { x: number; y: number } | null) => {
    if (!pixel) {
      onHoverColorChange?.(null)
      return
    }
    const index = pixel.y * width + pixel.x
    onHoverColorChange?.(safePixels[index] ?? null)
  }

  const handlePointerDown = (event: ReactPointerEvent<HTMLCanvasElement>) => {
    if (event.button !== 0) return
    const pixel = resolvePixelFromPointer(event)
    if (!pixel) return

    event.preventDefault()
    event.currentTarget.setPointerCapture(event.pointerId)

    pointerDownRef.current = true
    lastDragCellKeyRef.current = `${pixel.x},${pixel.y}`
    setHoveredCell(pixel)
    updateHoverColor(pixel)
    onPaint(pixel.x, pixel.y, activeTool, "pointerDown")
  }

  const handlePointerMove = (event: ReactPointerEvent<HTMLCanvasElement>) => {
    const pixel = resolvePixelFromPointer(event)
    setHoveredCell(pixel)
    updateHoverColor(pixel)

    if (!pointerDownRef.current || !pixel) return

    const nextKey = `${pixel.x},${pixel.y}`
    if (nextKey === lastDragCellKeyRef.current) return

    lastDragCellKeyRef.current = nextKey
    onPaint(pixel.x, pixel.y, activeTool, "pointerDrag")
  }

  const finishPointerInteraction = (
    event: ReactPointerEvent<HTMLCanvasElement>,
    pixel: { x: number; y: number } | null
  ) => {
    if (!pointerDownRef.current) return

    pointerDownRef.current = false
    lastDragCellKeyRef.current = null

    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId)
    }

    if (pixel) {
      onPaint(pixel.x, pixel.y, activeTool, "pointerUp")
    } else {
      onPointerUpOutside?.()
    }
  }

  const handlePointerUp = (event: ReactPointerEvent<HTMLCanvasElement>) => {
    finishPointerInteraction(event, resolvePixelFromPointer(event))
  }

  const handlePointerCancel = (event: ReactPointerEvent<HTMLCanvasElement>) => {
    finishPointerInteraction(event, null)
  }

  return (
    <div
      ref={viewportRef}
      data-testid="sprite-canvas-viewport"
      className="mvp16-sprite-grid-wrapper min-h-0 min-w-0 flex-1 overflow-auto bg-slate-50 p-4"
    >
      <canvas
        ref={canvasRef}
        data-testid="sprite-canvas"
        className="mvp16-sprite-canvas block border border-slate-300 shadow-sm"
        style={{
          width: `${width * zoom}px`,
          height: `${height * zoom}px`,
          cursor: SPRITE_TOOL_BY_ID[activeTool]?.cursor ?? "default",
          imageRendering: "pixelated",
          touchAction: "none"
        }}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerCancel}
        onPointerLeave={() => {
          if (pointerDownRef.current) return
          setHoveredCell(null)
          onHoverColorChange?.(null)
        }}
      />
    </div>
  )
}
