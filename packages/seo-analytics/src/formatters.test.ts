import { describe, expect, it } from "vitest"
import {
  formatCountryTable,
  formatKeywordsTable,
  formatMonthlyTable,
  formatPagesTable
} from "./formatters.js"
import { isSeoAnalyticsLocale, seoAnalyticsT } from "./i18n.js"

const ANSI_ESCAPE = /\u001b\[[0-9;]*m/g

function stripAnsi(value: string): string {
  return value.replace(ANSI_ESCAPE, "")
}

describe("SEO analytics formatter locales", () => {
  it("formats empty tables in English", () => {
    expect(stripAnsi(formatKeywordsTable([], "en"))).toContain("TOP KEYWORDS")
    expect(stripAnsi(formatPagesTable([], "en"))).toContain("TOP PAGES")
    expect(stripAnsi(formatPagesTable([], "en"))).toContain("No data available.")
  })

  it("formats empty tables in Spanish", () => {
    expect(stripAnsi(formatCountryTable([], "es"))).toContain("POR PAÍS")
    expect(stripAnsi(formatMonthlyTable([], "es"))).toContain("EVOLUCIÓN MENSUAL")
    expect(stripAnsi(formatMonthlyTable([], "es"))).toContain("No hay datos disponibles.")
  })

  it("keeps Catalan as the default formatter locale", () => {
    expect(stripAnsi(formatPagesTable([]))).toContain("PÀGINES PRINCIPALS")
    expect(stripAnsi(formatPagesTable([]))).toContain("Cap dada disponible.")
  })

  it("translates CLI summaries and validates supported locales", () => {
    expect(seoAnalyticsT("en", "cliSummary", { site: "example.com", days: 30, limit: 10 })).toBe(
      "Site: example.com  |  Last 30 days  |  Limit: 10"
    )
    expect(isSeoAnalyticsLocale("es")).toBe(true)
    expect(isSeoAnalyticsLocale("fr")).toBe(false)
  })
})
