import { readFileSync } from "node:fs"
import { resolve } from "node:path"
import { describe, expect, it } from "vitest"
import { INDEXABLE_LOCALES } from "../src/i18n/locales.js"
import { buildSitemapXml, localeUrl, transformHtmlForLocale } from "../src/seo/seo-build.js"
import { assertLocaleConfigComplete } from "../src/seo/seo-locales.js"

const baseHtml = readFileSync(resolve(process.cwd(), "apps/editor/index.html"), "utf-8")

describe("generate-locale-html SEO smoke", () => {
  it("has complete locale SEO configuration", () => {
    expect(() => assertLocaleConfigComplete()).not.toThrow()
  })

  it("generates locale-specific html with canonical and hreflang tags", () => {
    const localeHtml = INDEXABLE_LOCALES.map((locale) => transformHtmlForLocale(baseHtml, locale))

    expect(localeHtml[0]).toContain('<link rel="canonical" href="https://creadordejocs.cat/" />')
    expect(localeHtml[1]).toContain('<link rel="canonical" href="https://creadordejuegos.com/" />')
    expect(localeHtml[2]).toContain('<link rel="canonical" href="https://simplegamecreator.com/" />')

    for (const html of localeHtml) {
      expect(html).toContain('hreflang="ca"')
      expect(html).toContain('hreflang="es"')
      expect(html).toContain('hreflang="en"')
      expect(html).toContain('hreflang="x-default"')
      expect(html).toContain('href="https://creadordejocs.cat/"')
      expect(html).toContain('href="https://creadordejuegos.com/"')
      expect(html).toContain('href="https://simplegamecreator.com/"')
      expect(html).toContain("application/ld+json")
    }
  })

  it("includes Microsoft Clarity without PostHog", () => {
    const html = transformHtmlForLocale(baseHtml, "ca")

    expect(html).toContain('https://www.clarity.ms/tag/" + i')
    expect(html).toContain('"clarity", "script", "y3f32cgkjk"')
    expect(html.toLowerCase()).not.toContain("posthog")
  })

  it("builds sitemap with alternates and x-default", () => {
    const sitemap = buildSitemapXml(["/"])
    expect(sitemap).toContain("<loc>https://creadordejocs.cat/</loc>")
    expect(sitemap).toContain("<loc>https://creadordejuegos.com/</loc>")
    expect(sitemap).toContain("<loc>https://simplegamecreator.com/</loc>")
    expect(sitemap).toContain('hreflang="x-default"')
  })

  it("builds locale URLs from domain map without locale path prefixes", () => {
    expect(localeUrl("ca", "/editor")).toBe("https://creadordejocs.cat/editor")
    expect(localeUrl("es", "/editor")).toBe("https://creadordejuegos.com/editor")
    expect(localeUrl("en", "/play/abc123")).toBe("https://simplegamecreator.com/play/abc123")
  })
})
