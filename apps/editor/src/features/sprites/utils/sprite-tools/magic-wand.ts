import type { SpriteToolConnectivity } from "../../types/sprite-editor.js"
import { normalizeHexRgba } from "../pixel-rgba.js"
import { getSpritePixelIndex, normalizePixelGrid } from "../sprite-grid.js"

type MagicWandInput = {
  width: number
  height: number
  pixelsRgba: string[]
  x: number
  y: number
  connectivity: SpriteToolConnectivity
  tolerance?: number
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

function colorDistance(source: string, target: string): number {
  const normalizedSource = normalizeHexRgba(source)
  const normalizedTarget = normalizeHexRgba(target)
  const sourceR = parseInt(normalizedSource.slice(1, 3), 16)
  const sourceG = parseInt(normalizedSource.slice(3, 5), 16)
  const sourceB = parseInt(normalizedSource.slice(5, 7), 16)
  const sourceA = parseInt(normalizedSource.slice(7, 9), 16)
  const targetR = parseInt(normalizedTarget.slice(1, 3), 16)
  const targetG = parseInt(normalizedTarget.slice(3, 5), 16)
  const targetB = parseInt(normalizedTarget.slice(5, 7), 16)
  const targetA = parseInt(normalizedTarget.slice(7, 9), 16)
  return Math.max(
    Math.abs(sourceR - targetR),
    Math.abs(sourceG - targetG),
    Math.abs(sourceB - targetB),
    Math.abs(sourceA - targetA)
  )
}

export function selectContiguousByColor({
  width,
  height,
  pixelsRgba,
  x,
  y,
  connectivity,
  tolerance = 0
}: MagicWandInput): Set<number> {
  if (x < 0 || y < 0 || x >= width || y >= height) return new Set()

  const safePixels = normalizePixelGrid(pixelsRgba, width, height)
  const startIndex = getSpritePixelIndex(x, y, width)
  const sourceColor = safePixels[startIndex]
  if (!sourceColor) return new Set()

  const visited = new Set<number>()
  const selected = new Set<number>()
  const queue: [number, number][] = [[x, y]]
  const offsets = buildNeighborOffsets(connectivity)

  while (queue.length > 0) {
    const [currentX, currentY] = queue.shift() ?? [0, 0]
    if (currentX < 0 || currentY < 0 || currentX >= width || currentY >= height) continue
    const currentIndex = getSpritePixelIndex(currentX, currentY, width)
    if (visited.has(currentIndex)) continue
    visited.add(currentIndex)

    const currentColor = safePixels[currentIndex]
    if (!currentColor || colorDistance(sourceColor, currentColor) > tolerance) continue

    selected.add(currentIndex)

    for (const [offsetX, offsetY] of offsets) {
      queue.push([currentX + offsetX, currentY + offsetY])
    }
  }

  return selected
}
