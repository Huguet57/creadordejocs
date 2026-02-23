import type { SupportedLocale } from "../i18n/locales.js"

export type FaqItem = {
  q: string
  a: string
}

export type RuntimeSeoMeta = {
  landingTitle: string
  editorTitle: string
  playTitle: string
}

export type BuildSeoMeta = {
  title: string
  description: string
  keywords: string
  ogTitle: string
  ogDescription: string
  twitterTitle: string
  twitterDescription: string
  schemaDescription: string
  faq: FaqItem[]
}

export type SeoLocaleConfig = {
  runtime: RuntimeSeoMeta
  build: BuildSeoMeta
}

export type SeoConfigByLocale = Record<SupportedLocale, SeoLocaleConfig>
