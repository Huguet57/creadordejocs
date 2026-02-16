import { TRANSPARENT_RGBA } from "../pixel-rgba.js"
import { getSpritePixelIndex, normalizePixelGrid } from "../sprite-grid.js"

type ColorPickerInput = {
  width: number
  height: number
  pixelsRgba: string[]
  x: number
  y: number
}

export function readPixelColor({ width, height, pixelsRgba, x, y }: ColorPickerInput): string {
  if (x < 0 || y < 0 || x >= width || y >= height) return TRANSPARENT_RGBA
  const safePixels = normalizePixelGrid(pixelsRgba, width, height)
  const pixelIndex = getSpritePixelIndex(x, y, width)
  return safePixels[pixelIndex] ?? TRANSPARENT_RGBA
}
