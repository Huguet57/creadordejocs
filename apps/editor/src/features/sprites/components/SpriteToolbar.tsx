import { Eraser, Pencil } from "lucide-react"
import { useMemo, type ChangeEvent } from "react"
import type { SpriteEditorTool } from "../types/sprite-editor.js"
import { normalizeHexRgba, TRANSPARENT_RGBA } from "../utils/pixel-rgba.js"

const DEFAULT_PALETTE = [
  "#000000FF", "#FFFFFFFF", "#FF0000FF", "#00FF00FF", "#0000FFFF",
  "#FFFF00FF", "#FF00FFFF", "#00FFFFFF", "#FF8800FF", "#8800FFFF",
  "#888888FF", "#FF5555FF", "#55FF55FF", "#5555FFFF", "#FFAA00FF",
  "#AA5500FF", "#005500FF", "#550000FF", "#000055FF", "#555555FF"
]

const COLOR_BUCKET_SHIFT = 5

function bucketKey(hex: string): string {
  const r = parseInt(hex.slice(1, 3), 16) >> COLOR_BUCKET_SHIFT
  const g = parseInt(hex.slice(3, 5), 16) >> COLOR_BUCKET_SHIFT
  const b = parseInt(hex.slice(5, 7), 16) >> COLOR_BUCKET_SHIFT
  return `${r}-${g}-${b}`
}

function extractDominantColors(pixels: string[], maxColors: number): string[] {
  const buckets = new Map<string, { color: string; count: number }>()

  for (const pixel of pixels) {
    const normalized = normalizeHexRgba(pixel)
    if (normalized === TRANSPARENT_RGBA) continue
    const key = bucketKey(normalized)
    const existing = buckets.get(key)
    if (existing) {
      existing.count += 1
    } else {
      buckets.set(key, { color: normalized, count: 1 })
    }
  }

  return [...buckets.values()]
    .sort((a, b) => b.count - a.count)
    .slice(0, maxColors)
    .map((entry) => entry.color)
}

const TOOLS_USING_COLOR: SpriteEditorTool[] = ["pencil"]

type SpriteToolbarProps = {
  activeTool: SpriteEditorTool
  activeColor: string
  spritePixels: string[]
  onToolChange: (tool: SpriteEditorTool) => void
  onColorChange: (color: string) => void
}

export function SpriteToolbar({
  activeTool,
  activeColor,
  spritePixels,
  onToolChange,
  onColorChange
}: SpriteToolbarProps) {
  const spriteColors = useMemo(() => extractDominantColors(spritePixels, 20), [spritePixels])

  const normalizedActive = normalizeHexRgba(activeColor)
  const colorEnabled = TOOLS_USING_COLOR.includes(activeTool)

  return (
    <aside className="mvp16-sprite-tool-sidebar flex w-[120px] shrink-0 flex-col border-r border-slate-200 bg-slate-50">
      <div className="mvp16-sprite-tool-section flex flex-col gap-1 border-b border-slate-200 p-2">
        <p className="text-[9px] font-semibold uppercase tracking-wider text-slate-400">Eines</p>
        <div className="flex gap-1">
          <button
            type="button"
            className={`mvp16-sprite-tool-btn flex flex-1 flex-col items-center gap-0.5 rounded px-1 py-1.5 text-[9px] ${
              activeTool === "pencil" ? "bg-indigo-100 text-indigo-700" : "text-slate-500 hover:bg-slate-100"
            }`}
            onClick={() => onToolChange("pencil")}
          >
            <Pencil className="h-4 w-4" />
            Pencil
          </button>
          <button
            type="button"
            className={`mvp16-sprite-tool-btn flex flex-1 flex-col items-center gap-0.5 rounded px-1 py-1.5 text-[9px] ${
              activeTool === "eraser" ? "bg-indigo-100 text-indigo-700" : "text-slate-500 hover:bg-slate-100"
            }`}
            onClick={() => onToolChange("eraser")}
          >
            <Eraser className="h-4 w-4" />
            Eraser
          </button>
        </div>
      </div>

      <div className={`mvp16-sprite-color-section flex flex-col gap-2 border-b border-slate-200 p-2 transition-opacity ${colorEnabled ? "" : "pointer-events-none opacity-30"}`}>
        <p className="text-[9px] font-semibold uppercase tracking-wider text-slate-400">Color</p>
        <div className="flex items-center gap-2">
          <div
            className="mvp16-sprite-color-preview h-7 w-7 shrink-0 rounded border border-slate-300"
            style={{ backgroundColor: normalizedActive.slice(0, 7) }}
          />
          <input
            type="color"
            value={normalizedActive.slice(0, 7)}
            className="mvp16-sprite-color-picker h-7 w-full cursor-pointer rounded border border-slate-300 bg-white p-0"
            onChange={(event: ChangeEvent<HTMLInputElement>) => onColorChange(`${event.target.value.toUpperCase()}FF`)}
            disabled={!colorEnabled}
          />
        </div>
      </div>

      <div className={`mvp16-sprite-palette-section flex flex-col gap-1.5 border-b border-slate-200 p-2 transition-opacity ${colorEnabled ? "" : "pointer-events-none opacity-30"}`}>
        <p className="text-[9px] font-semibold uppercase tracking-wider text-slate-400">Paleta</p>
        <div className="mvp16-sprite-palette-grid grid grid-cols-5 gap-0.5">
          {DEFAULT_PALETTE.map((color) => (
            <button
              key={color}
              type="button"
              disabled={!colorEnabled}
              className={`mvp16-sprite-palette-swatch h-5 w-full rounded-sm border ${
                normalizedActive === color ? "border-indigo-500 ring-1 ring-indigo-300" : "border-slate-300"
              }`}
              style={{ backgroundColor: color.slice(0, 7) }}
              onClick={() => onColorChange(color)}
              title={color}
            />
          ))}
        </div>
      </div>

      {spriteColors.length > 0 && (
        <div className={`mvp16-sprite-image-colors-section flex flex-1 flex-col gap-1.5 overflow-y-auto p-2 transition-opacity ${colorEnabled ? "" : "pointer-events-none opacity-30"}`}>
          <p className="text-[9px] font-semibold uppercase tracking-wider text-slate-400">De la imatge</p>
          <div className="mvp16-sprite-image-colors-grid grid grid-cols-5 gap-0.5">
            {spriteColors.map((color) => (
              <button
                key={color}
                type="button"
                disabled={!colorEnabled}
                className={`mvp16-sprite-image-color-swatch h-5 w-full rounded-sm border ${
                  normalizedActive === color ? "border-indigo-500 ring-1 ring-indigo-300" : "border-slate-300"
                }`}
                style={{ backgroundColor: color.slice(0, 7) }}
                onClick={() => onColorChange(color)}
                title={color}
              />
            ))}
          </div>
        </div>
      )}
    </aside>
  )
}
