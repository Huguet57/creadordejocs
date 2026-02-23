import { describe, expect, it } from "vitest"
import {
  DEFAULT_LOCALE,
  GLOBAL_FALLBACK_LOCALE,
  LOCALE_ORIGINS,
  OFFICIAL_GLOBAL_LOCALE,
  OFFICIAL_GLOBAL_ORIGIN,
  resolveLocaleFromHostname
} from "./locales.js"

describe("locale domain defaults", () => {
  it("keeps Catalan as internal default locale", () => {
    expect(DEFAULT_LOCALE).toBe("ca")
  })

  it("uses English as official global locale and origin", () => {
    expect(OFFICIAL_GLOBAL_LOCALE).toBe("en")
    expect(OFFICIAL_GLOBAL_ORIGIN).toBe("https://simplegamecreator.com")
    expect(LOCALE_ORIGINS[OFFICIAL_GLOBAL_LOCALE]).toBe(OFFICIAL_GLOBAL_ORIGIN)
  })

  it("uses English as global fallback locale", () => {
    expect(GLOBAL_FALLBACK_LOCALE).toBe("en")
  })
})

describe("resolveLocaleFromHostname", () => {
  it("resolves configured apex hosts", () => {
    expect(resolveLocaleFromHostname("creadordejocs.cat")).toBe("ca")
    expect(resolveLocaleFromHostname("creadordejuegos.com")).toBe("es")
    expect(resolveLocaleFromHostname("simplegamecreator.com")).toBe("en")
  })

  it("resolves configured www hosts", () => {
    expect(resolveLocaleFromHostname("www.creadordejocs.cat")).toBe("ca")
    expect(resolveLocaleFromHostname("www.creadordejuegos.com")).toBe("es")
    expect(resolveLocaleFromHostname("www.simplegamecreator.com")).toBe("en")
  })

  it("resolves localhost alias to Catalan", () => {
    expect(resolveLocaleFromHostname("localhost")).toBe("ca")
  })

  it("falls back to english for unknown hosts", () => {
    expect(resolveLocaleFromHostname("preview.vercel.app")).toBe("en")
    expect(resolveLocaleFromHostname("unknown.example")).toBe("en")
  })
})
