import type { ChangeEvent } from "react"
import type { SpriteEditorTool, SpriteToolOptionsMap, SpriteToolOptionsState } from "../../types/sprite-editor.js"
import { normalizeHexRgba } from "../../utils/pixel-rgba.js"

const DEFAULT_PALETTE = [
  "#000000FF", "#FFFFFFFF", "#FF0000FF", "#00FF00FF", "#0000FFFF",
  "#FFFF00FF", "#FF00FFFF", "#00FFFFFF", "#FF8800FF", "#8800FFFF",
  "#888888FF", "#FF5555FF", "#55FF55FF", "#5555FFFF", "#FFAA00FF",
  "#AA5500FF", "#005500FF", "#550000FF", "#000055FF", "#555555FF"
]

type ToolOptionsPanelProps = {
  activeTool: SpriteEditorTool
  toolOptions: SpriteToolOptionsState
  activeColor: string
  pickerPreviewColor: string | null
  spriteColors: string[]
  onColorChange: (color: string) => void
  onUpdateToolOptions: <ToolName extends SpriteEditorTool>(
    tool: ToolName,
    options: Partial<SpriteToolOptionsMap[ToolName]>
  ) => void
}

type ColorSectionProps = {
  normalizedActive: string
  spriteColors: string[]
  onColorChange: (color: string) => void
}

function ColorSection({ normalizedActive, spriteColors, onColorChange }: ColorSectionProps) {
  return (
    <>
      <div className="mvp16-sprite-tool-options-color flex flex-col gap-1.5">
        <p className="text-[10px] font-medium text-slate-600">Color</p>
        <div className="flex items-center gap-2">
          <div
            className="mvp16-sprite-tool-options-color-preview h-7 w-7 shrink-0 rounded border border-slate-300"
            style={{ backgroundColor: normalizedActive.slice(0, 7) }}
          />
          <input
            type="color"
            value={normalizedActive.slice(0, 7)}
            className="mvp16-sprite-tool-options-color-picker h-7 w-full cursor-pointer rounded border border-slate-300 bg-white p-0"
            onChange={(event: ChangeEvent<HTMLInputElement>) => onColorChange(`${event.target.value.toUpperCase()}FF`)}
          />
        </div>
      </div>

      <div className="mvp16-sprite-tool-options-palette flex flex-col gap-1.5">
        <p className="text-[10px] font-medium text-slate-600">Paleta</p>
        <div className="mvp16-sprite-tool-options-palette-grid grid grid-cols-5 gap-0.5">
          {DEFAULT_PALETTE.map((color) => (
            <button
              key={color}
              type="button"
              className={`mvp16-sprite-tool-options-palette-swatch h-5 w-full rounded-sm border ${
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
        <div className="mvp16-sprite-tool-options-image-colors flex flex-col gap-1.5">
          <p className="text-[10px] font-medium text-slate-600">De la imatge</p>
          <div className="mvp16-sprite-tool-options-image-colors-grid grid grid-cols-5 gap-0.5">
            {spriteColors.map((color) => (
              <button
                key={color}
                type="button"
                className={`mvp16-sprite-tool-options-image-color-swatch h-5 w-full rounded-sm border ${
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
    </>
  )
}

function EmptyOptions() {
  return <p className="text-[10px] text-slate-500">Aquesta eina no té opcions.</p>
}

export function ToolOptionsPanel({
  activeTool,
  toolOptions,
  activeColor,
  pickerPreviewColor,
  spriteColors,
  onColorChange,
  onUpdateToolOptions
}: ToolOptionsPanelProps) {
  const normalizedActive = normalizeHexRgba(activeColor)
  const normalizedPreview = normalizeHexRgba(pickerPreviewColor ?? activeColor)

  if (activeTool === "pencil") {
    return (
      <div className="mvp16-sprite-tool-options-pencil flex flex-col gap-2">
        <ColorSection normalizedActive={normalizedActive} spriteColors={spriteColors} onColorChange={onColorChange} />
      </div>
    )
  }

  if (activeTool === "bucket_fill") {
    return (
      <div className="mvp16-sprite-tool-options-bucket flex flex-col gap-2">
        <ColorSection normalizedActive={normalizedActive} spriteColors={spriteColors} onColorChange={onColorChange} />
      </div>
    )
  }

  if (activeTool === "magic_wand") {
    return (
      <div className="mvp16-sprite-tool-options-wand flex flex-col gap-2">
        <label className="mvp16-sprite-tool-options-tolerance flex flex-col gap-1 text-[10px] text-slate-600">
          <span className="font-medium">Tolerància: {toolOptions.magic_wand.tolerance}</span>
          <input
            type="range"
            min={0}
            max={255}
            value={toolOptions.magic_wand.tolerance}
            onChange={(event) => onUpdateToolOptions("magic_wand", { tolerance: Number(event.target.value) })}
          />
        </label>
      </div>
    )
  }

  if (activeTool === "color_picker") {
    return (
      <div className="mvp16-sprite-tool-options-picker flex flex-col gap-2">
        <p className="text-[10px] font-medium text-slate-600">Hover preview</p>
        <div className="mvp16-sprite-tool-options-picker-preview flex items-center gap-2 rounded border border-slate-200 bg-white p-2">
          <div
            className="mvp16-sprite-tool-options-picker-preview-swatch h-7 w-7 shrink-0 rounded border border-slate-300"
            style={{ backgroundColor: normalizedPreview.slice(0, 7) }}
          />
          <span className="truncate text-[10px] font-medium text-slate-700">{normalizedPreview}</span>
        </div>
      </div>
    )
  }

  if (activeTool === "eraser") {
    return (
      <div className="mvp16-sprite-tool-options-eraser flex flex-col gap-2">
        <label className="mvp16-sprite-tool-options-eraser-radius flex flex-col gap-1 text-[10px] text-slate-600">
          <span className="font-medium">Radi: {toolOptions.eraser.radius}</span>
          <input
            type="range"
            min={1}
            max={5}
            value={toolOptions.eraser.radius}
            onChange={(event) => onUpdateToolOptions("eraser", { radius: Number(event.target.value) })}
          />
        </label>
        <p className="text-[10px] text-slate-400">
          {toolOptions.eraser.radius === 1
            ? "1 píxel"
            : `${toolOptions.eraser.radius * 2 - 1}×${toolOptions.eraser.radius * 2 - 1} píxels`}
        </p>
      </div>
    )
  }

  return <EmptyOptions />
}
