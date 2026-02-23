import { caMessages } from "./ca.js"
import { esMessages } from "./es.js"
import { enMessages } from "./en.js"
import { DEFAULT_LOCALE, type SupportedLocale } from "./locales.js"

type MessageKey = keyof typeof caMessages
type Messages = Record<MessageKey, string>

const messagesByLocale: Record<SupportedLocale, Messages> = {
  ca: caMessages,
  es: esMessages,
  en: enMessages
}

let activeLocale: SupportedLocale = DEFAULT_LOCALE
let activeMessages: Messages = caMessages

export function setActiveLocale(locale: SupportedLocale): void {
  activeLocale = locale
  activeMessages = messagesByLocale[locale]
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
