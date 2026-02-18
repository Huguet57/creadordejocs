export function hasVisibleSpritePixels(pixelsRgba: string[]): boolean {
  return pixelsRgba.some((pixel) => {
    const normalized = pixel.trim().toLowerCase()
    if (!normalized.startsWith("#")) return false
    if (normalized.length === 9) {
      // #RRGGBBAA
      const alphaHex = normalized.slice(7, 9)
      return Number.parseInt(alphaHex, 16) > 0
    }
    if (normalized.length === 7) {
      // #RRGGBB (legacy/no alpha) is considered visible.
      return true
    }
    return false
  })
}
