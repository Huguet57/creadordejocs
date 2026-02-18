import { createElement } from "react"
import { renderToStaticMarkup } from "react-dom/server"
import { describe, expect, it } from "vitest"
import { SpriteFrameTimeline, type SpriteFrameTimelineProps } from "./SpriteFrameTimeline.js"

const noop = () => undefined

function renderTimeline(overrides: Partial<SpriteFrameTimelineProps> = {}): string {
  return renderToStaticMarkup(
    createElement(SpriteFrameTimeline, {
      frames: [
        { id: "f1", pixelsRgba: ["#ff0000ff"] },
        { id: "f2", pixelsRgba: ["#00ff00ff"] }
      ],
      activeFrameId: "f1",
      spriteWidth: 1,
      spriteHeight: 1,
      onSelectFrame: noop,
      onAddFrame: noop,
      onDuplicateFrame: noop,
      onDeleteFrame: noop,
      onReorderFrame: noop,
      ...overrides
    })
  )
}

describe("SpriteFrameTimeline", () => {
  it("renders one button per frame plus add button", () => {
    const html = renderTimeline()
    expect((html.match(/mvp16-sprite-frame-thumb/g) ?? []).length).toBe(2)
    expect(html).toContain("mvp16-sprite-frame-add")
  })

  it("shows 1-based frame numbers", () => {
    const html = renderTimeline()
    expect(html).toContain(">1<")
    expect(html).toContain(">2<")
  })

  it("marks active frame with indigo border class", () => {
    const html = renderTimeline({ activeFrameId: "f1" })
    expect(html).toContain("border-indigo-500")
  })

  it("disables delete button when single frame", () => {
    const html = renderTimeline({
      frames: [{ id: "f1", pixelsRgba: [] }],
      activeFrameId: "f1"
    })
    expect(html).toContain("disabled")
  })

  it("renders delete buttons for each frame when multiple frames", () => {
    const html = renderTimeline()
    const deleteMatches = html.match(/mvp16-sprite-frame-delete/g) ?? []
    expect(deleteMatches.length).toBe(2)
  })

  it("renders empty placeholder for frames with no visible pixels", () => {
    const html = renderTimeline({
      frames: [{ id: "f1", pixelsRgba: [] }],
      activeFrameId: "f1"
    })
    expect(html).toContain("mvp16-sprite-frame-empty")
  })

  it("renders empty placeholder in SSR even for frames with pixels (no canvas in Node)", () => {
    // spritePixelsToDataUrl returns "" in Node.js (no document), so
    // all frames show the empty placeholder in SSR tests
    const html = renderTimeline({
      frames: [{ id: "f1", pixelsRgba: ["#ff0000ff"] }],
      activeFrameId: "f1"
    })
    expect(html).toContain("mvp16-sprite-frame-empty")
  })

  it("renders the timeline container with correct class", () => {
    const html = renderTimeline()
    expect(html).toContain("mvp16-sprite-frame-timeline")
  })
})
