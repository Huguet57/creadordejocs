export const SEO_ANALYTICS_LOCALES = ["ca", "es", "en"] as const
export type SeoAnalyticsLocale = (typeof SEO_ANALYTICS_LOCALES)[number]

export const DEFAULT_SEO_ANALYTICS_LOCALE: SeoAnalyticsLocale = "ca"

const caMessages = {
  topKeywordsTitle: "PARAULES CLAU PRINCIPALS",
  topPagesTitle: "PÀGINES PRINCIPALS",
  byCountryTitle: "PER PAÍS",
  monthlyTrendTitle: "EVOLUCIÓ MENSUAL",
  noData: "Cap dada disponible.",
  keywordColumn: "Paraula clau",
  pageColumn: "Pàgina",
  countryColumn: "País",
  monthColumn: "Mes",
  clicksColumn: "Clics",
  impressionsColumn: "Impr.",
  ctrColumn: "CTR%",
  positionColumn: "Pos.",
  trendColumn: "Tendència",
  cliSummary: "Lloc: {site}  |  Últims {days} dies  |  Límit: {limit}",
  cliTotals: "Totals ({limit} paraules clau principals): {clicks} clics, {impressions} impressions",
  unsupportedLocale: "Locale no suportat: {locale}. Utilitza ca, es o en."
} as const

export type SeoAnalyticsMessageKey = keyof typeof caMessages
type SeoAnalyticsMessages = Record<SeoAnalyticsMessageKey, string>

const esMessages: SeoAnalyticsMessages = {
  topKeywordsTitle: "PALABRAS CLAVE PRINCIPALES",
  topPagesTitle: "PÁGINAS PRINCIPALES",
  byCountryTitle: "POR PAÍS",
  monthlyTrendTitle: "EVOLUCIÓN MENSUAL",
  noData: "No hay datos disponibles.",
  keywordColumn: "Palabra clave",
  pageColumn: "Página",
  countryColumn: "País",
  monthColumn: "Mes",
  clicksColumn: "Clics",
  impressionsColumn: "Impr.",
  ctrColumn: "CTR%",
  positionColumn: "Pos.",
  trendColumn: "Tendencia",
  cliSummary: "Sitio: {site}  |  Últimos {days} días  |  Límite: {limit}",
  cliTotals:
    "Totales ({limit} palabras clave principales): {clicks} clics, {impressions} impresiones",
  unsupportedLocale: "Locale no soportado: {locale}. Usa ca, es o en."
}

const enMessages: SeoAnalyticsMessages = {
  topKeywordsTitle: "TOP KEYWORDS",
  topPagesTitle: "TOP PAGES",
  byCountryTitle: "BY COUNTRY",
  monthlyTrendTitle: "MONTHLY TREND",
  noData: "No data available.",
  keywordColumn: "Keyword",
  pageColumn: "Page",
  countryColumn: "Country",
  monthColumn: "Month",
  clicksColumn: "Clicks",
  impressionsColumn: "Impr.",
  ctrColumn: "CTR%",
  positionColumn: "Pos.",
  trendColumn: "Trend",
  cliSummary: "Site: {site}  |  Last {days} days  |  Limit: {limit}",
  cliTotals: "Totals (top {limit} keywords): {clicks} clicks, {impressions} impressions",
  unsupportedLocale: "Unsupported locale: {locale}. Use ca, es, or en."
}

export const SEO_ANALYTICS_MESSAGES: Record<SeoAnalyticsLocale, SeoAnalyticsMessages> = {
  ca: caMessages,
  es: esMessages,
  en: enMessages
}

export function isSeoAnalyticsLocale(value: string): value is SeoAnalyticsLocale {
  return (SEO_ANALYTICS_LOCALES as readonly string[]).includes(value)
}

export function seoAnalyticsT(
  locale: SeoAnalyticsLocale,
  key: SeoAnalyticsMessageKey,
  vars?: Record<string, string | number>
): string {
  const template = SEO_ANALYTICS_MESSAGES[locale][key]
  if (!vars) return template
  return template.replace(/\{(\w+)\}/g, (_, name: string) => {
    const value = vars[name]
    return value === undefined ? `{${name}}` : String(value)
  })
}
