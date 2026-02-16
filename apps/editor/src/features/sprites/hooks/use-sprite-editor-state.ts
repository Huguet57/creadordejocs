import { useMemo, useState } from "react"
import type { SpriteEditorTool } from "../types/sprite-editor.js"

export function useSpriteEditorState(spriteIds: string[], initialSpriteId: string | null) {
  const defaultSpriteId = useMemo(() => {
    if (initialSpriteId && spriteIds.includes(initialSpriteId)) {
      return initialSpriteId
    }
    return spriteIds[0] ?? null
  }, [initialSpriteId, spriteIds])

  const [activeSpriteId, setActiveSpriteId] = useState<string | null>(defaultSpriteId)
  const [activeTool, setActiveTool] = useState<SpriteEditorTool>("pencil")
  const [activeColor, setActiveColor] = useState("#4F46E5FF")
  const [zoom, setZoom] = useState(15)

  return {
    activeSpriteId,
    setActiveSpriteId,
    activeTool,
    setActiveTool,
    activeColor,
    setActiveColor,
    zoom,
    setZoom
  }
}
