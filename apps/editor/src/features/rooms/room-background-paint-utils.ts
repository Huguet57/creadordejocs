import type { ProjectV1 } from "@creadordejocs/project-format"

export type RoomBackgroundPaintStamp = NonNullable<ProjectV1["rooms"][number]["backgroundPaintStamps"]>[number]

type Point = { x: number; y: number }

type SpriteDimensions = { width: number; height: number }

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
}): RoomBackgroundPaintStamp[] {
  const path = interpolatePaintStrokePositions({
    from: input.from,
    to: input.to,
    spriteWidth: input.spriteWidth,
    spriteHeight: input.spriteHeight
  })
  const next = [...input.stamps]

  for (const point of path) {
    const stamp: RoomBackgroundPaintStamp = {
      spriteId: input.spriteId,
      x: point.x,
      y: point.y
    }
    const last = next[next.length - 1]
    if (last?.spriteId === stamp.spriteId && last?.x === stamp.x && last?.y === stamp.y) {
      continue
    }
    next.push(stamp)
  }

  return next
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
