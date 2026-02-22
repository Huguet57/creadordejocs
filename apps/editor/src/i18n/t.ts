import { caMessages } from "./ca.js"

type MessageKey = keyof typeof caMessages

export function t(key: MessageKey): string
export function t(key: MessageKey, vars: Record<string, string | number>): string
export function t(key: MessageKey, vars?: Record<string, string | number>): string {
  const template: string = caMessages[key]
  if (!vars) return template
  return template.replace(/\{(\w+)\}/g, (_, name: string) => {
    const value = vars[name]
    return value !== undefined ? String(value) : `{${name}}`
  })
}
