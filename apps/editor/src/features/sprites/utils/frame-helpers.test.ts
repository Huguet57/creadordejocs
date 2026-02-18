import { describe, expect, it } from "vitest"
import { resolveActiveFramePixels, resolveNextActiveFrameId, resolveNeighborFrameId } from "./frame-helpers.js"

describe("resolveActiveFramePixels", () => {
  it("returns active frame pixels when frames exist and activeFrameId matches", () => {
    const frames = [
      { id: "f1", pixelsRgba: ["#ff0000ff"] },
      { id: "f2", pixelsRgba: ["#00ff00ff"] }
    ]
    expect(resolveActiveFramePixels(frames, "f2", ["#0000ffff"])).toEqual(["#00ff00ff"])
  })

  it("falls back to legacy pixelsRgba when frames is empty", () => {
    expect(resolveActiveFramePixels([], "f1", ["#0000ffff"])).toEqual(["#0000ffff"])
  })

  it("falls back to legacy pixelsRgba when activeFrameId not found", () => {
    const frames = [{ id: "f1", pixelsRgba: ["#ff0000ff"] }]
    expect(resolveActiveFramePixels(frames, "missing", ["#0000ffff"])).toEqual(["#0000ffff"])
  })

  it("falls back to legacy pixelsRgba when activeFrameId is null", () => {
    const frames = [{ id: "f1", pixelsRgba: ["#ff0000ff"] }]
    expect(resolveActiveFramePixels(frames, null, ["#0000ffff"])).toEqual(["#0000ffff"])
  })
})

describe("resolveNextActiveFrameId", () => {
  const frames = [{ id: "f1" }, { id: "f2" }, { id: "f3" }]

  it("returns first frame id when activeFrameId is null", () => {
    expect(resolveNextActiveFrameId(frames, null)).toBe("f1")
  })

  it("returns null when frames is empty", () => {
    expect(resolveNextActiveFrameId([], null)).toBeNull()
  })

  it("keeps activeFrameId when it still exists in frames", () => {
    expect(resolveNextActiveFrameId(frames, "f2")).toBe("f2")
  })

  it("falls back to first frame when activeFrameId no longer exists", () => {
    expect(resolveNextActiveFrameId(frames, "deleted")).toBe("f1")
  })
})

describe("resolveNeighborFrameId", () => {
  it("returns right neighbor when deleting middle frame", () => {
    const frames = [{ id: "f1" }, { id: "f2" }, { id: "f3" }]
    expect(resolveNeighborFrameId(frames, "f2")).toBe("f3")
  })

  it("returns left neighbor when deleting last frame in list", () => {
    const frames = [{ id: "f1" }, { id: "f2" }, { id: "f3" }]
    expect(resolveNeighborFrameId(frames, "f3")).toBe("f2")
  })

  it("returns right neighbor when deleting first frame", () => {
    const frames = [{ id: "f1" }, { id: "f2" }]
    expect(resolveNeighborFrameId(frames, "f1")).toBe("f2")
  })

  it("returns null when deleting the only frame", () => {
    const frames = [{ id: "f1" }]
    expect(resolveNeighborFrameId(frames, "f1")).toBeNull()
  })

  it("returns null when frame not found", () => {
    const frames = [{ id: "f1" }, { id: "f2" }]
    expect(resolveNeighborFrameId(frames, "missing")).toBeNull()
  })
})
