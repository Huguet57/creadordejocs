import { TRANSPARENT_RGBA, normalizeHexRgba } from "./pixel-rgba.js"

export function getSpritePixelIndex(x: number, y: number, width: number): number {
  return y * width + x
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
