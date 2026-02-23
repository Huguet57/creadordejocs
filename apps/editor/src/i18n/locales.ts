import { caMessages, type EditorMessageKey } from "./ca.js"
import { enMessages } from "./en.js"
import { esMessages } from "./es.js"

export const SUPPORTED_LOCALES = ["ca", "es", "en"] as const
export type SupportedLocale = (typeof SUPPORTED_LOCALES)[number]
export const DEFAULT_LOCALE: SupportedLocale = "ca"

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
    brandName: "CreadorDeJocs",
    isDefault: false,
    isIndexable: true
  },
  en: {
    code: "en",
    htmlLang: "en",
    ogLocale: "en_US",
    brandName: "GameCreator",
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
