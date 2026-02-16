import { Eraser, Pencil } from "lucide-react"
import type { ChangeEvent } from "react"
import { Button } from "../../../components/ui/button.js"
import type { SpriteEditorTool } from "../types/sprite-editor.js"
import { SpriteImportButton } from "./SpriteImportButton.js"

type SpriteToolbarProps = {
  activeTool: SpriteEditorTool
  activeColor: string
  zoom: number
  isImporting: boolean
  onToolChange: (tool: SpriteEditorTool) => void
  onColorChange: (color: string) => void
  onZoomChange: (zoom: number) => void
  onImportFile: (file: File) => void
}

export function SpriteToolbar({
  activeTool,
  activeColor,
  zoom,
  isImporting,
  onToolChange,
  onColorChange,
  onZoomChange,
  onImportFile
}: SpriteToolbarProps) {
  return (
    <div className="mvp16-sprite-toolbar flex items-center gap-2 border-b border-slate-200 bg-white px-4 py-2">
      <Button
        variant={activeTool === "pencil" ? "default" : "outline"}
        size="sm"
        className="h-8"
        onClick={() => onToolChange("pencil")}
      >
        <Pencil className="mr-1.5 h-3.5 w-3.5" />
        Pencil
      </Button>
      <Button
        variant={activeTool === "eraser" ? "default" : "outline"}
        size="sm"
        className="h-8"
        onClick={() => onToolChange("eraser")}
      >
        <Eraser className="mr-1.5 h-3.5 w-3.5" />
        Eraser
      </Button>

      <label className="mvp16-sprite-color flex items-center gap-2 rounded border border-slate-200 bg-slate-50 px-2 py-1 text-xs text-slate-600">
        Color
        <input
          type="color"
          value={activeColor.slice(0, 7)}
          className="h-6 w-8 cursor-pointer rounded border border-slate-300 bg-white p-0"
          onChange={(event: ChangeEvent<HTMLInputElement>) => onColorChange(`${event.target.value.toUpperCase()}FF`)}
        />
      </label>

      <label className="mvp16-sprite-zoom ml-auto flex items-center gap-2 text-xs text-slate-600">
        Zoom
        <input
          type="range"
          min={4}
          max={24}
          value={zoom}
          onChange={(event: ChangeEvent<HTMLInputElement>) => onZoomChange(Number(event.target.value))}
        />
      </label>

      <SpriteImportButton isImporting={isImporting} onImportFile={onImportFile} />
    </div>
  )
}
