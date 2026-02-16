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
  spriteColors: string[]
  onColorChange: (color: string) => void
  onUpdateToolOptions: <ToolName extends SpriteEditorTool>(
    tool: ToolName,
    options: Partial<SpriteToolOptionsMap[ToolName]>
  ) => void
}

type ConnectivitySelectorProps = {
  selectedConnectivity: 4 | 8
  onSelect: (connectivity: 4 | 8) => void
}

function ConnectivitySelector({ selectedConnectivity, onSelect }: ConnectivitySelectorProps) {
  return (
    <div className="mvp16-sprite-tool-options-connectivity flex items-center gap-1">
      <button
        type="button"
        className={`mvp16-sprite-tool-options-connectivity-btn h-6 rounded px-2 text-[10px] ${
          selectedConnectivity === 4 ? "bg-indigo-100 text-indigo-700" : "bg-white text-slate-600 hover:bg-slate-100"
        }`}
        onClick={() => onSelect(4)}
      >
        4-way
      </button>
      <button
        type="button"
        className={`mvp16-sprite-tool-options-connectivity-btn h-6 rounded px-2 text-[10px] ${
          selectedConnectivity === 8 ? "bg-indigo-100 text-indigo-700" : "bg-white text-slate-600 hover:bg-slate-100"
        }`}
        onClick={() => onSelect(8)}
      >
        8-way
      </button>
    </div>
  )
}

function EmptyOptions() {
  return <p className="text-[10px] text-slate-500">Aquesta eina no té opcions.</p>
}

export function ToolOptionsPanel({
  activeTool,
  toolOptions,
  activeColor,
  spriteColors,
  onColorChange,
  onUpdateToolOptions
}: ToolOptionsPanelProps) {
  const normalizedActive = normalizeHexRgba(activeColor)

  if (activeTool === "pencil") {
    return (
      <div className="mvp16-sprite-tool-options-pencil flex flex-col gap-2">
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
      </div>
    )
  }

  if (activeTool === "bucket_fill") {
    return (
      <div className="mvp16-sprite-tool-options-content flex flex-col gap-2">
        <p className="text-[10px] font-medium text-slate-600">Connectivitat</p>
        <ConnectivitySelector
          selectedConnectivity={toolOptions.bucket_fill.connectivity}
          onSelect={(connectivity) => onUpdateToolOptions("bucket_fill", { connectivity })}
        />
      </div>
    )
  }

  if (activeTool === "magic_wand") {
    return (
      <div className="mvp16-sprite-tool-options-content flex flex-col gap-2">
        <div className="space-y-1">
          <p className="text-[10px] font-medium text-slate-600">Connectivitat</p>
          <ConnectivitySelector
            selectedConnectivity={toolOptions.magic_wand.connectivity}
            onSelect={(connectivity) => onUpdateToolOptions("magic_wand", { connectivity })}
          />
        </div>
        <label className="mvp16-sprite-tool-options-tolerance flex flex-col gap-1 text-[10px] text-slate-600">
          Tolerancia: {toolOptions.magic_wand.tolerance}
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

  return <EmptyOptions />
}
