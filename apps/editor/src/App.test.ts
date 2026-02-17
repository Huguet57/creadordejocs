import { describe, expect, it, vi } from "vitest"
import { createElement } from "react"
import { renderToStaticMarkup } from "react-dom/server"
import { handleSidebarSectionChange } from "./App.js"
import { EditorSidebarCompact } from "./layout/EditorSidebarCompact.js"
import { ACTION_CATEGORIES } from "./features/editor-state/types.js"

describe("handleSidebarSectionChange", () => {
  it("resets runtime before changing section when leaving run", () => {
    const calls: string[] = []
    const reset = vi.fn(() => {
      calls.push("reset")
    })
    const setActiveSection = vi.fn(() => {
      calls.push("set-section")
    })

    handleSidebarSectionChange("run", "objects", true, reset, setActiveSection)

    expect(reset).toHaveBeenCalledTimes(1)
    expect(setActiveSection).toHaveBeenCalledTimes(1)
    expect(calls).toEqual(["reset", "set-section"])
  })

  it("changes section without reset when runtime is not active", () => {
    const reset = vi.fn()
    const setActiveSection = vi.fn()

    handleSidebarSectionChange("run", "objects", false, reset, setActiveSection)

    expect(reset).not.toHaveBeenCalled()
    expect(setActiveSection).toHaveBeenCalledWith("objects")
  })
})

describe("sound-free editor UI", () => {
  it("does not show a sounds entry in the compact sidebar", () => {
    const markup = renderToStaticMarkup(
      createElement(EditorSidebarCompact, {
        activeSection: "sprites",
        onSectionChange: vi.fn()
      })
    )

    expect(markup).not.toContain("Sounds")
    expect(markup).not.toContain("sidebar-sounds")
  })

  it("does not expose playSound in action categories", () => {
    const actionTypes = ACTION_CATEGORIES.flatMap((category) => category.types)
    expect(actionTypes).not.toContain("playSound")
  })

  it("does not show a share entry in the compact sidebar", () => {
    const markup = renderToStaticMarkup(
      createElement(EditorSidebarCompact, {
        activeSection: "sprites",
        onSectionChange: vi.fn()
      })
    )

    expect(markup).not.toContain("Share")
    expect(markup).not.toContain("sidebar-share")
  })

  it("shows templates button in compact sidebar without import label", () => {
    const markup = renderToStaticMarkup(
      createElement(EditorSidebarCompact, {
        activeSection: "templates",
        onSectionChange: vi.fn()
      })
    )

    expect(markup).toContain("sidebar-templates")
    expect(markup).not.toContain("Import")
  })
})
