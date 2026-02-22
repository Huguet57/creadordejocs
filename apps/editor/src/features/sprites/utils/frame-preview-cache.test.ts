import { describe, expect, it, vi } from "vitest"
import { resolveFramePreviewUrlsWithCache, type FramePreviewCache } from "./frame-preview-cache.js"

describe("resolveFramePreviewUrlsWithCache", () => {
  it("reuses cached previews for unchanged frame references", () => {
    const frames = [
      { id: "f1", pixelsRgba: ["#ff0000ff"] },
      { id: "f2", pixelsRgba: ["#00ff00ff"] }
    ]
    const cache: FramePreviewCache = new Map()
    const resolvePreview = vi.fn((pixels: string[]) => `preview:${pixels[0]}`)

    const first = resolveFramePreviewUrlsWithCache({
      frames,
      spriteWidth: 1,
      spriteHeight: 1,
      cache,
      resolvePreview
    })

    expect(resolvePreview).toHaveBeenCalledTimes(2)
    expect(first.get("f1")).toBe("preview:#ff0000ff")
    expect(first.get("f2")).toBe("preview:#00ff00ff")

    resolvePreview.mockClear()

    const second = resolveFramePreviewUrlsWithCache({
      frames,
      spriteWidth: 1,
      spriteHeight: 1,
      cache,
      resolvePreview
    })

    expect(resolvePreview).not.toHaveBeenCalled()
    expect(second.get("f1")).toBe("preview:#ff0000ff")
    expect(second.get("f2")).toBe("preview:#00ff00ff")
  })

  it("recomputes only changed frames and removes stale cache entries", () => {
    const frameOne = { id: "f1", pixelsRgba: ["#ff0000ff"] }
    const frameTwo = { id: "f2", pixelsRgba: ["#00ff00ff"] }
    const cache: FramePreviewCache = new Map()
    const resolvePreview = vi.fn((pixels: string[]) => `preview:${pixels[0]}`)

    resolveFramePreviewUrlsWithCache({
      frames: [frameOne, frameTwo],
      spriteWidth: 1,
      spriteHeight: 1,
      cache,
      resolvePreview
    })

    resolvePreview.mockClear()

    const updatedFrameTwo = { ...frameTwo, pixelsRgba: ["#0000ffff"] }
    const next = resolveFramePreviewUrlsWithCache({
      frames: [updatedFrameTwo],
      spriteWidth: 1,
      spriteHeight: 1,
      cache,
      resolvePreview
    })

    expect(resolvePreview).toHaveBeenCalledTimes(1)
    expect(resolvePreview).toHaveBeenCalledWith(updatedFrameTwo.pixelsRgba, 1, 1)
    expect(next.get("f2")).toBe("preview:#0000ffff")
    expect(next.has("f1")).toBe(false)
    expect(cache.has("f1")).toBe(false)
  })

  it("skips preview generation for fully transparent frames", () => {
    const cache: FramePreviewCache = new Map()
    const resolvePreview = vi.fn(() => "preview")

    const result = resolveFramePreviewUrlsWithCache({
      frames: [{ id: "transparent", pixelsRgba: ["#00000000"] }],
      spriteWidth: 1,
      spriteHeight: 1,
      cache,
      resolvePreview
    })

    expect(resolvePreview).not.toHaveBeenCalled()
    expect(result.get("transparent")).toBe("")
  })
})
