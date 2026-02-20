import { useCallback, useState } from "react"
import type { SpriteEditorTool, SpriteToolOptionsMap, SpriteToolOptionsState } from "../types/sprite-editor.js"

const DEFAULT_TOOL_OPTIONS: SpriteToolOptionsState = {
  pencil: {},
  eraser: { radius: 1 },
  bucket_fill: {},
  magic_wand: {
    tolerance: 0
  },
  color_picker: {},
  select: {},
  move: {}
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
  const [activeColor, setActiveColor] = useState("#00000000")
  const [zoom, setZoom] = useState(1)
  const [showGrid, setShowGrid] = useState(false)
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
