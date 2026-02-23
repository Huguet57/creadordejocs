export const MIN_SPRITE_ZOOM = 1
export const MAX_SPRITE_ZOOM = 24

export const ABSOLUTE_MIN_MAX_ZOOM = 6
export const ABSOLUTE_MAX_MAX_ZOOM = 40

export const ABSOLUTE_MIN_MIN_ZOOM = 0.1

/** At max zoom, canvas smallest dimension ≈ this many CSS px (calibrated so 32px → max 24). */
const REFERENCE_CANVAS_SIZE = 768

/** Sprites whose largest dimension exceeds this get sub-1 min zoom. */
const MIN_ZOOM_THRESHOLD = 384

/** At minimum zoom, the largest dimension targets this many CSS px. */
const TARGET_MIN_CANVAS_SIZE = 192

/** Ordered list of clean step values we allow for the zoom slider. */
const ALLOWED_STEPS = [0.01, 0.02, 0.05, 0.1, 0.2, 0.25, 0.5, 1] as const

/** Target number of discrete slider positions across the full zoom range. */
const TARGET_SLIDER_POSITIONS = 60

export function computeMaxZoom(spriteWidth: number, spriteHeight: number): number {
  if (spriteWidth <= 0 || spriteHeight <= 0) return ABSOLUTE_MIN_MAX_ZOOM
  const raw = Math.round(REFERENCE_CANVAS_SIZE / Math.min(spriteWidth, spriteHeight))
  return Math.min(ABSOLUTE_MAX_MAX_ZOOM, Math.max(ABSOLUTE_MIN_MAX_ZOOM, raw))
}

export function computeMinZoom(spriteWidth: number, spriteHeight: number): number {
  if (spriteWidth <= 0 || spriteHeight <= 0) return 1
  const maxDimension = Math.max(spriteWidth, spriteHeight)
  if (maxDimension <= MIN_ZOOM_THRESHOLD) return 1
  const raw = TARGET_MIN_CANVAS_SIZE / maxDimension
  return Math.max(ABSOLUTE_MIN_MIN_ZOOM, Math.round(raw * 20) / 20)
}

export function computeZoomStep(minZoom: number, maxZoom: number): number {
  const range = maxZoom - minZoom
  if (range <= 0) return ALLOWED_STEPS[0]
  const idealStep = range / TARGET_SLIDER_POSITIONS
  for (const step of ALLOWED_STEPS) {
    if (step >= idealStep) return step
  }
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
