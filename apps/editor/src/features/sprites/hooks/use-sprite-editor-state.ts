import { useState } from "react"
import type { SpriteEditorTool, SpriteToolOptionsMap, SpriteToolOptionsState } from "../types/sprite-editor.js"

const DEFAULT_TOOL_OPTIONS: SpriteToolOptionsState = {
  pencil: {},
  eraser: {},
  bucket_fill: {
    connectivity: 4
  },
  magic_wand: {
    connectivity: 4,
    tolerance: 0
  },
  color_picker: {}
}

export function useSpriteEditorState() {
  const [activeTool, setActiveTool] = useState<SpriteEditorTool>("pencil")
  const [activeColor, setActiveColor] = useState("#4F46E5FF")
  const [zoom, setZoom] = useState(12)
  const [showGrid, setShowGrid] = useState(true)
  const [toolOptions, setToolOptions] = useState<SpriteToolOptionsState>(DEFAULT_TOOL_OPTIONS)

  const updateToolOptions = <ToolName extends SpriteEditorTool>(
    tool: ToolName,
    options: Partial<SpriteToolOptionsMap[ToolName]>
  ) => {
    setToolOptions((previous) => ({
      ...previous,
      [tool]: {
        ...previous[tool],
        ...options
      }
    }))
  }

  return {
    activeTool,
    setActiveTool,
    activeColor,
    setActiveColor,
    zoom,
    setZoom,
    showGrid,
    setShowGrid,
    toolOptions,
    updateToolOptions
  }
}
