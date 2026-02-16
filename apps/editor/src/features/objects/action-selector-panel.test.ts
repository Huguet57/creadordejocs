import { createElement } from "react"
import { renderToStaticMarkup } from "react-dom/server"
import { describe, expect, it, vi } from "vitest"
import { ActionSelectorPanel } from "./ActionSelectorPanel.js"

describe("ActionSelectorPanel", () => {
  it("renders prefixed class names and action labels", () => {
    const markup = renderToStaticMarkup(
      createElement(ActionSelectorPanel, {
        classNamePrefix: "if-action-selector",
        onSelectAction: vi.fn(),
        onClose: vi.fn()
      })
    )

    expect(markup).toContain("if-action-selector-panel")
    expect(markup).toContain("if-action-selector-item")
    expect(markup).toContain("Afegir acció")
    expect(markup).toContain("Moure")
    expect(markup).toContain("Variable")
  })
})
