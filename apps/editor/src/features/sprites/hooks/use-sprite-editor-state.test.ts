import { describe, expect, it } from "vitest"
import { resolveRecentPaintTool } from "./use-sprite-editor-state.js"

describe("resolveRecentPaintTool", () => {
  it("updates to pencil when pencil is selected", () => {
    expect(resolveRecentPaintTool("bucket_fill", "pencil")).toBe("pencil")
  })

  it("updates to bucket_fill when bucket is selected", () => {
    expect(resolveRecentPaintTool("pencil", "bucket_fill")).toBe("bucket_fill")
  })

  it("keeps previous paint tool when selecting non-paint tools", () => {
    expect(resolveRecentPaintTool("bucket_fill", "color_picker")).toBe("bucket_fill")
    expect(resolveRecentPaintTool("pencil", "eraser")).toBe("pencil")
    expect(resolveRecentPaintTool("bucket_fill", "magic_wand")).toBe("bucket_fill")
  })
})
