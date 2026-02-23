import {
  INDEXABLE_LOCALES,
  LOCALE_ORIGINS,
  LOCALE_MANIFEST,
  type SupportedLocale
} from "../i18n/locales.js"
import { BUILD_SEO_BY_LOCALE, X_DEFAULT_LOCALE } from "./seo-locales.js"

function replaceOrThrow(
  html: string,
  pattern: RegExp,
  replacement: string,
  label: string
): string {
  if (!pattern.test(html)) {
    throw new Error(`Could not update '${label}' while generating locale HTML.`)
  }
  return html.replace(pattern, replacement)
}

export function localeUrl(locale: SupportedLocale, path = "/"): string {
  const normalizedPath = path === "/" ? "/" : path.replace(/\/+$/, "")
  return `${LOCALE_ORIGINS[locale]}${normalizedPath}`
}

export function buildHreflangLinks(routePath: string): string {
  const links = INDEXABLE_LOCALES.map(
    (locale) =>
      `    <link rel="alternate" hreflang="${locale}" href="${localeUrl(locale, routePath)}" />`
  )
  links.push(
    `    <link rel="alternate" hreflang="x-default" href="${localeUrl(X_DEFAULT_LOCALE, routePath)}" />`
  )
  return links.join("\n")
}

function buildFaqSchema(locale: SupportedLocale): string {
  const entities = BUILD_SEO_BY_LOCALE[locale].faq.map(
    (item) => `          {
            "@type": "Question",
            "name": ${JSON.stringify(item.q)},
            "acceptedAnswer": {
              "@type": "Answer",
              "text": ${JSON.stringify(item.a)}
            }
          }`
  )
  return `    <script type="application/ld+json">
      {
        "@context": "https://schema.org",
        "@type": "FAQPage",
        "mainEntity": [
${entities.join(",\n")}
        ]
      }
    </script>`
}

function buildAppSchema(locale: SupportedLocale): string {
  const manifest = LOCALE_MANIFEST[locale]
  const seo = BUILD_SEO_BY_LOCALE[locale]

  return `    <script type="application/ld+json">
      {
        "@context": "https://schema.org",
        "@type": "SoftwareApplication",
        "name": ${JSON.stringify(manifest.brandName)},
        "applicationCategory": "GameApplication",
        "operatingSystem": "Web",
        "url": "${localeUrl(locale)}",
        "description": ${JSON.stringify(seo.schemaDescription)},
        "inLanguage": ${JSON.stringify(INDEXABLE_LOCALES)},
        "offers": {
          "@type": "Offer",
          "price": "0",
          "priceCurrency": "EUR"
        }
      }
    </script>`
}

export function transformHtmlForLocale(baseHtml: string, locale: SupportedLocale): string {
  const manifest = LOCALE_MANIFEST[locale]
  const seo = BUILD_SEO_BY_LOCALE[locale]
  let html = baseHtml

  html = replaceOrThrow(
    html,
    /<html lang="[^"]*"/,
    `<html lang="${manifest.htmlLang}"`,
    "html lang"
  )
  html = replaceOrThrow(html, /<title>[^<]*<\/title>/, `<title>${seo.title}</title>`, "title")
  html = replaceOrThrow(
    html,
    /(<meta\s+name="description"\s+content=")[^"]*(")/,
    `$1${seo.description}$2`,
    "description"
  )
  html = replaceOrThrow(
    html,
    /(<meta\s+name="keywords"\s+content=")[^"]*(")/,
    `$1${seo.keywords}$2`,
    "keywords"
  )
  html = replaceOrThrow(
    html,
    /(<link\s+rel="canonical"\s+href=")[^"]*(")/,
    `$1${localeUrl(locale)}$2`,
    "canonical"
  )
  html = replaceOrThrow(
    html,
    /(<meta\s+property="og:locale"\s+content=")[^"]*(")/,
    `$1${manifest.ogLocale}$2`,
    "og:locale"
  )
  html = replaceOrThrow(
    html,
    /(<meta\s+property="og:url"\s+content=")[^"]*(")/,
    `$1${localeUrl(locale)}$2`,
    "og:url"
  )
  html = replaceOrThrow(
    html,
    /(<meta\s+property="og:title"\s+content=")[^"]*(")/,
    `$1${seo.ogTitle}$2`,
    "og:title"
  )
  html = replaceOrThrow(
    html,
    /(<meta\s+property="og:description"\s+content=")[^"]*(")/s,
    `$1${seo.ogDescription}$2`,
    "og:description"
  )
  html = replaceOrThrow(
    html,
    /(<meta\s+name="twitter:title"\s+content=")[^"]*(")/,
    `$1${seo.twitterTitle}$2`,
    "twitter:title"
  )
  html = replaceOrThrow(
    html,
    /(<meta\s+name="twitter:description"\s+content=")[^"]*(")/s,
    `$1${seo.twitterDescription}$2`,
    "twitter:description"
  )
  html = replaceOrThrow(
    html,
    /<script type="application\/ld\+json">[\s\S]*?<\/script>\s*<script type="application\/ld\+json">[\s\S]*?<\/script>/,
    `${buildAppSchema(locale)}\n${buildFaqSchema(locale)}`,
    "json-ld"
  )

  const hreflangLinks = buildHreflangLinks("/")
  html = replaceOrThrow(html, /<\/head>/, `${hreflangLinks}\n  </head>`, "hreflang links")

  return html
}

export function buildSitemapXml(indexableRoutes: string[] = ["/"]): string {
  let urls = ""
  for (const route of indexableRoutes) {
    for (const locale of INDEXABLE_LOCALES) {
      const alternates = INDEXABLE_LOCALES.map(
        (alternateLocale) =>
          `      <xhtml:link rel="alternate" hreflang="${alternateLocale}" href="${localeUrl(alternateLocale, route)}" />`
      ).join("\n")
      const xDefault = `      <xhtml:link rel="alternate" hreflang="x-default" href="${localeUrl(X_DEFAULT_LOCALE, route)}" />`

      urls += `  <url>
    <loc>${localeUrl(locale, route)}</loc>
${alternates}
${xDefault}
    <changefreq>daily</changefreq>
    <priority>1.0</priority>
  </url>\n`
    }
  }
  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:xhtml="http://www.w3.org/1999/xhtml">
${urls}</urlset>
`
}
