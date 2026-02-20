import type { SpriteToolConnectivity } from "../../types/sprite-editor.js"
import { normalizeHexRgba } from "../pixel-rgba.js"
import { getSpritePixelIndex, normalizePixelGrid } from "../sprite-grid.js"

type FloodFillInput = {
  width: number
  height: number
  pixelsRgba: string[]
  x: number
  y: number
  targetColor: string
  connectivity: SpriteToolConnectivity
  selectionMask?: Set<number> | undefined
}

function buildNeighborOffsets(connectivity: SpriteToolConnectivity): [number, number][] {
  if (connectivity === 8) {
    return [
      [1, 0], [-1, 0], [0, 1], [0, -1],
      [1, 1], [-1, 1], [1, -1], [-1, -1]
    ]
  }
  return [
    [1, 0], [-1, 0], [0, 1], [0, -1]
  ]
}

export function floodFillPixels({ width, height, pixelsRgba, x, y, targetColor, connectivity, selectionMask }: FloodFillInput): string[] {
  if (x < 0 || y < 0 || x >= width || y >= height) return pixelsRgba

  const safePixels = normalizePixelGrid(pixelsRgba, width, height)
  const startIndex = getSpritePixelIndex(x, y, width)
  const sourceColor = safePixels[startIndex]
  const normalizedTarget = normalizeHexRgba(targetColor)

  if (!sourceColor || sourceColor === normalizedTarget) {
    return safePixels
  }

  const visited = new Set<number>()
  const queue: [number, number][] = [[x, y]]
  const nextPixels = [...safePixels]
  const offsets = buildNeighborOffsets(connectivity)

  while (queue.length > 0) {
    const [currentX, currentY] = queue.shift() ?? [0, 0]
    if (currentX < 0 || currentY < 0 || currentX >= width || currentY >= height) continue
    const currentIndex = getSpritePixelIndex(currentX, currentY, width)
    if (visited.has(currentIndex)) continue
    visited.add(currentIndex)
    if (selectionMask && !selectionMask.has(currentIndex)) continue
    if (safePixels[currentIndex] !== sourceColor) continue

    nextPixels[currentIndex] = normalizedTarget

    for (const [offsetX, offsetY] of offsets) {
      queue.push([currentX + offsetX, currentY + offsetY])
    }
  }

  return nextPixels
}
