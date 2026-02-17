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

  it("renders collection groups only when enabled", () => {
    const withoutCollections = renderToStaticMarkup(
      createElement(ActionSelectorPanel, {
        classNamePrefix: "if-action-selector",
        onSelectAction: vi.fn(),
        onClose: vi.fn(),
        hasListActions: false,
        hasMapActions: false
      })
    )
    expect(withoutCollections).not.toContain("Llistes")
    expect(withoutCollections).not.toContain("Mapes")

    const withCollections = renderToStaticMarkup(
      createElement(ActionSelectorPanel, {
        classNamePrefix: "if-action-selector",
        onSelectAction: vi.fn(),
        onClose: vi.fn(),
        hasListActions: true,
        hasMapActions: true
      })
    )
    expect(withCollections).toContain("Llistes")
    expect(withCollections).toContain("Mapes")
    expect(withCollections).toContain("Afegir al final")
    expect(withCollections).toContain("Afegir clau")
  })
})
