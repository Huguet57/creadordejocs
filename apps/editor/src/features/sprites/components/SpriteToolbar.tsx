import { BoxSelect, Eraser, FlipHorizontal2, FlipVertical2, Move, PaintBucket, Pencil, Pipette, RotateCcw, RotateCw, WandSparkles } from "lucide-react"
import { useMemo } from "react"
import { ToolOptionsPanel } from "./tool-options/ToolOptionsPanel.js"
import type { SpriteEditorTool, SpriteToolOptionsMap, SpriteToolOptionsState } from "../types/sprite-editor.js"
import { normalizeHexRgba, TRANSPARENT_RGBA } from "../utils/pixel-rgba.js"
import { SPRITE_TOOL_REGISTRY } from "../utils/sprite-tools/tool-registry.js"

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

type SpriteToolbarProps = {
  activeTool: SpriteEditorTool
  activeColor: string
  pickerPreviewColor: string | null
  spritePixels: string[]
  toolOptions: SpriteToolOptionsState
  onToolChange: (tool: SpriteEditorTool) => void
  onColorChange: (color: string) => void
  onUpdateToolOptions: <ToolName extends SpriteEditorTool>(
    tool: ToolName,
    options: Partial<SpriteToolOptionsMap[ToolName]>
  ) => void
  onFlipHorizontal: () => void
  onFlipVertical: () => void
  onRotateCW: () => void
  onRotateCCW: () => void
}

const TOOL_ICONS: Record<SpriteEditorTool, typeof Pencil> = {
  pencil: Pencil,
  eraser: Eraser,
  bucket_fill: PaintBucket,
  magic_wand: WandSparkles,
  color_picker: Pipette,
  select: BoxSelect,
  move: Move
}

export function SpriteToolbar({
  activeTool,
  activeColor,
  pickerPreviewColor,
  spritePixels,
  toolOptions,
  onToolChange,
  onColorChange,
  onUpdateToolOptions,
  onFlipHorizontal,
  onFlipVertical,
  onRotateCW,
  onRotateCCW
}: SpriteToolbarProps) {
  const spriteColors = useMemo(() => extractDominantColors(spritePixels, 20), [spritePixels])

  return (
    <aside className="mvp16-sprite-tool-sidebar flex w-[144px] shrink-0 flex-col border-r border-slate-200 bg-slate-50">
      <div className="mvp16-sprite-tool-list-section flex flex-col gap-1 border-b border-slate-200 p-2">
        <p className="text-[9px] font-semibold uppercase tracking-wider text-slate-400">Tools</p>
        <div className="mvp16-sprite-tool-list-grid grid grid-cols-2 gap-1">
          {SPRITE_TOOL_REGISTRY.filter((toolEntry) => !toolEntry.hidden).map((toolEntry) => {
            const Icon = TOOL_ICONS[toolEntry.id]
            return (
              <button
                key={toolEntry.id}
                type="button"
                className={`mvp16-sprite-tool-list-btn flex flex-col items-center gap-0.5 rounded px-1 py-1.5 text-[9px] ${
                  activeTool === toolEntry.id ? "bg-indigo-100 text-indigo-700" : "text-slate-500 hover:bg-slate-100"
                }`}
                onClick={() => onToolChange(toolEntry.id)}
                title={toolEntry.label}
              >
                <Icon className="h-4 w-4" />
                {toolEntry.label}
              </button>
            )
          })}
        </div>
      </div>

      <div className="mvp16-sprite-tool-options-section flex min-h-0 flex-1 flex-col gap-1 overflow-y-auto border-b border-slate-200 p-2">
        <p className="text-[9px] font-semibold uppercase tracking-wider text-slate-400">Tool options</p>
        <ToolOptionsPanel
          activeTool={activeTool}
          toolOptions={toolOptions}
          activeColor={activeColor}
          pickerPreviewColor={pickerPreviewColor}
          spriteColors={spriteColors}
          onColorChange={onColorChange}
          onUpdateToolOptions={onUpdateToolOptions}
        />
      </div>

      <div className="mvp16-sprite-transform-section mt-auto flex shrink-0 flex-col gap-1 border-t border-slate-200 p-2">
        <p className="text-[9px] font-semibold uppercase tracking-wider text-slate-400">Transform</p>
        <div className="grid grid-cols-2 gap-1">
          <button
            type="button"
            className="mvp16-sprite-transform-btn flex flex-col items-center gap-0.5 rounded px-1 py-1.5 text-[9px] text-slate-500 hover:bg-slate-100"
            onClick={onFlipHorizontal}
            title="Flip horizontal"
          >
            <FlipHorizontal2 className="h-4 w-4" />
            Flip H
          </button>
          <button
            type="button"
            className="mvp16-sprite-transform-btn flex flex-col items-center gap-0.5 rounded px-1 py-1.5 text-[9px] text-slate-500 hover:bg-slate-100"
            onClick={onFlipVertical}
            title="Flip vertical"
          >
            <FlipVertical2 className="h-4 w-4" />
            Flip V
          </button>
          <button
            type="button"
            className="mvp16-sprite-transform-btn flex flex-col items-center gap-0.5 rounded px-1 py-1.5 text-[9px] text-slate-500 hover:bg-slate-100"
            onClick={onRotateCW}
            title="Rotate clockwise"
          >
            <RotateCw className="h-4 w-4" />
            Rot +90°
          </button>
          <button
            type="button"
            className="mvp16-sprite-transform-btn flex flex-col items-center gap-0.5 rounded px-1 py-1.5 text-[9px] text-slate-500 hover:bg-slate-100"
            onClick={onRotateCCW}
            title="Rotate counter-clockwise"
          >
            <RotateCcw className="h-4 w-4" />
            Rot -90°
          </button>
        </div>
      </div>
    </aside>
  )
}
