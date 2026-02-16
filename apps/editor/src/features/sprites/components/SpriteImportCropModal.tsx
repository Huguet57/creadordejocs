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
const PREVIEW_CELL = 6
const MIN_CROP_PX = 4
const HANDLE_RADIUS = 7
const CANVAS_PAD = 80

type DragMode = "move" | "nw" | "ne" | "sw" | "se" | null

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value))
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
  const [dragMode, setDragMode] = useState<DragMode>(null)
  const [dragOrigin, setDragOrigin] = useState<{ mx: number; my: number; crop: CropRect } | null>(null)
  const [hoverMode, setHoverMode] = useState<DragMode>(null)

  const imgW = imageElement?.naturalWidth ?? 1
  const imgH = imageElement?.naturalHeight ?? 1

  const displayScale = Math.min(SOURCE_BOX_W / imgW, SOURCE_BOX_H / imgH, 1)
  const imgDisplayW = Math.round(imgW * displayScale)
  const imgDisplayH = Math.round(imgH * displayScale)
  const canvasW = imgDisplayW + CANVAS_PAD * 2
  const canvasH = imgDisplayH + CANVAS_PAD * 2

  const previewW = targetWidth * PREVIEW_CELL
  const previewH = targetHeight * PREVIEW_CELL

  const aspectRatio = targetWidth / targetHeight
  const maxCropDimension = Math.max(imgW, imgH) * 3

  useEffect(() => {
    if (!imageElement || !isOpen) return
    setCrop(fitAspectCrop(imageElement.naturalWidth, imageElement.naturalHeight, targetWidth, targetHeight))
    previewInitRef.current = false
  }, [imageElement, isOpen, targetWidth, targetHeight])

  const drawSource = useCallback(() => {
    const canvas = sourceCanvasRef.current
    if (!canvas || !imageElement) return
    if (canvas.width !== canvasW) canvas.width = canvasW
    if (canvas.height !== canvasH) canvas.height = canvasH
    const ctx = canvas.getContext("2d")
    if (!ctx) return
    ctx.imageSmoothingEnabled = false

    const checkerSize = 8
    for (let cy = 0; cy < canvasH; cy += checkerSize) {
      for (let cx = 0; cx < canvasW; cx += checkerSize) {
        const isLight = ((cx / checkerSize) + (cy / checkerSize)) % 2 === 0
        ctx.fillStyle = isLight ? "#ffffff" : "#e2e2e2"
        ctx.fillRect(cx, cy, checkerSize, checkerSize)
      }
    }

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
      setCrop({
        ...orig,
        x: clamp(Math.round(orig.x + dx), -(orig.width - 1), imgW - 1),
        y: clamp(Math.round(orig.y + dy), -(orig.height - 1), imgH - 1)
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

    const rawW = orig.width + signX * dx
    const newW = clamp(Math.round(Math.abs(rawW)), MIN_CROP_PX, maxCropDimension)
    const newH = clamp(Math.round(newW / aspectRatio), MIN_CROP_PX, maxCropDimension)
    const finalW = Math.round(newH * aspectRatio)

    const newX = signX > 0 ? anchorX : anchorX - finalW
    const newY = signY > 0 ? anchorY : anchorY - newH

    setCrop({ x: Math.round(newX), y: Math.round(newY), width: finalW, height: newH })
  }

  const handlePointerUp = () => {
    setDragMode(null)
    setDragOrigin(null)
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

        <div className="mvp16-import-crop-body flex flex-1 gap-4 overflow-auto p-4">
          <div className="mvp16-import-crop-source flex flex-col items-center gap-2">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Imatge original</span>
            <div
              className="mvp16-import-crop-source-box flex items-center justify-center overflow-hidden rounded border border-slate-200 bg-slate-100"
              style={{ width: SOURCE_BOX_W, height: SOURCE_BOX_H }}
            >
              <canvas
                ref={sourceCanvasRef}
                className="mvp16-import-crop-canvas"
                style={{ width: canvasW, height: canvasH, cursor: activeCursor }}
                onMouseDown={handlePointerDown}
                onMouseMove={handlePointerMove}
                onMouseUp={handlePointerUp}
                onMouseLeave={handlePointerUp}
              />
            </div>
            <p className="text-[10px] text-slate-400">
              Crop: {crop.width} x {crop.height} px
            </p>
          </div>

          <div className="mvp16-import-crop-preview flex flex-col items-center justify-center gap-2">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Resultat esperat</span>
            <div
              className="mvp16-import-crop-preview-box flex items-center justify-center rounded border border-slate-200 bg-slate-100 p-2"
              style={{ width: previewW + 16, height: previewH + 16 }}
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
            <p className="text-[10px] text-slate-400">{targetWidth} x {targetHeight} px (nearest-neighbor)</p>
          </div>
        </div>

        <div className="mvp16-import-crop-footer flex justify-end gap-2 border-t border-slate-200 px-4 py-3">
          <Button variant="outline" size="sm" className="h-8" onClick={onCancel}>Cancel·lar</Button>
          <Button size="sm" className="h-8" onClick={() => onConfirm(crop)}>Confirmar i importar</Button>
        </div>
      </div>
    </div>
  )
}
