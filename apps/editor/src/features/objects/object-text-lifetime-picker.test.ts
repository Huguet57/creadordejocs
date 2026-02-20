import { createElement } from "react"
import { renderToStaticMarkup } from "react-dom/server"
import { describe, expect, it, vi } from "vitest"
import { ObjectTextLifetimePicker } from "./ObjectTextLifetimePicker.js"

describe("ObjectTextLifetimePicker", () => {
  it("shows persistent in trigger when mode is persistent", () => {
    const markup = renderToStaticMarkup(
      createElement(ObjectTextLifetimePicker, {
        mode: "persistent",
        durationMs: { source: "literal", value: 2000 },
        globalVariables: [],
        internalVariables: [],
        onChange: vi.fn()
      })
    )

    expect(markup).toContain("persistent")
  })

  it("shows literal ms in trigger when mode is temporary", () => {
    const markup = renderToStaticMarkup(
      createElement(ObjectTextLifetimePicker, {
        mode: "temporary",
        durationMs: { source: "literal", value: 1500 },
        globalVariables: [],
        internalVariables: [],
        onChange: vi.fn()
      })
    )

    expect(markup).toContain("1500 ms")
  })
})
