export const MIN_SPRITE_ZOOM = 1
export const MAX_SPRITE_ZOOM = 24

export const ABSOLUTE_MIN_MAX_ZOOM = 6
export const ABSOLUTE_MAX_MAX_ZOOM = 40

/** At max zoom, canvas largest dimension ≈ this many CSS px (calibrated so 32px → max 24). */
const REFERENCE_CANVAS_SIZE = 768

export function computeMaxZoom(spriteWidth: number, spriteHeight: number): number {
  if (spriteWidth <= 0 || spriteHeight <= 0) return ABSOLUTE_MIN_MAX_ZOOM
  const raw = Math.round(REFERENCE_CANVAS_SIZE / Math.max(spriteWidth, spriteHeight))
  return Math.min(ABSOLUTE_MAX_MAX_ZOOM, Math.max(ABSOLUTE_MIN_MAX_ZOOM, raw))
}

export function computeZoomStep(maxZoom: number): number {
  const range = maxZoom - MIN_SPRITE_ZOOM
  if (range <= 5) return 0.25
  if (range <= 11) return 0.5
  return 1
}

function roundToStep(value: number, step: number): number {
  return Math.round(value / step) * step
}

function floorToStep(value: number, step: number): number {
  return Math.floor(value / step) * step
}

export function clampZoom(value: number, min = MIN_SPRITE_ZOOM, max = MAX_SPRITE_ZOOM, step = 1): number {
  if (!Number.isFinite(value)) return min
  const rounded = roundToStep(value, step)
  return Math.min(max, Math.max(min, rounded))
}

type ComputeFitZoomInput = {
  viewportWidth: number
  viewportHeight: number
  spriteWidth: number
  spriteHeight: number
  minZoom?: number
  maxZoom?: number
  step?: number
}

export function computeFitZoom({
  viewportWidth,
  viewportHeight,
  spriteWidth,
  spriteHeight,
  minZoom = MIN_SPRITE_ZOOM,
  maxZoom = MAX_SPRITE_ZOOM,
  step = 1
}: ComputeFitZoomInput): number {
  if (viewportWidth <= 0 || viewportHeight <= 0 || spriteWidth <= 0 || spriteHeight <= 0) {
    return minZoom
  }

  const widthRatio = viewportWidth / spriteWidth
  const heightRatio = viewportHeight / spriteHeight
  const bestFit = floorToStep(Math.min(widthRatio, heightRatio), step)
  return clampZoom(bestFit, minZoom, maxZoom, step)
}
