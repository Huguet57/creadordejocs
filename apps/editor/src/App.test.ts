import { describe, expect, it, vi } from "vitest"
import { handleSidebarSectionChange } from "./App.js"

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
