import { describe, expect, it } from "vitest"
import {
  normalizePathname,
  resolveAppRoute,
  resolveEditorSection,
  resolvePlayShareId,
  buildEditorSectionPath,
  hasAuthCallbackParams,
  shouldRouteAuthCallbackToEditor,
  buildEditorAuthCallbackPath
} from "./route-utils.js"

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

  it("renders play at /play/abc123", () => {
    expect(resolveAppRoute("/play/abc123")).toBe("play")
  })

  it("renders play at /play/abc123/", () => {
    expect(resolveAppRoute("/play/abc123/")).toBe("play")
  })

  it("falls back to landing for unknown routes", () => {
    expect(resolveAppRoute("/com-crear-un-joc")).toBe("landing")
  })
})

describe("resolvePlayShareId", () => {
  it("extracts id from /play/:id", () => {
    expect(resolvePlayShareId("/play/abc123")).toBe("abc123")
  })

  it("handles trailing slash", () => {
    expect(resolvePlayShareId("/play/abc123/")).toBe("abc123")
  })

  it("returns null for non-play paths", () => {
    expect(resolvePlayShareId("/editor")).toBeNull()
  })

  it("returns null for /play without id", () => {
    expect(resolvePlayShareId("/play")).toBeNull()
    expect(resolvePlayShareId("/play/")).toBeNull()
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

  it("returns null for /editor/share", () => {
    expect(resolveEditorSection("/editor/share")).toBeNull()
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

  it("builds path for templates", () => {
    expect(buildEditorSectionPath("templates")).toBe("/editor/templates")
  })
})

describe("hasAuthCallbackParams", () => {
  it("detects auth callback params in query string", () => {
    expect(hasAuthCallbackParams("?code=abc", "")).toBe(true)
  })

  it("detects auth callback params in hash fragment", () => {
    expect(hasAuthCallbackParams("", "#access_token=token123")).toBe(true)
  })

  it("returns false when no known auth params are present", () => {
    expect(hasAuthCallbackParams("?foo=bar", "#section-1")).toBe(false)
  })
})

describe("shouldRouteAuthCallbackToEditor", () => {
  it("routes OAuth callback from landing to editor", () => {
    expect(shouldRouteAuthCallbackToEditor("/", "?code=abc", "")).toBe(true)
  })

  it("does not reroute when already on editor route", () => {
    expect(shouldRouteAuthCallbackToEditor("/editor", "?code=abc", "")).toBe(false)
  })

  it("does not reroute regular landing navigation", () => {
    expect(shouldRouteAuthCallbackToEditor("/", "", "")).toBe(false)
  })
})

describe("buildEditorAuthCallbackPath", () => {
  it("preserves callback query and hash", () => {
    expect(buildEditorAuthCallbackPath("?code=abc", "#state=xyz")).toBe("/editor?code=abc#state=xyz")
  })

  it("normalizes missing query/hash prefixes", () => {
    expect(buildEditorAuthCallbackPath("code=abc", "access_token=123")).toBe("/editor?code=abc#access_token=123")
  })

  it("returns plain /editor when no callback params exist", () => {
    expect(buildEditorAuthCallbackPath("", "")).toBe("/editor")
  })
})
