import { useCallback, useEffect, useMemo, useRef, useState, type PointerEvent as ReactPointerEvent } from "react"
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
type HoveredCell = { x: number; y: number }
type CanvasSizing = {
  cssWidth: number
  cssHeight: number
  pixelWidth: number
  pixelHeight: number
  devicePixelRatio: number
}

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
  onHoverColorChange?: ((color: string | null) => void) | undefined
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

function getDevicePixelRatio(): number {
  if (typeof window === "undefined") return 1
  return Math.max(1, window.devicePixelRatio || 1)
}

function resolveCanvasSizing(width: number, height: number, zoom: number, devicePixelRatio: number): CanvasSizing {
  const cssWidth = Math.max(1, width * zoom)
  const cssHeight = Math.max(1, height * zoom)
  const normalizedDevicePixelRatio = Math.max(1, devicePixelRatio)

  return {
    cssWidth,
    cssHeight,
    pixelWidth: Math.max(1, Math.round(cssWidth * normalizedDevicePixelRatio)),
    pixelHeight: Math.max(1, Math.round(cssHeight * normalizedDevicePixelRatio)),
    devicePixelRatio: normalizedDevicePixelRatio
  }
}

function syncCanvasSize(canvas: HTMLCanvasElement, sizing: CanvasSizing): boolean {
  if (canvas.width === sizing.pixelWidth && canvas.height === sizing.pixelHeight) {
    return false
  }
  canvas.width = sizing.pixelWidth
  canvas.height = sizing.pixelHeight
  return true
}

function isSameCell(previous: HoveredCell | null, next: HoveredCell | null): boolean {
  if (previous === next) return true
  if (!previous || !next) return false
  return previous.x === next.x && previous.y === next.y
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
  const [devicePixelRatio, setDevicePixelRatio] = useState<number>(() => getDevicePixelRatio())
  const viewportRef = useRef<HTMLDivElement | null>(null)
  const baseCanvasRef = useRef<HTMLCanvasElement | null>(null)
  const overlayCanvasRef = useRef<HTMLCanvasElement | null>(null)
  const sourceCanvasRef = useRef<HTMLCanvasElement | null>(null)
  const imageDataRef = useRef<ImageData | null>(null)
  const hoveredCellRef = useRef<HoveredCell | null>(null)
  const pointerDownRef = useRef(false)
  const lastDragCellKeyRef = useRef<string | null>(null)
  const overlayRafRef = useRef<number | null>(null)
  const overlayDrawRef = useRef<() => void>(() => undefined)
  const lastHoverColorRef = useRef<string | null>(null)
  const colorChannelCacheRef = useRef<Map<string, ColorChannels>>(new Map())
  const checkerPatternCacheRef = useRef<Map<number, CanvasPattern | null>>(new Map())

  const safePixels = useMemo(() => {
    const expectedPixelCount = width * height
    if (pixelsRgba.length === expectedPixelCount) {
      return pixelsRgba
    }
    return normalizePixelGrid(pixelsRgba, width, height)
  }, [pixelsRgba, width, height])

  const pixelBytes = useMemo(() => {
    const bytes = new Uint8ClampedArray(safePixels.length * 4)
    const cache = colorChannelCacheRef.current
    for (let i = 0; i < safePixels.length; i++) {
      const color = safePixels[i] ?? "#00000000"
      const [r, g, b, a] = getColorChannels(color, cache)
      const offset = i * 4
      bytes[offset] = r
      bytes[offset + 1] = g
      bytes[offset + 2] = b
      bytes[offset + 3] = a
    }
    return bytes
  }, [safePixels])

  const dragBounds = useMemo(() => resolveDragBounds(selectDragRect), [selectDragRect])
  const canvasSizing = useMemo(
    () => resolveCanvasSizing(width, height, zoom, devicePixelRatio),
    [width, height, zoom, devicePixelRatio]
  )

  useEffect(() => {
    onViewportElementChange?.(viewportRef.current)
    return () => onViewportElementChange?.(null)
  }, [onViewportElementChange])

  useEffect(() => {
    if (typeof window === "undefined") return

    const updateDevicePixelRatio = () => {
      const nextRatio = getDevicePixelRatio()
      setDevicePixelRatio((currentRatio) => (currentRatio === nextRatio ? currentRatio : nextRatio))
    }

    updateDevicePixelRatio()
    window.addEventListener("resize", updateDevicePixelRatio)
    return () => window.removeEventListener("resize", updateDevicePixelRatio)
  }, [])

  const drawBaseCanvas = useCallback(() => {
    const canvas = baseCanvasRef.current
    if (!canvas || width <= 0 || height <= 0 || zoom <= 0 || typeof window === "undefined") {
      return
    }

    const didResize = syncCanvasSize(canvas, canvasSizing)
    if (didResize) {
      checkerPatternCacheRef.current.clear()
    }

    const ctx = canvas.getContext("2d")
    if (!ctx) return

    ctx.setTransform(canvasSizing.devicePixelRatio, 0, 0, canvasSizing.devicePixelRatio, 0, 0)
    ctx.clearRect(0, 0, canvasSizing.cssWidth, canvasSizing.cssHeight)

    const checkerSize = Math.max(zoom, MIN_CHECKER_SIZE)
    let checkerPattern = checkerPatternCacheRef.current.get(checkerSize)
    if (checkerPattern === undefined) {
      checkerPattern = createCheckerPattern(ctx, checkerSize)
      checkerPatternCacheRef.current.set(checkerSize, checkerPattern)
    }

    if (checkerPattern) {
      ctx.fillStyle = checkerPattern
      ctx.fillRect(0, 0, canvasSizing.cssWidth, canvasSizing.cssHeight)
    } else {
      ctx.fillStyle = "#ffffff"
      ctx.fillRect(0, 0, canvasSizing.cssWidth, canvasSizing.cssHeight)
    }

    sourceCanvasRef.current ??= document.createElement("canvas")
    const sourceCanvas = sourceCanvasRef.current
    if (sourceCanvas.width !== width || sourceCanvas.height !== height) {
      sourceCanvas.width = width
      sourceCanvas.height = height
      imageDataRef.current = null
    }

    const sourceCtx = sourceCanvas.getContext("2d")
    if (!sourceCtx) return

    if (imageDataRef.current?.width !== width || imageDataRef.current?.height !== height) {
      imageDataRef.current = sourceCtx.createImageData(width, height)
    }

    const imageData = imageDataRef.current
    if (!imageData) return
    imageData.data.set(pixelBytes)
    sourceCtx.putImageData(imageData, 0, 0)

    ctx.imageSmoothingEnabled = false
    ctx.drawImage(sourceCanvas, 0, 0, canvasSizing.cssWidth, canvasSizing.cssHeight)

    if (showGrid && zoom >= MIN_GRID_ZOOM) {
      drawGrid(ctx, width, height, zoom)
    }
  }, [canvasSizing, height, pixelBytes, showGrid, width, zoom])

  const drawOverlayCanvas = useCallback(() => {
    const canvas = overlayCanvasRef.current
    if (!canvas || width <= 0 || height <= 0 || zoom <= 0 || typeof window === "undefined") {
      return
    }

    syncCanvasSize(canvas, canvasSizing)

    const ctx = canvas.getContext("2d")
    if (!ctx) return

    ctx.setTransform(canvasSizing.devicePixelRatio, 0, 0, canvasSizing.devicePixelRatio, 0, 0)
    ctx.clearRect(0, 0, canvasSizing.cssWidth, canvasSizing.cssHeight)

    const hoveredCell = hoveredCellRef.current
    if (activeTool === "eraser" && hoveredCell) {
      const eraserPreviewIndices = getPixelIndicesInRadius(hoveredCell.x, hoveredCell.y, eraserRadius, width, height)
      for (const selectedIndex of eraserPreviewIndices) {
        const x = selectedIndex % width
        const y = Math.floor(selectedIndex / width)
        drawCellOverlay(ctx, x, y, zoom, ERASER_PREVIEW_FILL, null)
      }
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
  }, [activeTool, canvasSizing, dragBounds, eraserRadius, height, selectedIndices, width, zoom])

  useEffect(() => {
    overlayDrawRef.current = drawOverlayCanvas
  }, [drawOverlayCanvas])

  const scheduleOverlayRender = useCallback(() => {
    if (overlayRafRef.current !== null) return
    if (typeof window === "undefined") {
      overlayDrawRef.current()
      return
    }

    overlayRafRef.current = window.requestAnimationFrame(() => {
      overlayRafRef.current = null
      overlayDrawRef.current()
    })
  }, [])

  const setHoveredCell = useCallback((nextCell: HoveredCell | null): boolean => {
    if (isSameCell(hoveredCellRef.current, nextCell)) {
      return false
    }
    hoveredCellRef.current = nextCell
    return true
  }, [])

  const emitHoverColor = useCallback(
    (pixel: HoveredCell | null) => {
      if (activeTool !== "color_picker" || !onHoverColorChange) {
        lastHoverColorRef.current = null
        return
      }

      const index = pixel ? pixel.y * width + pixel.x : -1
      const nextColor = index >= 0 ? (safePixels[index] ?? null) : null
      if (nextColor === lastHoverColorRef.current) {
        return
      }

      lastHoverColorRef.current = nextColor
      onHoverColorChange(nextColor)
    },
    [activeTool, onHoverColorChange, safePixels, width]
  )

  useEffect(() => {
    drawBaseCanvas()
  }, [drawBaseCanvas])

  useEffect(() => {
    scheduleOverlayRender()
  }, [drawOverlayCanvas, scheduleOverlayRender])

  useEffect(() => {
    return () => {
      if (overlayRafRef.current !== null && typeof window !== "undefined") {
        window.cancelAnimationFrame(overlayRafRef.current)
      }
    }
  }, [])

  const resolvePixelFromPointer = useCallback((event: ReactPointerEvent<HTMLCanvasElement>): HoveredCell | null => {
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
  }, [height, width, zoom])

  const handlePointerDown = (event: ReactPointerEvent<HTMLCanvasElement>) => {
    if (event.button !== 0) return
    const pixel = resolvePixelFromPointer(event)
    if (!pixel) return

    event.preventDefault()
    event.currentTarget.setPointerCapture(event.pointerId)

    pointerDownRef.current = true
    lastDragCellKeyRef.current = `${pixel.x},${pixel.y}`
    setHoveredCell(pixel)
    emitHoverColor(pixel)
    scheduleOverlayRender()
    onPaint(pixel.x, pixel.y, activeTool, "pointerDown")
  }

  const handlePointerMove = (event: ReactPointerEvent<HTMLCanvasElement>) => {
    const pixel = resolvePixelFromPointer(event)
    if (setHoveredCell(pixel)) {
      emitHoverColor(pixel)
      scheduleOverlayRender()
    }

    if (!pointerDownRef.current || !pixel) return

    const nextKey = `${pixel.x},${pixel.y}`
    if (nextKey === lastDragCellKeyRef.current) return

    lastDragCellKeyRef.current = nextKey
    onPaint(pixel.x, pixel.y, activeTool, "pointerDrag")
  }

  const finishPointerInteraction = (
    event: ReactPointerEvent<HTMLCanvasElement>,
    pixel: HoveredCell | null
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
    const pixel = resolvePixelFromPointer(event)
    if (setHoveredCell(pixel)) {
      emitHoverColor(pixel)
      scheduleOverlayRender()
    }
    finishPointerInteraction(event, pixel)
  }

  const handlePointerCancel = (event: ReactPointerEvent<HTMLCanvasElement>) => {
    if (setHoveredCell(null)) {
      emitHoverColor(null)
      scheduleOverlayRender()
    }
    finishPointerInteraction(event, null)
  }

  return (
    <div
      ref={viewportRef}
      data-testid="sprite-canvas-viewport"
      className="mvp16-sprite-grid-wrapper min-h-0 min-w-0 flex-1 overflow-auto bg-slate-50 p-4"
    >
      <div
        data-testid="sprite-canvas-overlay"
        className="relative block border border-slate-300 shadow-sm"
        style={{ width: `${canvasSizing.cssWidth}px`, height: `${canvasSizing.cssHeight}px` }}
      >
        <canvas
          ref={baseCanvasRef}
          data-testid="sprite-canvas-base"
          className="pointer-events-none absolute inset-0 block"
          style={{
            width: `${canvasSizing.cssWidth}px`,
            height: `${canvasSizing.cssHeight}px`,
            imageRendering: "pixelated"
          }}
        />
        <canvas
          ref={overlayCanvasRef}
          data-testid="sprite-canvas"
          className="mvp16-sprite-canvas absolute inset-0 block"
          style={{
            width: `${canvasSizing.cssWidth}px`,
            height: `${canvasSizing.cssHeight}px`,
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
            if (setHoveredCell(null)) {
              emitHoverColor(null)
              scheduleOverlayRender()
            }
          }}
        />
      </div>
    </div>
  )
}
