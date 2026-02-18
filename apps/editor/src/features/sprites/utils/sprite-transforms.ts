type SpritePixelGrid = {
  width: number
  height: number
  pixelsRgba: string[]
}

export function flipHorizontal(grid: SpritePixelGrid): SpritePixelGrid {
  const { width, height, pixelsRgba } = grid
  const next: string[] = new Array<string>(width * height)
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      next[y * width + (width - 1 - x)] = pixelsRgba[y * width + x]!
    }
  }
  return { width, height, pixelsRgba: next }
}

export function flipVertical(grid: SpritePixelGrid): SpritePixelGrid {
  const { width, height, pixelsRgba } = grid
  const next: string[] = new Array<string>(width * height)
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      next[(height - 1 - y) * width + x] = pixelsRgba[y * width + x]!
    }
  }
  return { width, height, pixelsRgba: next }
}

export function rotateCW(grid: SpritePixelGrid): SpritePixelGrid {
  const { width, height, pixelsRgba } = grid
  const newWidth = height
  const newHeight = width
  const next: string[] = new Array<string>(newWidth * newHeight)
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      next[x * newWidth + (height - 1 - y)] = pixelsRgba[y * width + x]!
    }
  }
  return { width: newWidth, height: newHeight, pixelsRgba: next }
}

export function rotateCCW(grid: SpritePixelGrid): SpritePixelGrid {
  const { width, height, pixelsRgba } = grid
  const newWidth = height
  const newHeight = width
  const next: string[] = new Array<string>(newWidth * newHeight)
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      next[(width - 1 - x) * newWidth + y] = pixelsRgba[y * width + x]!
    }
  }
  return { width: newWidth, height: newHeight, pixelsRgba: next }
}
