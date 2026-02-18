type SpriteCanvasPointerInput = {
  clientX: number
  clientY: number
  canvasLeft: number
  canvasTop: number
  zoom: number
  spriteWidth: number
  spriteHeight: number
}

export function getSpritePixelFromCanvasPointer({
  clientX,
  clientY,
  canvasLeft,
  canvasTop,
  zoom,
  spriteWidth,
  spriteHeight
}: SpriteCanvasPointerInput): { x: number; y: number } | null {
  if (zoom <= 0 || spriteWidth <= 0 || spriteHeight <= 0) {
    return null
  }

  const x = Math.floor((clientX - canvasLeft) / zoom)
  const y = Math.floor((clientY - canvasTop) / zoom)
  if (x < 0 || y < 0 || x >= spriteWidth || y >= spriteHeight) {
    return null
  }

  return { x, y }
}
