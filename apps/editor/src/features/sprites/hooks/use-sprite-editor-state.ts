import { useCallback, useState } from "react"
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

export type SpritePaintTool = "pencil" | "bucket_fill"

export function resolveRecentPaintTool(previousTool: SpritePaintTool, nextTool: SpriteEditorTool): SpritePaintTool {
  if (nextTool === "pencil" || nextTool === "bucket_fill") {
    return nextTool
  }
  return previousTool
}

export function useSpriteEditorState() {
  const [activeTool, setActiveToolState] = useState<SpriteEditorTool>("pencil")
  const [lastPaintTool, setLastPaintTool] = useState<SpritePaintTool>("pencil")
  const [activeColor, setActiveColor] = useState("#4F46E5FF")
  const [zoom, setZoom] = useState(12)
  const [showGrid, setShowGrid] = useState(true)
  const [toolOptions, setToolOptions] = useState<SpriteToolOptionsState>(DEFAULT_TOOL_OPTIONS)

  const setActiveTool = useCallback((nextTool: SpriteEditorTool) => {
    setActiveToolState(nextTool)
    setLastPaintTool((previousTool) => resolveRecentPaintTool(previousTool, nextTool))
  }, [])

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
    lastPaintTool,
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
