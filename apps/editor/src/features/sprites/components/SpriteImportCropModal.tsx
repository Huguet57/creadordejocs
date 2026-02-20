import { useCallback, useEffect, useRef, useState } from "react"
import { Button } from "../../../components/ui/button.js"
import type { CropRect } from "../utils/image-to-pixels.js"

type SpriteImportCropModalProps = {
  isOpen: boolean
  imageElement: HTMLImageElement | null
  targetWidth: number
  targetHeight: number
  onConfirm: (crop: CropRect) => void
  onCancel: () => void
}

const SOURCE_BOX_W = 440
const SOURCE_BOX_H = 400
const PREVIEW_CELL_DEFAULT = 6
const PREVIEW_MAX_W = 220
const PREVIEW_MAX_H = 220
const PREVIEW_MIN_CELL = 0.1
const MIN_CROP_PX = 4
const HANDLE_RADIUS = 7
const CANVAS_PAD = 80
const SQUARE_IMAGE_INITIAL_MARGIN_RATIO = 0.1
const MAX_OUTSIDE_RATIO = 0.1
const MAX_DISPLAY_PX_PER_SRC_PX = 16
const MAX_CANVAS_DIM = 8192

type DragMode = "move" | "nw" | "ne" | "sw" | "se" | null

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value))
}

export function resolvePreviewCellSize(targetWidth: number, targetHeight: number): number {
  if (!Number.isFinite(targetWidth) || !Number.isFinite(targetHeight) || targetWidth <= 0 || targetHeight <= 0) {
    return PREVIEW_CELL_DEFAULT
  }

  const maxCellByWidth = PREVIEW_MAX_W / targetWidth
  const maxCellByHeight = PREVIEW_MAX_H / targetHeight
  return clamp(Math.min(PREVIEW_CELL_DEFAULT, maxCellByWidth, maxCellByHeight), PREVIEW_MIN_CELL, PREVIEW_CELL_DEFAULT)
}

function fitAspectCrop(
  imgWidth: number,
  imgHeight: number,
  aspectW: number,
  aspectH: number
): CropRect {
  const ratio = aspectW / aspectH
  let cropW = imgWidth
  let cropH = cropW / ratio
  if (cropH > imgHeight) {
    cropH = imgHeight
    cropW = cropH * ratio
  }
  
  return {
    x: Math.round((imgWidth - cropW) / 2),
    y: Math.round((imgHeight - cropH) / 2),
    width: Math.round(cropW),
    height: Math.round(cropH)
  }
}

function hitTestHandle(
  mx: number,
  my: number,
  crop: CropRect,
  scale: number,
  pad: number
): DragMode {
  const rx = pad + crop.x * scale
  const ry = pad + crop.y * scale
  const rw = crop.width * scale
  const rh = crop.height * scale
  const hr = HANDLE_RADIUS + 4

  const corners: { mode: DragMode; cx: number; cy: number }[] = [
    { mode: "nw", cx: rx, cy: ry },
    { mode: "ne", cx: rx + rw, cy: ry },
    { mode: "sw", cx: rx, cy: ry + rh },
    { mode: "se", cx: rx + rw, cy: ry + rh }
  ]

  for (const corner of corners) {
    if (Math.abs(mx - corner.cx) <= hr && Math.abs(my - corner.cy) <= hr) {
      return corner.mode
    }
  }

  if (mx >= rx && mx <= rx + rw && my >= ry && my <= ry + rh) {
    return "move"
  }

  return null
}

function cursorForMode(mode: DragMode): string {
  if (mode === "nw" || mode === "se") return "nwse-resize"
  if (mode === "ne" || mode === "sw") return "nesw-resize"
  if (mode === "move") return "move"
  return "default"
}

export function SpriteImportCropModal({
  isOpen,
  imageElement,
  targetWidth,
  targetHeight,
  onConfirm,
  onCancel
}: SpriteImportCropModalProps) {
  const sourceCanvasRef = useRef<HTMLCanvasElement | null>(null)
  const previewCanvasRef = useRef<HTMLCanvasElement | null>(null)
  const previewInitRef = useRef(false)

  const [crop, setCrop] = useState<CropRect>({ x: 0, y: 0, width: 1, height: 1 })
  const initialCropRef = useRef<CropRect>({ x: 0, y: 0, width: 1, height: 1 })
  const [dragMode, setDragMode] = useState<DragMode>(null)
  const [dragOrigin, setDragOrigin] = useState<{ mx: number; my: number; crop: CropRect } | null>(null)
  const [hoverMode, setHoverMode] = useState<DragMode>(null)
  const [zoomLevel, setZoomLevel] = useState(1)
  const sourceBoxRef = useRef<HTMLDivElement | null>(null)

  const imgW = imageElement?.naturalWidth ?? 1
  const imgH = imageElement?.naturalHeight ?? 1

  const isSquareImg = imgW === imgH
  const effectiveW = isSquareImg ? imgW * (1 + 2 * SQUARE_IMAGE_INITIAL_MARGIN_RATIO) : imgW
  const effectiveH = isSquareImg ? imgH * (1 + 2 * SQUARE_IMAGE_INITIAL_MARGIN_RATIO) : imgH
  const baseScale = Math.min(SOURCE_BOX_W / effectiveW, SOURCE_BOX_H / effectiveH, 1)
  const displayScale = baseScale * zoomLevel
  const imgDisplayW = Math.round(imgW * displayScale)
  const imgDisplayH = Math.round(imgH * displayScale)
  const canvasW = imgDisplayW + CANVAS_PAD * 2
  const canvasH = imgDisplayH + CANVAS_PAD * 2

  const maxZoomRaw = MAX_DISPLAY_PX_PER_SRC_PX / baseScale
  const maxZoomByCanvas = (MAX_CANVAS_DIM - CANVAS_PAD * 2) / (Math.max(imgW, imgH) * baseScale)
  const maxZoom = Math.max(2, Math.min(maxZoomRaw, maxZoomByCanvas, 40))
  const zoomStep = maxZoom <= 5 ? 0.25 : maxZoom <= 12 ? 0.5 : 1

  const previewCell = resolvePreviewCellSize(targetWidth, targetHeight)
  const previewW = Math.max(1, Math.round(targetWidth * previewCell))
  const previewH = Math.max(1, Math.round(targetHeight * previewCell))

  const aspectRatio = targetWidth / targetHeight
  const maxCropDimension = Math.max(imgW, imgH) * 3

  useEffect(() => {
    if (!imageElement || !isOpen) return
    const initial = fitAspectCrop(imageElement.naturalWidth, imageElement.naturalHeight, targetWidth, targetHeight)
    initialCropRef.current = initial
    setCrop(initial)
    setZoomLevel(1)
    previewInitRef.current = false
  }, [imageElement, isOpen, targetWidth, targetHeight])

  useEffect(() => {
    const box = sourceBoxRef.current
    if (!box) return
    const s = baseScale * zoomLevel
    box.scrollLeft = Math.max(0, CANVAS_PAD + (crop.x + crop.width / 2) * s - SOURCE_BOX_W / 2)
    box.scrollTop = Math.max(0, CANVAS_PAD + (crop.y + crop.height / 2) * s - SOURCE_BOX_H / 2)
  }, [zoomLevel]) // intentionally only zoomLevel — avoid re-centering on every crop drag

  const isInitialCrop = crop.x === initialCropRef.current.x
    && crop.y === initialCropRef.current.y
    && crop.width === initialCropRef.current.width
    && crop.height === initialCropRef.current.height

  const resetCrop = () => {
    setCrop(initialCropRef.current)
  }

  const drawSource = useCallback(() => {
    const canvas = sourceCanvasRef.current
    if (!canvas || !imageElement) return
    if (canvas.width !== canvasW) canvas.width = canvasW
    if (canvas.height !== canvasH) canvas.height = canvasH
    const ctx = canvas.getContext("2d")
    if (!ctx) return
    ctx.imageSmoothingEnabled = false

    const checkerTile = document.createElement("canvas")
    checkerTile.width = 16
    checkerTile.height = 16
    const cCtx = checkerTile.getContext("2d")!
    cCtx.fillStyle = "#ffffff"
    cCtx.fillRect(0, 0, 16, 16)
    cCtx.fillStyle = "#e2e2e2"
    cCtx.fillRect(8, 0, 8, 8)
    cCtx.fillRect(0, 8, 8, 8)
    const checkerPattern = ctx.createPattern(checkerTile, "repeat")!
    ctx.fillStyle = checkerPattern
    ctx.fillRect(0, 0, canvasW, canvasH)

    ctx.globalAlpha = 0.35
    ctx.drawImage(imageElement, CANVAS_PAD, CANVAS_PAD, imgDisplayW, imgDisplayH)
    ctx.globalAlpha = 1.0

    const rx = CANVAS_PAD + crop.x * displayScale
    const ry = CANVAS_PAD + crop.y * displayScale
    const rw = crop.width * displayScale
    const rh = crop.height * displayScale

    ctx.save()
    ctx.beginPath()
    ctx.rect(rx, ry, rw, rh)
    ctx.clip()
    ctx.drawImage(imageElement, CANVAS_PAD, CANVAS_PAD, imgDisplayW, imgDisplayH)
    ctx.restore()

    ctx.strokeStyle = "#4F46E5"
    ctx.lineWidth = 2
    ctx.setLineDash([5, 3])
    ctx.strokeRect(rx, ry, rw, rh)
    ctx.setLineDash([])

    const corners = [
      [rx, ry],
      [rx + rw, ry],
      [rx, ry + rh],
      [rx + rw, ry + rh]
    ]
    for (const [cx, cy] of corners) {
      ctx.fillStyle = "#FFFFFF"
      ctx.strokeStyle = "#4F46E5"
      ctx.lineWidth = 2
      ctx.beginPath()
      ctx.arc(cx ?? 0, cy ?? 0, HANDLE_RADIUS, 0, Math.PI * 2)
      ctx.fill()
      ctx.stroke()
    }
  }, [canvasH, canvasW, crop, displayScale, imageElement, imgDisplayH, imgDisplayW])

  const drawPreview = useCallback(() => {
    const canvas = previewCanvasRef.current
    if (!canvas || !imageElement) return
    if (!previewInitRef.current) {
      canvas.width = previewW
      canvas.height = previewH
      previewInitRef.current = true
    }
    const ctx = canvas.getContext("2d")
    if (!ctx) return
    ctx.imageSmoothingEnabled = false
    ctx.clearRect(0, 0, previewW, previewH)

    const checkerSize = 8
    for (let py = 0; py < previewH; py += checkerSize) {
      for (let px = 0; px < previewW; px += checkerSize) {
        const isLight = ((px / checkerSize) + (py / checkerSize)) % 2 === 0
        ctx.fillStyle = isLight ? "#ffffff" : "#e2e2e2"
        ctx.fillRect(px, py, checkerSize, checkerSize)
      }
    }

    const tiny = document.createElement("canvas")
    tiny.width = targetWidth
    tiny.height = targetHeight
    const tinyCtx = tiny.getContext("2d")
    if (!tinyCtx) return
    tinyCtx.imageSmoothingEnabled = false
    tinyCtx.clearRect(0, 0, targetWidth, targetHeight)
    tinyCtx.drawImage(imageElement, crop.x, crop.y, crop.width, crop.height, 0, 0, targetWidth, targetHeight)

    ctx.drawImage(tiny, 0, 0, targetWidth, targetHeight, 0, 0, previewW, previewH)
  }, [crop, imageElement, previewH, previewW, targetWidth, targetHeight])

  useEffect(() => {
    drawSource()
    drawPreview()
  }, [drawSource, drawPreview])

  const getCanvasCoords = (event: React.MouseEvent<HTMLCanvasElement>): { mx: number; my: number } => {
    const canvas = sourceCanvasRef.current
    if (!canvas) return { mx: 0, my: 0 }
    const rect = canvas.getBoundingClientRect()
    const scaleX = canvas.width / rect.width
    const scaleY = canvas.height / rect.height
    return {
      mx: (event.clientX - rect.left) * scaleX,
      my: (event.clientY - rect.top) * scaleY
    }
  }

  const handlePointerDown = (event: React.MouseEvent<HTMLCanvasElement>) => {
    event.preventDefault()
    const { mx, my } = getCanvasCoords(event)
    const mode = hitTestHandle(mx, my, crop, displayScale, CANVAS_PAD)
    if (!mode) return
    setDragMode(mode)
    setDragOrigin({ mx: event.clientX, my: event.clientY, crop: { ...crop } })
    if (sourceBoxRef.current) sourceBoxRef.current.style.overflow = "hidden"
  }

  const handlePointerMove = (event: React.MouseEvent<HTMLCanvasElement>) => {
    if (!dragMode || !dragOrigin) {
      const { mx, my } = getCanvasCoords(event)
      setHoverMode(hitTestHandle(mx, my, crop, displayScale, CANVAS_PAD))
      return
    }

    const dxPx = event.clientX - dragOrigin.mx
    const dyPx = event.clientY - dragOrigin.my
    const dx = dxPx / displayScale
    const dy = dyPx / displayScale
    const orig = dragOrigin.crop

    if (dragMode === "move") {
      const marginX = Math.round(imgW * MAX_OUTSIDE_RATIO)
      const marginY = Math.round(imgH * MAX_OUTSIDE_RATIO)
      setCrop({
        ...orig,
        x: clamp(Math.round(orig.x + dx), -marginX, imgW - orig.width + marginX),
        y: clamp(Math.round(orig.y + dy), -marginY, imgH - orig.height + marginY)
      })
      return
    }

    let anchorX: number
    let anchorY: number
    let signX: number
    let signY: number

    if (dragMode === "nw") {
      anchorX = orig.x + orig.width
      anchorY = orig.y + orig.height
      signX = -1
      signY = -1
    } else if (dragMode === "ne") {
      anchorX = orig.x
      anchorY = orig.y + orig.height
      signX = 1
      signY = -1
    } else if (dragMode === "sw") {
      anchorX = orig.x + orig.width
      anchorY = orig.y
      signX = -1
      signY = 1
    } else {
      anchorX = orig.x
      anchorY = orig.y
      signX = 1
      signY = 1
    }

    const marginX = Math.round(imgW * MAX_OUTSIDE_RATIO)
    const marginY = Math.round(imgH * MAX_OUTSIDE_RATIO)

    const rawW = orig.width + signX * dx
    const newW = clamp(Math.round(Math.abs(rawW)), MIN_CROP_PX, maxCropDimension)
    const newH = clamp(Math.round(newW / aspectRatio), MIN_CROP_PX, maxCropDimension)
    let finalW = Math.round(newH * aspectRatio)

    let newX = signX > 0 ? anchorX : anchorX - finalW
    let newY = signY > 0 ? anchorY : anchorY - newH

    if (newX < -marginX) {
      newX = -marginX
      finalW = signX > 0 ? finalW : anchorX + marginX
    }
    if (newY < -marginY) {
      newY = -marginY
    }
    if (newX + finalW > imgW + marginX) {
      finalW = imgW + marginX - newX
    }

    const clampedH = Math.max(MIN_CROP_PX, Math.round(finalW / aspectRatio))
    const clampedW = Math.round(clampedH * aspectRatio)

    if (signX <= 0) newX = anchorX - clampedW
    if (signY <= 0) newY = anchorY - clampedH

    newX = clamp(Math.round(newX), -marginX, imgW + marginX - clampedW)
    newY = clamp(Math.round(newY), -marginY, imgH + marginY - clampedH)

    setCrop({ x: newX, y: newY, width: clampedW, height: clampedH })
  }

  const handlePointerUp = () => {
    setDragMode(null)
    setDragOrigin(null)
    if (sourceBoxRef.current) sourceBoxRef.current.style.overflow = "auto"
  }

  if (!isOpen || !imageElement) return null

  const activeCursor = dragMode ? cursorForMode(dragMode) : cursorForMode(hoverMode)

  return (
    <div className="mvp16-import-crop-overlay fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
      <div className="mvp16-import-crop-modal flex max-h-[90vh] w-full max-w-3xl flex-col overflow-hidden rounded-lg border border-slate-200 bg-white shadow-xl">
        <div className="mvp16-import-crop-header border-b border-slate-200 px-4 py-3">
          <h2 className="text-sm font-semibold text-slate-900">Crop i ajust d&apos;importació</h2>
          <p className="text-xs text-slate-500">
            Resultat: {targetWidth} x {targetHeight} px &mdash; Arrossega les cantonades per redimensionar, el centre per moure
          </p>
        </div>

        <div className="mvp16-import-crop-body flex flex-1 items-center justify-center gap-6 overflow-auto p-4">
          <div className="mvp16-import-crop-source flex flex-col items-center gap-2">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Imatge original</span>
            <div
              ref={sourceBoxRef}
              className="mvp16-import-crop-source-box border border-slate-200"
              style={{ width: SOURCE_BOX_W, height: SOURCE_BOX_H, overflow: "auto" }}
            >
              <canvas
                ref={sourceCanvasRef}
                className="mvp16-import-crop-canvas block"
                style={{ width: canvasW, height: canvasH, cursor: activeCursor, margin: "auto" }}
                onMouseDown={handlePointerDown}
                onMouseMove={handlePointerMove}
                onMouseUp={handlePointerUp}
                onMouseLeave={handlePointerUp}
              />
            </div>
            <div className="flex items-center gap-2 text-[10px] text-slate-500">
              <span className="font-medium">Zoom</span>
              <input
                type="range"
                min={1}
                max={maxZoom}
                step={zoomStep}
                value={zoomLevel}
                disabled={dragMode !== null}
                onChange={(e) => setZoomLevel(Number(e.target.value))}
                className="w-28"
              />
              <span className="w-10 text-right tabular-nums">{Math.round(zoomLevel * 100)}%</span>
            </div>
            <p className="text-[10px] text-slate-400">
              Crop: {crop.width} x {crop.height} px
            </p>
          </div>

          <div className="mvp16-import-crop-arrow flex items-center text-slate-300">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M5 12h14" />
              <path d="m12 5 7 7-7 7" />
            </svg>
          </div>

          <div className="mvp16-import-crop-preview flex flex-col items-center justify-center gap-2">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Resultat esperat</span>
            <div
              className="mvp16-import-crop-preview-box flex items-center justify-center overflow-hidden border border-slate-200"
              style={{ width: previewW, height: previewH }}
            >
              <canvas
                ref={previewCanvasRef}
                className="mvp16-import-crop-preview-canvas"
                style={{
                  width: previewW,
                  height: previewH,
                  imageRendering: "pixelated"
                }}
              />
            </div>
            <p className="text-[10px] text-slate-400">{targetWidth} x {targetHeight} px</p>
          </div>
        </div>

        <div className="mvp16-import-crop-footer flex items-center justify-between border-t border-slate-200 px-4 py-3">
          <Button variant="outline" size="sm" className="h-8" disabled={isInitialCrop} onClick={resetCrop}>Reset crop</Button>
          <div className="mvp16-import-crop-footer-actions flex gap-2">
            <Button variant="outline" size="sm" className="h-8" onClick={onCancel}>Cancel·lar</Button>
            <Button size="sm" className="h-8" onClick={() => onConfirm(crop)}>Confirmar i importar</Button>
          </div>
        </div>
      </div>
    </div>
  )
}
