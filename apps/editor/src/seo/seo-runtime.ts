import { SUPPORTED_LOCALES, type SupportedLocale } from "../i18n/locales.js"
import { buildLocalePath } from "../route-utils.js"

export function setMetaContent(selector: string, content: string): void {
  const metaTag = document.querySelector(selector)
  if (!metaTag) {
    return
  }

  metaTag.setAttribute("content", content)
}

export function setCanonicalHref(href: string): void {
  const canonicalTag = document.querySelector('link[rel="canonical"]')
  if (!canonicalTag) {
    return
  }

  canonicalTag.setAttribute("href", href)
}

export function syncHreflangTags(
  routePath: string,
  siteOrigin: string,
  xDefaultLocale: SupportedLocale
): void {
  for (const locale of SUPPORTED_LOCALES) {
    let link = document.querySelector(`link[hreflang="${locale}"]`)
    if (!link) {
      link = document.createElement("link")
      link.setAttribute("rel", "alternate")
      link.setAttribute("hreflang", locale)
      document.head.appendChild(link)
    }
    link.setAttribute("href", `${siteOrigin}${buildLocalePath(routePath, locale)}`)
  }

  let xDefault = document.querySelector('link[hreflang="x-default"]')
  if (!xDefault) {
    xDefault = document.createElement("link")
    xDefault.setAttribute("rel", "alternate")
    xDefault.setAttribute("hreflang", "x-default")
    document.head.appendChild(xDefault)
  }
  xDefault.setAttribute("href", `${siteOrigin}${buildLocalePath(routePath, xDefaultLocale)}`)
}
