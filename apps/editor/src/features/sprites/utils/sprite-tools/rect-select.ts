export function indicesInRect(
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  gridWidth: number,
  gridHeight: number
): Set<number> {
  const minX = Math.max(0, Math.min(x1, x2))
  const maxX = Math.min(gridWidth - 1, Math.max(x1, x2))
  const minY = Math.max(0, Math.min(y1, y2))
  const maxY = Math.min(gridHeight - 1, Math.max(y1, y2))

  const result = new Set<number>()
  for (let y = minY; y <= maxY; y++) {
    for (let x = minX; x <= maxX; x++) {
      result.add(y * gridWidth + x)
    }
  }
  return result
}
