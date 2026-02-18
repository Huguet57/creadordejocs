export const MIN_SPRITE_ZOOM = 1
export const MAX_SPRITE_ZOOM = 24

export function clampZoom(value: number, min = MIN_SPRITE_ZOOM, max = MAX_SPRITE_ZOOM): number {
  if (!Number.isFinite(value)) return min
  const rounded = Math.round(value)
  return Math.min(max, Math.max(min, rounded))
}

type ComputeFitZoomInput = {
  viewportWidth: number
  viewportHeight: number
  spriteWidth: number
  spriteHeight: number
  minZoom?: number
  maxZoom?: number
}

export function computeFitZoom({
  viewportWidth,
  viewportHeight,
  spriteWidth,
  spriteHeight,
  minZoom = MIN_SPRITE_ZOOM,
  maxZoom = MAX_SPRITE_ZOOM
}: ComputeFitZoomInput): number {
  if (viewportWidth <= 0 || viewportHeight <= 0 || spriteWidth <= 0 || spriteHeight <= 0) {
    return minZoom
  }

  const widthRatio = viewportWidth / spriteWidth
  const heightRatio = viewportHeight / spriteHeight
  const bestIntegerZoom = Math.floor(Math.min(widthRatio, heightRatio))
  return clampZoom(bestIntegerZoom, minZoom, maxZoom)
}
