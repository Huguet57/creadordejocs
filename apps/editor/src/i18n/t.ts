import { DEFAULT_LOCALE, MESSAGES_BY_LOCALE, type LocaleMessages, type SupportedLocale } from "./locales.js"
import { type EditorMessageKey } from "./ca.js"

type MessageKey = EditorMessageKey

let activeLocale: SupportedLocale = DEFAULT_LOCALE
let activeMessages: LocaleMessages = MESSAGES_BY_LOCALE[DEFAULT_LOCALE]

export function setActiveLocale(locale: SupportedLocale): void {
  activeLocale = locale
  activeMessages = MESSAGES_BY_LOCALE[locale]
}

export function getActiveLocale(): SupportedLocale {
  return activeLocale
}

export function t(key: MessageKey): string
export function t(key: MessageKey, vars: Record<string, string | number>): string
export function t(key: MessageKey, vars?: Record<string, string | number>): string {
  const template: string = activeMessages[key]
  if (!vars) return template
  return template.replace(/\{(\w+)\}/g, (_, name: string) => {
    const value = vars[name]
    return value !== undefined ? String(value) : `{${name}}`
  })
}
