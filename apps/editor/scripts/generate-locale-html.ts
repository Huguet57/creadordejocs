/**
 * Post-build script: generates locale-specific index.html variants and sitemap.
 *
 * Run after `vite build`:
 *   npx tsx apps/editor/scripts/generate-locale-html.ts
 */

import { mkdirSync, readFileSync, writeFileSync } from "node:fs"
import { dirname, resolve } from "node:path"
import { fileURLToPath } from "node:url"
import { INDEXABLE_LOCALES } from "../src/i18n/locales.js"
import { buildSitemapXml, transformHtmlForLocale } from "../src/seo/seo-build.js"
import { assertLocaleConfigComplete } from "../src/seo/seo-locales.js"

const __dirname = dirname(fileURLToPath(import.meta.url))
const distDir = resolve(__dirname, "../dist")

export function generateLocaleArtifacts(): void {
  assertLocaleConfigComplete()
  const baseHtml = readFileSync(resolve(distDir, "index.html"), "utf-8")

  for (const locale of INDEXABLE_LOCALES) {
    const html = transformHtmlForLocale(baseHtml, locale)
    const localeDir = resolve(distDir, locale)
    mkdirSync(localeDir, { recursive: true })
    writeFileSync(resolve(localeDir, "index.html"), html, "utf-8")
    console.log(`  created dist/${locale}/index.html`)
  }

  const sitemap = buildSitemapXml(["/"])
  writeFileSync(resolve(distDir, "sitemap.xml"), sitemap, "utf-8")
  console.log("  generated dist/sitemap.xml")
  console.log("Locale HTML generation complete.")
}

const thisFilePath = fileURLToPath(import.meta.url)
if (process.argv[1] === thisFilePath) {
  generateLocaleArtifacts()
}
