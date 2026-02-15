import { describe, expect, it } from "vitest"
import { normalizePathname, resolveAppRoute, resolveEditorSection, buildEditorSectionPath } from "./route-utils.js"

describe("normalizePathname", () => {
  it("keeps root path unchanged", () => {
    expect(normalizePathname("/")).toBe("/")
  })

  it("removes trailing slash on non-root paths", () => {
    expect(normalizePathname("/editor/")).toBe("/editor")
  })
})

describe("resolveAppRoute", () => {
  it("renders landing at root", () => {
    expect(resolveAppRoute("/")).toBe("landing")
  })

  it("renders editor at /editor", () => {
    expect(resolveAppRoute("/editor")).toBe("editor")
  })

  it("renders editor at /editor/", () => {
    expect(resolveAppRoute("/editor/")).toBe("editor")
  })

  it("renders editor at /editor/sprites", () => {
    expect(resolveAppRoute("/editor/sprites")).toBe("editor")
  })

  it("renders editor at /editor/objects/", () => {
    expect(resolveAppRoute("/editor/objects/")).toBe("editor")
  })

  it("falls back to landing for unknown routes", () => {
    expect(resolveAppRoute("/com-crear-un-joc")).toBe("landing")
  })
})

describe("resolveEditorSection", () => {
  it("returns null for root path", () => {
    expect(resolveEditorSection("/")).toBeNull()
  })

  it("returns null for /editor without section", () => {
    expect(resolveEditorSection("/editor")).toBeNull()
  })

  it("returns sprites for /editor/sprites", () => {
    expect(resolveEditorSection("/editor/sprites")).toBe("sprites")
  })

  it("returns objects for /editor/objects", () => {
    expect(resolveEditorSection("/editor/objects")).toBe("objects")
  })

  it("returns rooms for /editor/rooms", () => {
    expect(resolveEditorSection("/editor/rooms")).toBe("rooms")
  })

  it("returns run for /editor/run", () => {
    expect(resolveEditorSection("/editor/run")).toBe("run")
  })

  it("returns templates for /editor/templates", () => {
    expect(resolveEditorSection("/editor/templates")).toBe("templates")
  })

  it("returns globalVariables for /editor/globalVariables", () => {
    expect(resolveEditorSection("/editor/globalVariables")).toBe("globalVariables")
  })

  it("returns share for /editor/share", () => {
    expect(resolveEditorSection("/editor/share")).toBe("share")
  })

  it("returns null for unknown section", () => {
    expect(resolveEditorSection("/editor/unknown")).toBeNull()
  })

  it("handles trailing slash", () => {
    expect(resolveEditorSection("/editor/sprites/")).toBe("sprites")
  })
})

describe("buildEditorSectionPath", () => {
  it("builds path for sprites", () => {
    expect(buildEditorSectionPath("sprites")).toBe("/editor/sprites")
  })

  it("builds path for globalVariables", () => {
    expect(buildEditorSectionPath("globalVariables")).toBe("/editor/globalVariables")
  })

  it("builds path for run", () => {
    expect(buildEditorSectionPath("run")).toBe("/editor/run")
  })

  it("builds path for share", () => {
    expect(buildEditorSectionPath("share")).toBe("/editor/share")
  })
})
