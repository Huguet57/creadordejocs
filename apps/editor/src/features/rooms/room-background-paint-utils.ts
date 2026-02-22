import type { ProjectV1 } from "@creadordejocs/project-format"

export type RoomBackgroundPaintStamp = NonNullable<ProjectV1["rooms"][number]["backgroundPaintStamps"]>[number]

type Point = { x: number; y: number }

type SpriteDimensions = { width: number; height: number }

type Rect = { x: number; y: number; width: number; height: number }

function normalizeSpriteDimension(value: number): number {
  if (!Number.isFinite(value)) {
    return 1
  }
  return Math.max(1, Math.round(value))
}

export function snapBackgroundPaintPosition(input: {
  pointerX: number
  pointerY: number
  spriteWidth: number
  spriteHeight: number
  roomWidth: number
  roomHeight: number
}): Point {
  const spriteWidth = normalizeSpriteDimension(input.spriteWidth)
  const spriteHeight = normalizeSpriteDimension(input.spriteHeight)
  const roomWidth = Math.max(1, Math.round(input.roomWidth))
  const roomHeight = Math.max(1, Math.round(input.roomHeight))

  const maxX = Math.max(0, roomWidth - spriteWidth)
  const maxY = Math.max(0, roomHeight - spriteHeight)
  const snappedX = Math.floor(input.pointerX / spriteWidth) * spriteWidth
  const snappedY = Math.floor(input.pointerY / spriteHeight) * spriteHeight

  return {
    x: Math.max(0, Math.min(maxX, snappedX)),
    y: Math.max(0, Math.min(maxY, snappedY))
  }
}

function buildBresenhamPath(from: Point, to: Point): Point[] {
  const points: Point[] = []
  let x = from.x
  let y = from.y
  const dx = Math.abs(to.x - from.x)
  const dy = Math.abs(to.y - from.y)
  const sx = from.x < to.x ? 1 : -1
  const sy = from.y < to.y ? 1 : -1
  let err = dx - dy

  while (true) {
    points.push({ x, y })
    if (x === to.x && y === to.y) {
      break
    }
    const twiceErr = err * 2
    if (twiceErr > -dy) {
      err -= dy
      x += sx
    }
    if (twiceErr < dx) {
      err += dx
      y += sy
    }
  }

  return points
}

function rectanglesIntersect(left: Rect, right: Rect): boolean {
  return (
    left.x < right.x + right.width &&
    left.x + left.width > right.x &&
    left.y < right.y + right.height &&
    left.y + left.height > right.y
  )
}

function resolveNormalizedDimensions(
  spriteId: string,
  fallbackWidth: number,
  fallbackHeight: number,
  resolveSpriteDimensions?: (spriteId: string) => SpriteDimensions | null
): SpriteDimensions {
  const resolved = resolveSpriteDimensions?.(spriteId)
  return {
    width: normalizeSpriteDimension(resolved?.width ?? fallbackWidth),
    height: normalizeSpriteDimension(resolved?.height ?? fallbackHeight)
  }
}

function stampToRect(stamp: RoomBackgroundPaintStamp, width: number, height: number): Rect {
  return {
    x: stamp.x,
    y: stamp.y,
    width,
    height
  }
}

function getIntersectingStampIndexes(input: {
  stamps: RoomBackgroundPaintStamp[]
  rect: Rect
  fallbackWidth: number
  fallbackHeight: number
  resolveSpriteDimensions: ((spriteId: string) => SpriteDimensions | null) | undefined
}): number[] {
  const intersectingIndexes: number[] = []
  for (let index = 0; index < input.stamps.length; index += 1) {
    const stamp = input.stamps[index]
    if (!stamp) continue
    const dimensions = resolveNormalizedDimensions(
      stamp.spriteId,
      input.fallbackWidth,
      input.fallbackHeight,
      input.resolveSpriteDimensions
    )
    const stampRect = stampToRect(stamp, dimensions.width, dimensions.height)
    if (rectanglesIntersect(input.rect, stampRect)) {
      intersectingIndexes.push(index)
    }
  }
  return intersectingIndexes
}

export function interpolatePaintStrokePositions(input: {
  from: Point
  to: Point
  spriteWidth: number
  spriteHeight: number
}): Point[] {
  const spriteWidth = normalizeSpriteDimension(input.spriteWidth)
  const spriteHeight = normalizeSpriteDimension(input.spriteHeight)
  const fromCell = { x: Math.round(input.from.x / spriteWidth), y: Math.round(input.from.y / spriteHeight) }
  const toCell = { x: Math.round(input.to.x / spriteWidth), y: Math.round(input.to.y / spriteHeight) }
  return buildBresenhamPath(fromCell, toCell).map((cell) => ({
    x: cell.x * spriteWidth,
    y: cell.y * spriteHeight
  }))
}

export function applyBrushStrokeToStamps(input: {
  stamps: RoomBackgroundPaintStamp[]
  spriteId: string
  from: Point
  to: Point
  spriteWidth: number
  spriteHeight: number
  resolveSpriteDimensions?: (spriteId: string) => SpriteDimensions | null
}): RoomBackgroundPaintStamp[] {
  const brushWidth = normalizeSpriteDimension(input.spriteWidth)
  const brushHeight = normalizeSpriteDimension(input.spriteHeight)
  const path = interpolatePaintStrokePositions({
    from: input.from,
    to: input.to,
    spriteWidth: brushWidth,
    spriteHeight: brushHeight
  })

  // Pre-resolve dimensions for all stamps and build spatial hash
  const cellW = brushWidth
  const cellH = brushHeight
  const grid = new Map<string, number[]>()
  const stampDims: SpriteDimensions[] = new Array(input.stamps.length) as SpriteDimensions[]

  for (let i = 0; i < input.stamps.length; i += 1) {
    const stamp = input.stamps[i]!
    const dims = resolveNormalizedDimensions(
      stamp.spriteId,
      brushWidth,
      brushHeight,
      input.resolveSpriteDimensions
    )
    stampDims[i] = dims
    const minCX = Math.floor(stamp.x / cellW)
    const maxCX = Math.floor((stamp.x + dims.width - 1) / cellW)
    const minCY = Math.floor(stamp.y / cellH)
    const maxCY = Math.floor((stamp.y + dims.height - 1) / cellH)
    for (let cx = minCX; cx <= maxCX; cx += 1) {
      for (let cy = minCY; cy <= maxCY; cy += 1) {
        const key = `${cx},${cy}`
        const bucket = grid.get(key)
        if (bucket) {
          bucket.push(i)
        } else {
          grid.set(key, [i])
        }
      }
    }
  }

  const removedIndexes = new Set<number>()
  const addedStamps: RoomBackgroundPaintStamp[] = []

  for (const point of path) {
    const candidateRect: Rect = { x: point.x, y: point.y, width: brushWidth, height: brushHeight }

    // Query spatial hash — check only cells the candidate rect overlaps
    const minSX = Math.floor(candidateRect.x / cellW)
    const maxSX = Math.floor((candidateRect.x + candidateRect.width - 1) / cellW)
    const minSY = Math.floor(candidateRect.y / cellH)
    const maxSY = Math.floor((candidateRect.y + candidateRect.height - 1) / cellH)

    const hits: number[] = []
    const checked = new Set<number>()
    for (let cx = minSX; cx <= maxSX; cx += 1) {
      for (let cy = minSY; cy <= maxSY; cy += 1) {
        const bucket = grid.get(`${cx},${cy}`)
        if (!bucket) continue
        for (const idx of bucket) {
          if (removedIndexes.has(idx) || checked.has(idx)) continue
          checked.add(idx)
          const s = input.stamps[idx]!
          const d = stampDims[idx]!
          if (rectanglesIntersect(candidateRect, { x: s.x, y: s.y, width: d.width, height: d.height })) {
            hits.push(idx)
          }
        }
      }
    }

    if (hits.length > 0) {
      const hasDifferentSpriteOverlap = hits.some(
        (idx) => input.stamps[idx]?.spriteId !== input.spriteId
      )
      if (!hasDifferentSpriteOverlap) {
        continue
      }
      for (const idx of hits) {
        removedIndexes.add(idx)
      }
    }

    addedStamps.push({ spriteId: input.spriteId, x: point.x, y: point.y })
  }

  // Build result array: original stamps minus removed, plus new stamps
  if (removedIndexes.size === 0 && addedStamps.length === 0) {
    return input.stamps
  }

  const result: RoomBackgroundPaintStamp[] = []
  for (let i = 0; i < input.stamps.length; i += 1) {
    if (!removedIndexes.has(i)) {
      result.push(input.stamps[i]!)
    }
  }
  for (const stamp of addedStamps) {
    result.push(stamp)
  }
  return result
}

export function canBrushStampApplyAtRect(input: {
  stamps: RoomBackgroundPaintStamp[]
  spriteId: string
  rectX: number
  rectY: number
  rectWidth: number
  rectHeight: number
  resolveSpriteDimensions: (spriteId: string) => SpriteDimensions | null
}): boolean {
  const rect: Rect = {
    x: input.rectX,
    y: input.rectY,
    width: normalizeSpriteDimension(input.rectWidth),
    height: normalizeSpriteDimension(input.rectHeight)
  }
  const intersectingIndexes = getIntersectingStampIndexes({
    stamps: input.stamps,
    rect,
    fallbackWidth: rect.width,
    fallbackHeight: rect.height,
    resolveSpriteDimensions: input.resolveSpriteDimensions
  })
  if (intersectingIndexes.length === 0) {
    return true
  }
  return intersectingIndexes.some((index) => input.stamps[index]?.spriteId !== input.spriteId)
}

export function eraseStampsIntersectingRect(input: {
  stamps: RoomBackgroundPaintStamp[]
  rectX: number
  rectY: number
  rectWidth: number
  rectHeight: number
  resolveSpriteDimensions: (spriteId: string) => SpriteDimensions | null
}): RoomBackgroundPaintStamp[] {
  const rect: Rect = {
    x: input.rectX,
    y: input.rectY,
    width: normalizeSpriteDimension(input.rectWidth),
    height: normalizeSpriteDimension(input.rectHeight)
  }

  return input.stamps.filter((stamp) => {
    const dimensions = input.resolveSpriteDimensions(stamp.spriteId)
    if (!dimensions) {
      return true
    }
    const stampRect = stampToRect(
      stamp,
      normalizeSpriteDimension(dimensions.width),
      normalizeSpriteDimension(dimensions.height)
    )
    return !rectanglesIntersect(rect, stampRect)
  })
}

export function hasStampIntersectionWithRect(input: {
  stamps: RoomBackgroundPaintStamp[]
  rectX: number
  rectY: number
  rectWidth: number
  rectHeight: number
  resolveSpriteDimensions: (spriteId: string) => SpriteDimensions | null
}): boolean {
  const rect: Rect = {
    x: input.rectX,
    y: input.rectY,
    width: normalizeSpriteDimension(input.rectWidth),
    height: normalizeSpriteDimension(input.rectHeight)
  }

  return input.stamps.some((stamp) => {
    const dimensions = input.resolveSpriteDimensions(stamp.spriteId)
    if (!dimensions) {
      return false
    }
    const stampRect = stampToRect(
      stamp,
      normalizeSpriteDimension(dimensions.width),
      normalizeSpriteDimension(dimensions.height)
    )
    return rectanglesIntersect(rect, stampRect)
  })
}

export function eraseStampsAlongStroke(input: {
  stamps: RoomBackgroundPaintStamp[]
  from: Point
  to: Point
  eraserWidth: number
  eraserHeight: number
  resolveSpriteDimensions: (spriteId: string) => SpriteDimensions | null
}): RoomBackgroundPaintStamp[] {
  const eraserWidth = normalizeSpriteDimension(input.eraserWidth)
  const eraserHeight = normalizeSpriteDimension(input.eraserHeight)
  const eraserPath = interpolatePaintStrokePositions({
    from: input.from,
    to: input.to,
    spriteWidth: eraserWidth,
    spriteHeight: eraserHeight
  })

  let nextStamps = input.stamps
  for (const point of eraserPath) {
    nextStamps = eraseStampsIntersectingRect({
      stamps: nextStamps,
      rectX: point.x,
      rectY: point.y,
      rectWidth: eraserWidth,
      rectHeight: eraserHeight,
      resolveSpriteDimensions: input.resolveSpriteDimensions
    })
  }
  return nextStamps
}

export function eraseTopmostStampAtPoint(input: {
  stamps: RoomBackgroundPaintStamp[]
  pointX: number
  pointY: number
  resolveSpriteDimensions: (spriteId: string) => SpriteDimensions | null
}): RoomBackgroundPaintStamp[] {
  for (let index = input.stamps.length - 1; index >= 0; index -= 1) {
    const stamp = input.stamps[index]
    if (!stamp) {
      continue
    }
    const spriteDimensions = input.resolveSpriteDimensions(stamp.spriteId)
    if (!spriteDimensions) {
      continue
    }
    const width = normalizeSpriteDimension(spriteDimensions.width)
    const height = normalizeSpriteDimension(spriteDimensions.height)
    const containsPoint =
      input.pointX >= stamp.x &&
      input.pointX < stamp.x + width &&
      input.pointY >= stamp.y &&
      input.pointY < stamp.y + height
    if (!containsPoint) {
      continue
    }
    return [...input.stamps.slice(0, index), ...input.stamps.slice(index + 1)]
  }

  return input.stamps
}
