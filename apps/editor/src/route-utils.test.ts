import { describe, expect, it } from "vitest"
import { normalizePathname, resolveAppRoute } from "./route-utils.js"

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

  it("falls back to landing for unknown routes", () => {
    expect(resolveAppRoute("/com-crear-un-joc")).toBe("landing")
  })
})
