import { caMessages, type EditorMessageKey } from "./ca.js"
import { enMessages } from "./en.js"
import { esMessages } from "./es.js"

export const SUPPORTED_LOCALES = ["ca", "es", "en"] as const
export type SupportedLocale = (typeof SUPPORTED_LOCALES)[number]
export const OFFICIAL_GLOBAL_LOCALE: SupportedLocale = "en"
export const OFFICIAL_GLOBAL_ORIGIN = "https://simplegamecreator.com"
// Internal/default locale for editor messages and legacy assumptions.
export const DEFAULT_LOCALE: SupportedLocale = "ca"
// Global fallback for unknown hosts/previews.
export const GLOBAL_FALLBACK_LOCALE: SupportedLocale = OFFICIAL_GLOBAL_LOCALE
export const LOCALE_ORIGINS: Record<SupportedLocale, string> = {
  ca: "https://creadordejocs.cat",
  es: "https://creadordejuegos.com",
  en: OFFICIAL_GLOBAL_ORIGIN
}

export type LocaleManifestEntry = {
  code: SupportedLocale
  htmlLang: string
  ogLocale: string
  brandName: string
  isDefault: boolean
  isIndexable: boolean
}

export type LocaleMessages = Record<EditorMessageKey, string>

export const MESSAGES_BY_LOCALE: Record<SupportedLocale, LocaleMessages> = {
  ca: caMessages,
  es: esMessages,
  en: enMessages
}

export const LOCALE_MANIFEST: Record<SupportedLocale, LocaleManifestEntry> = {
  ca: {
    code: "ca",
    htmlLang: "ca",
    ogLocale: "ca_ES",
    brandName: "CreadorDeJocs",
    isDefault: true,
    isIndexable: true
  },
  es: {
    code: "es",
    htmlLang: "es",
    ogLocale: "es_ES",
    brandName: "CreadorDeJuegos",
    isDefault: false,
    isIndexable: true
  },
  en: {
    code: "en",
    htmlLang: "en",
    ogLocale: "en_US",
    brandName: "SimpleGameCreator",
    isDefault: false,
    isIndexable: true
  }
}

export const INDEXABLE_LOCALES: SupportedLocale[] = SUPPORTED_LOCALES.filter(
  (locale) => LOCALE_MANIFEST[locale].isIndexable
)

export function isSupportedLocale(value: string): value is SupportedLocale {
  return (SUPPORTED_LOCALES as readonly string[]).includes(value)
}

const HOST_ALIASES_BY_LOCALE: Partial<Record<SupportedLocale, readonly string[]>> = {
  // Add custom aliases here when needed (e.g. legacy domains).
  ca: [],
  es: [],
  en: []
}

function originToHostname(origin: string): string {
  return new URL(origin).hostname.toLowerCase()
}

function buildHostnameToLocaleMap(): Record<string, SupportedLocale> {
  return SUPPORTED_LOCALES.reduce<Record<string, SupportedLocale>>((acc, locale) => {
    const primaryHost = originToHostname(LOCALE_ORIGINS[locale])
    acc[primaryHost] = locale
    acc[`www.${primaryHost}`] = locale

    for (const alias of HOST_ALIASES_BY_LOCALE[locale] ?? []) {
      acc[alias.toLowerCase()] = locale
    }
    return acc
  }, {})
}

const HOSTNAME_TO_LOCALE = buildHostnameToLocaleMap()

export function resolveLocaleFromHostname(hostname: string): SupportedLocale {
  const normalized = hostname.trim().toLowerCase()
  return HOSTNAME_TO_LOCALE[normalized] ?? GLOBAL_FALLBACK_LOCALE
}
