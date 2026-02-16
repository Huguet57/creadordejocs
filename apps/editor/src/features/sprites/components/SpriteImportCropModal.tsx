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

const CANVAS_MAX = 460
const PREVIEW_CELL = 6
const MIN_CROP_PX = 4

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

  const [crop, setCrop] = useState<CropRect>({ x: 0, y: 0, width: 1, height: 1 })
  const [zoom, setZoom] = useState(1)
  const [isDragging, setIsDragging] = useState(false)
  const [dragStart, setDragStart] = useState<{ mx: number; my: number; cx: number; cy: number } | null>(null)

  const imgW = imageElement?.naturalWidth ?? 1
  const imgH = imageElement?.naturalHeight ?? 1
  const displayScale = Math.min(CANVAS_MAX / imgW, CANVAS_MAX / imgH, 1) * zoom
  const canvasW = Math.round(imgW * displayScale)
  const canvasH = Math.round(imgH * displayScale)

  useEffect(() => {
    if (!imageElement || !isOpen) return
    setCrop(fitAspectCrop(imageElement.naturalWidth, imageElement.naturalHeight, targetWidth, targetHeight))
    setZoom(1)
  }, [imageElement, isOpen, targetWidth, targetHeight])

  const drawSource = useCallback(() => {
    const canvas = sourceCanvasRef.current
    if (!canvas || !imageElement) return
    canvas.width = canvasW
    canvas.height = canvasH
    const ctx = canvas.getContext("2d")
    if (!ctx) return
    ctx.imageSmoothingEnabled = false
    ctx.clearRect(0, 0, canvasW, canvasH)
    ctx.drawImage(imageElement, 0, 0, canvasW, canvasH)

    ctx.fillStyle = "rgba(0,0,0,0.45)"
    ctx.fillRect(0, 0, canvasW, canvasH)

    const rx = crop.x * displayScale
    const ry = crop.y * displayScale
    const rw = crop.width * displayScale
    const rh = crop.height * displayScale
    ctx.clearRect(rx, ry, rw, rh)
    ctx.drawImage(imageElement, crop.x, crop.y, crop.width, crop.height, rx, ry, rw, rh)

    ctx.strokeStyle = "#4F46E5"
    ctx.lineWidth = 2
    ctx.setLineDash([4, 4])
    ctx.strokeRect(rx, ry, rw, rh)
    ctx.setLineDash([])
  }, [canvasH, canvasW, crop, displayScale, imageElement])

  const drawPreview = useCallback(() => {
    const canvas = previewCanvasRef.current
    if (!canvas || !imageElement) return
    const pw = targetWidth * PREVIEW_CELL
    const ph = targetHeight * PREVIEW_CELL
    canvas.width = pw
    canvas.height = ph
    const ctx = canvas.getContext("2d")
    if (!ctx) return
    ctx.imageSmoothingEnabled = false
    ctx.clearRect(0, 0, pw, ph)
    ctx.drawImage(imageElement, crop.x, crop.y, crop.width, crop.height, 0, 0, pw, ph)
  }, [crop, imageElement, targetHeight, targetWidth])

  useEffect(() => {
    drawSource()
    drawPreview()
  }, [drawSource, drawPreview])

  const handlePointerDown = (event: React.MouseEvent<HTMLCanvasElement>) => {
    event.preventDefault()
    setIsDragging(true)
    setDragStart({
      mx: event.clientX,
      my: event.clientY,
      cx: crop.x,
      cy: crop.y
    })
  }

  const handlePointerMove = (event: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDragging || !dragStart) return
    const dx = (event.clientX - dragStart.mx) / displayScale
    const dy = (event.clientY - dragStart.my) / displayScale
    setCrop((prev) => ({
      ...prev,
      x: clamp(Math.round(dragStart.cx + dx), 0, imgW - prev.width),
      y: clamp(Math.round(dragStart.cy + dy), 0, imgH - prev.height)
    }))
  }

  const handlePointerUp = () => {
    setIsDragging(false)
    setDragStart(null)
  }

  const handleCropResize = (delta: number) => {
    setCrop((prev) => {
      const ratio = targetWidth / targetHeight
      const newW = clamp(prev.width + delta, MIN_CROP_PX, imgW)
      const newH = Math.round(newW / ratio)
      if (newH < MIN_CROP_PX || newH > imgH) return prev
      const x = clamp(prev.x, 0, imgW - newW)
      const y = clamp(prev.y, 0, imgH - newH)
      return { x, y, width: newW, height: newH }
    })
  }

  if (!isOpen || !imageElement) return null

  return (
    <div className="mvp16-import-crop-overlay fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
      <div className="mvp16-import-crop-modal flex max-h-[90vh] w-full max-w-3xl flex-col overflow-hidden rounded-lg border border-slate-200 bg-white shadow-xl">
        <div className="mvp16-import-crop-header border-b border-slate-200 px-4 py-3">
          <h2 className="text-sm font-semibold text-slate-900">Crop i ajust d'importació</h2>
          <p className="text-xs text-slate-500">
            Resultat: {targetWidth} x {targetHeight} px &mdash; Arrossega el requadre per reposicionar
          </p>
        </div>

        <div className="mvp16-import-crop-body flex flex-1 gap-4 overflow-auto p-4">
          <div className="mvp16-import-crop-source flex flex-col items-center gap-2">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Imatge original</span>
            <div className="overflow-auto rounded border border-slate-200 bg-slate-100" style={{ maxWidth: CANVAS_MAX + 20, maxHeight: CANVAS_MAX + 20 }}>
              <canvas
                ref={sourceCanvasRef}
                className="mvp16-import-crop-canvas cursor-move"
                style={{ width: canvasW, height: canvasH }}
                onMouseDown={handlePointerDown}
                onMouseMove={handlePointerMove}
                onMouseUp={handlePointerUp}
                onMouseLeave={handlePointerUp}
              />
            </div>
            <div className="flex items-center gap-3">
              <label className="flex items-center gap-1.5 text-xs text-slate-600">
                Zoom
                <input
                  type="range"
                  min={0.5}
                  max={4}
                  step={0.1}
                  value={zoom}
                  onChange={(e) => setZoom(Number(e.target.value))}
                  className="w-24"
                />
                <span className="w-8 text-right text-[10px] text-slate-400">{zoom.toFixed(1)}x</span>
              </label>
              <label className="flex items-center gap-1.5 text-xs text-slate-600">
                Mida crop
                <Button variant="outline" size="sm" className="h-6 w-6 p-0 text-xs" onClick={() => handleCropResize(-4)}>−</Button>
                <span className="w-16 text-center text-[10px] text-slate-500">{crop.width}x{crop.height}</span>
                <Button variant="outline" size="sm" className="h-6 w-6 p-0 text-xs" onClick={() => handleCropResize(4)}>+</Button>
              </label>
            </div>
          </div>

          <div className="mvp16-import-crop-preview flex flex-col items-center gap-2">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Resultat esperat</span>
            <div className="rounded border border-slate-200 bg-slate-100 p-2">
              <canvas
                ref={previewCanvasRef}
                className="mvp16-import-crop-preview-canvas"
                style={{
                  width: targetWidth * PREVIEW_CELL,
                  height: targetHeight * PREVIEW_CELL,
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
