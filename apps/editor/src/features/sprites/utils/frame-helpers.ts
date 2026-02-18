type FrameLike = { id: string; pixelsRgba: string[] }

export function resolveActiveFramePixels(
  frames: FrameLike[],
  activeFrameId: string | null,
  legacyPixelsRgba: string[]
): string[] {
  if (!activeFrameId || frames.length === 0) return legacyPixelsRgba
  const frame = frames.find((f) => f.id === activeFrameId)
  return frame ? frame.pixelsRgba : legacyPixelsRgba
}

export function resolveNextActiveFrameId(
  frames: { id: string }[],
  currentActiveFrameId: string | null
): string | null {
  if (frames.length === 0) return null
  if (currentActiveFrameId && frames.some((f) => f.id === currentActiveFrameId)) return currentActiveFrameId
  return frames[0]?.id ?? null
}

export function resolveNeighborFrameId(
  frames: { id: string }[],
  deletedFrameId: string
): string | null {
  const idx = frames.findIndex((f) => f.id === deletedFrameId)
  if (idx === -1 || frames.length <= 1) return null
  return (frames[idx + 1] ?? frames[idx - 1])?.id ?? null
}
