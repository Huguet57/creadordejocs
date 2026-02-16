import { TRANSPARENT_RGBA, normalizeHexRgba } from "./pixel-rgba.js"

export function getSpritePixelIndex(x: number, y: number, width: number): number {
  return y * width + x
}

export function getPixelIndicesInRadius(
  cx: number,
  cy: number,
  radius: number,
  width: number,
  height: number
): number[] {
  const indices: number[] = []
  const extent = radius - 1
  for (let dy = -extent; dy <= extent; dy++) {
    for (let dx = -extent; dx <= extent; dx++) {
      const nx = cx + dx
      const ny = cy + dy
      if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
        indices.push(ny * width + nx)
      }
    }
  }
  return indices
}

export function normalizePixelGrid(pixelsRgba: string[], width: number, height: number): string[] {
  const total = width * height
  if (pixelsRgba.length === total) {
    return pixelsRgba.map((entry) => normalizeHexRgba(entry))
  }
  const next = pixelsRgba.slice(0, total).map((entry) => normalizeHexRgba(entry))
  while (next.length < total) {
    next.push(TRANSPARENT_RGBA)
  }
  return next
}
