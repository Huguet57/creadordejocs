import { hasVisibleSpritePixels } from "./has-visible-pixels.js"
import { spritePixelsToDataUrl } from "./sprite-preview-source.js"

export type FramePreviewInput = {
  id: string
  pixelsRgba: string[]
}

type FramePreviewCacheEntry = {
  pixelsRgbaRef: string[]
  spriteWidth: number
  spriteHeight: number
  previewUrl: string
}

export type FramePreviewCache = Map<string, FramePreviewCacheEntry>

type ResolveFramePreviewUrlsWithCacheInput = {
  frames: FramePreviewInput[]
  spriteWidth: number
  spriteHeight: number
  cache: FramePreviewCache
  resolvePreview?: (pixelsRgba: string[], width: number, height: number) => string
}

export function resolveFramePreviewUrlsWithCache({
  frames,
  spriteWidth,
  spriteHeight,
  cache,
  resolvePreview = spritePixelsToDataUrl
}: ResolveFramePreviewUrlsWithCacheInput): Map<string, string> {
  const activeIds = new Set<string>()
  const previewsById = new Map<string, string>()

  for (const frame of frames) {
    activeIds.add(frame.id)
    const cached = cache.get(frame.id)

    if (
      cached?.pixelsRgbaRef === frame.pixelsRgba &&
      cached?.spriteWidth === spriteWidth &&
      cached?.spriteHeight === spriteHeight
    ) {
      previewsById.set(frame.id, cached.previewUrl)
      continue
    }

    const previewUrl = hasVisibleSpritePixels(frame.pixelsRgba)
      ? resolvePreview(frame.pixelsRgba, spriteWidth, spriteHeight)
      : ""

    cache.set(frame.id, {
      pixelsRgbaRef: frame.pixelsRgba,
      spriteWidth,
      spriteHeight,
      previewUrl
    })
    previewsById.set(frame.id, previewUrl)
  }

  for (const frameId of cache.keys()) {
    if (!activeIds.has(frameId)) {
      cache.delete(frameId)
    }
  }

  return previewsById
}
