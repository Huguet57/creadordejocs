import { useState } from "react"
import type { SpriteEditorTool } from "../types/sprite-editor.js"

export function useSpriteEditorState() {
  const [activeTool, setActiveTool] = useState<SpriteEditorTool>("pencil")
  const [activeColor, setActiveColor] = useState("#4F46E5FF")
  const [zoom, setZoom] = useState(12)

  return {
    activeTool,
    setActiveTool,
    activeColor,
    setActiveColor,
    zoom,
    setZoom
  }
}
