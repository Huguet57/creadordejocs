import { useCallback } from "react"
import { normalizeHexRgba, TRANSPARENT_RGBA } from "../utils/pixel-rgba.js"
import { getSpritePixelIndex, normalizePixelGrid } from "../utils/sprite-grid.js"

type UseSpritePixelActionsInput = {
  width: number
  height: number
  pixelsRgba: string[]
  activeColor: string
  onPixelsChange: (pixelsRgba: string[]) => void
}

export function useSpritePixelActions({ width, height, pixelsRgba, activeColor, onPixelsChange }: UseSpritePixelActionsInput) {
  const paintAt = useCallback(
    (x: number, y: number, tool: "pencil" | "eraser") => {
      if (x < 0 || y < 0 || x >= width || y >= height) {
        return
      }
      const safePixels = normalizePixelGrid(pixelsRgba, width, height)
      const next = [...safePixels]
      const pixelIndex = getSpritePixelIndex(x, y, width)
      const targetColor = tool === "eraser" ? TRANSPARENT_RGBA : normalizeHexRgba(activeColor)
      next[pixelIndex] = targetColor
      onPixelsChange(next)
    },
    [activeColor, height, onPixelsChange, pixelsRgba, width]
  )

  return {
    paintAt
  }
}
