import { resolve } from "node:path"
import {
  createGscClient,
  getTopKeywords,
  getTopPages,
  getByCountry,
  getMonthlyTrend,
  formatKeywordsTable,
  formatPagesTable,
  formatCountryTable,
  formatMonthlyTable,
  DEFAULT_SEO_ANALYTICS_LOCALE,
  isSeoAnalyticsLocale,
  seoAnalyticsT,
  type SeoAnalyticsLocale
} from "../src/index.js"

const BOLD = "\x1b[1m"
const CYAN = "\x1b[36m"
const DIM = "\x1b[2m"
const RESET = "\x1b[0m"

function parseArgs(args: string[]): {
  days: number
  limit: number
  credentials: string | undefined
  site: string
  locale: SeoAnalyticsLocale
} {
  let days = 90
  let limit = 20
  let credentials: string | undefined
  let site = "sc-domain:creadordejocs.cat"
  let locale = DEFAULT_SEO_ANALYTICS_LOCALE

  for (let i = 0; i < args.length; i++) {
    const arg = args[i]
    const next = args[i + 1]
    if (arg === "--days" && next) {
      days = parseInt(next, 10)
      i++
    } else if (arg === "--limit" && next) {
      limit = parseInt(next, 10)
      i++
    } else if (arg === "--credentials" && next) {
      credentials = resolve(next)
      i++
    } else if (arg === "--site" && next) {
      site = next
      i++
    } else if (arg === "--locale") {
      if (!next || !isSeoAnalyticsLocale(next)) {
        throw new Error(seoAnalyticsT(locale, "unsupportedLocale", { locale: next ?? "" }))
      }
      locale = next
      i++
    }
  }
  return { days, limit, credentials, site, locale }
}

async function main(): Promise<void> {
  const { days, limit, credentials, site, locale } = parseArgs(process.argv.slice(2))

  console.log(`\n${BOLD}${CYAN}╔══════════════════════════════════════════╗${RESET}`)
  console.log(`${BOLD}${CYAN}║   SEO Analytics — Google Search Console  ║${RESET}`)
  console.log(`${BOLD}${CYAN}╚══════════════════════════════════════════╝${RESET}`)
  console.log(`${DIM}  ${seoAnalyticsT(locale, "cliSummary", { site, days, limit })}${RESET}\n`)

  const client = createGscClient(credentials)
  const options = { siteUrl: site, days, limit }

  const [keywords, pages, countries, monthly] = await Promise.all([
    getTopKeywords(client, options),
    getTopPages(client, options),
    getByCountry(client, options),
    getMonthlyTrend(client, options)
  ])

  console.log(formatKeywordsTable(keywords, locale))
  console.log(formatPagesTable(pages, locale))
  console.log(formatCountryTable(countries, locale))
  console.log(formatMonthlyTable(monthly, locale))

  const totalClicks = keywords.reduce((sum, r) => sum + r.clicks, 0)
  const totalImpressions = keywords.reduce((sum, r) => sum + r.impressions, 0)
  console.log(
    `${DIM}  ${seoAnalyticsT(locale, "cliTotals", {
      limit,
      clicks: totalClicks,
      impressions: totalImpressions
    })}${RESET}\n`
  )
}

main().catch((err: unknown) => {
  console.error("Error:", err instanceof Error ? err.message : err)
  process.exit(1)
})
