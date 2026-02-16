import type { SpriteEditorTool, SpriteToolOptionsMap, SpriteToolOptionsState } from "../../types/sprite-editor.js"

type ToolOptionsPanelProps = {
  activeTool: SpriteEditorTool
  toolOptions: SpriteToolOptionsState
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
  return <p className="text-[10px] text-slate-500">Aquesta eina no te opcions.</p>
}

export function ToolOptionsPanel({ activeTool, toolOptions, onUpdateToolOptions }: ToolOptionsPanelProps) {
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
