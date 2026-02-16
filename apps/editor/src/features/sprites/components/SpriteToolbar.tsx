import { Eraser, Pencil } from "lucide-react"
import type { ChangeEvent } from "react"
import { Button } from "../../../components/ui/button.js"
import type { SpriteEditorTool } from "../types/sprite-editor.js"

type SpriteToolbarProps = {
  activeTool: SpriteEditorTool
  activeColor: string
  onToolChange: (tool: SpriteEditorTool) => void
  onColorChange: (color: string) => void
}

export function SpriteToolbar({
  activeTool,
  activeColor,
  onToolChange,
  onColorChange
}: SpriteToolbarProps) {
  return (
    <aside className="mvp16-sprite-tool-sidebar flex w-[56px] flex-col items-center gap-1 border-r border-slate-200 bg-slate-50 py-3">
      <Button
        variant={activeTool === "pencil" ? "default" : "ghost"}
        size="sm"
        className="mvp16-sprite-tool-btn h-9 w-9 p-0"
        onClick={() => onToolChange("pencil")}
        title="Pencil"
      >
        <Pencil className="h-4 w-4" />
      </Button>
      <Button
        variant={activeTool === "eraser" ? "default" : "ghost"}
        size="sm"
        className="mvp16-sprite-tool-btn h-9 w-9 p-0"
        onClick={() => onToolChange("eraser")}
        title="Eraser"
      >
        <Eraser className="h-4 w-4" />
      </Button>

      <div className="mvp16-sprite-tool-divider my-1 h-px w-8 bg-slate-200" />

      <label className="mvp16-sprite-tool-color flex flex-col items-center gap-1" title="Color">
        <input
          type="color"
          value={activeColor.slice(0, 7)}
          className="h-8 w-8 cursor-pointer rounded border border-slate-300 bg-white p-0"
          onChange={(event: ChangeEvent<HTMLInputElement>) => onColorChange(`${event.target.value.toUpperCase()}FF`)}
        />
        <span className="text-[9px] text-slate-400">Color</span>
      </label>
    </aside>
  )
}
