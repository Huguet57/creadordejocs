import { useCallback } from "react"
import type { SpriteEditorTool, SpriteToolOptionsState } from "../types/sprite-editor.js"
import { normalizeHexRgba, TRANSPARENT_RGBA } from "../utils/pixel-rgba.js"
import { getPixelIndicesInRadius, getSpritePixelIndex, normalizePixelGrid } from "../utils/sprite-grid.js"
import { readPixelColor } from "../utils/sprite-tools/color-picker.js"
import { floodFillPixels } from "../utils/sprite-tools/flood-fill.js"
import { selectContiguousByColor } from "../utils/sprite-tools/magic-wand.js"

export type SpritePointerActionPhase = "pointerDown" | "pointerDrag" | "pointerUp"

type BucketFillInput = {
  width: number
  height: number
  pixelsRgba: string[]
  x: number
  y: number
  targetColor: string
  selectionMask?: Set<number> | undefined
}

type SelectContiguousInput = {
  width: number
  height: number
  pixelsRgba: string[]
  x: number
  y: number
  tolerance?: number
}

type ReadPixelColorInput = {
  width: number
  height: number
  pixelsRgba: string[]
  x: number
  y: number
}

const DEFAULT_CONNECTIVITY = 8 as const

export function applyBucketFillTool(input: BucketFillInput): string[] {
  return floodFillPixels({ ...input, connectivity: DEFAULT_CONNECTIVITY })
}

export function selectContiguousPixels(input: SelectContiguousInput): Set<number> {
  return selectContiguousByColor({ ...input, connectivity: DEFAULT_CONNECTIVITY })
}

export function readPixelColorAt(input: ReadPixelColorInput): string {
  return readPixelColor(input)
}

type UseSpritePixelActionsInput = {
  width: number
  height: number
  pixelsRgba: string[]
  activeColor: string
  toolOptions: SpriteToolOptionsState
  selection: Set<number>
  onPixelsChange: (pixelsRgba: string[]) => void
  onActiveColorChange: (nextColor: string) => void
  onSelectionChange: (selectedIndexes: Set<number>) => void
}

export function useSpritePixelActions({
  width,
  height,
  pixelsRgba,
  activeColor,
  toolOptions,
  selection,
  onPixelsChange,
  onActiveColorChange,
  onSelectionChange
}: UseSpritePixelActionsInput) {
  const paintAt = useCallback(
    (x: number, y: number, tool: SpriteEditorTool, phase: SpritePointerActionPhase) => {
      if (x < 0 || y < 0 || x >= width || y >= height) {
        return
      }

      const safePixels = normalizePixelGrid(pixelsRgba, width, height)
      const pixelIndex = getSpritePixelIndex(x, y, width)

      if (tool === "pencil") {
        if (selection.size > 0 && !selection.has(pixelIndex)) return
        const next = [...safePixels]
        next[pixelIndex] = normalizeHexRgba(activeColor)
        onPixelsChange(next)
        return
      }

      if (tool === "eraser") {
        const next = [...safePixels]
        const eraserRadius = toolOptions.eraser.radius
        const indicesToErase = getPixelIndicesInRadius(x, y, eraserRadius, width, height)
        for (const idx of indicesToErase) {
          if (selection.size > 0 && !selection.has(idx)) continue
          next[idx] = TRANSPARENT_RGBA
        }
        onPixelsChange(next)
        return
      }

      if (phase !== "pointerDown") {
        return
      }

      if (tool === "bucket_fill") {
        if (selection.size > 0 && !selection.has(pixelIndex)) return
        const next = applyBucketFillTool({
          width,
          height,
          pixelsRgba: safePixels,
          x,
          y,
          targetColor: activeColor,
          selectionMask: selection.size > 0 ? selection : undefined
        })
        onPixelsChange(next)
        return
      }

      if (tool === "magic_wand") {
        const selectedIndexes = selectContiguousPixels({
          width,
          height,
          pixelsRgba: safePixels,
          x,
          y,
          tolerance: toolOptions.magic_wand.tolerance
        })
        onSelectionChange(selectedIndexes)
        return
      }

      if (tool === "color_picker") {
        const pickedColor = readPixelColorAt({ width, height, pixelsRgba: safePixels, x, y })
        onActiveColorChange(pickedColor)
      }
    },
    [activeColor, height, onActiveColorChange, onPixelsChange, onSelectionChange, pixelsRgba, selection, toolOptions, width]
  )

  return {
    paintAt
  }
}
