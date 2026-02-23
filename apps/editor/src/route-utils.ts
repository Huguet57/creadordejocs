import type { EditorSection } from "./features/editor-state/types.js"
import {
  resolveLocaleFromHostname as resolveLocaleFromHostnameFromConfig
} from "./i18n/locales.js"
import type { SupportedLocale } from "./i18n/locales.js"

export type AppRoute = "landing" | "editor" | "play"

const VALID_EDITOR_SECTIONS: readonly EditorSection[] = [
  "sprites",
  "objects",
  "rooms",
  "run",
  "templates",
  "globalVariables"
]

export function normalizePathname(pathname: string): string {
  if (pathname === "/") {
    return pathname
  }

  return pathname.endsWith("/") ? pathname.slice(0, -1) : pathname
}

// ── Locale helpers ──────────────────────────────────────────────

export function resolveLocaleFromHostname(hostname: string): SupportedLocale {
  return resolveLocaleFromHostnameFromConfig(hostname)
}

export function buildLocalePath(path: string): string {
  const normalized = path.startsWith("/") ? path : `/${path}`
  return normalizePathname(normalized)
}

// ── Route resolution ────────────────────────────────────────────

export function resolveAppRoute(pathname: string): AppRoute {
  const normalizedPathname = normalizePathname(pathname)
  if (normalizedPathname === "/editor" || normalizedPathname.startsWith("/editor/")) {
    return "editor"
  }
  if (normalizedPathname.startsWith("/play/")) {
    return "play"
  }
  return "landing"
}

export function resolvePlayShareId(pathname: string): string | null {
  const normalized = normalizePathname(pathname)
  const prefix = "/play/"
  if (!normalized.startsWith(prefix)) {
    return null
  }
  const segment = normalized.slice(prefix.length)
  return segment || null
}

export function resolveEditorSection(pathname: string): EditorSection | null {
  const normalized = normalizePathname(pathname)
  const prefix = "/editor/"
  if (!normalized.startsWith(prefix)) {
    return null
  }
  const segment = normalized.slice(prefix.length)
  return (VALID_EDITOR_SECTIONS as readonly string[]).includes(segment)
    ? (segment as EditorSection)
    : null
}

export function buildEditorSectionPath(section: EditorSection): string {
  return buildLocalePath(`/editor/${section}`)
}

// ── Auth callback helpers ───────────────────────────────────────

const AUTH_CALLBACK_PARAM_KEYS = ["access_token", "code", "error", "error_description", "id_token", "refresh_token"] as const

function normalizeSearchParamString(value: string): string {
  if (!value) {
    return ""
  }
  return value.startsWith("?") ? value : `?${value}`
}

function normalizeHashParamString(value: string): string {
  if (!value) {
    return ""
  }
  return value.startsWith("#") ? value : `#${value}`
}

function hasKnownAuthParam(paramString: string): boolean {
  if (!paramString) {
    return false
  }

  const params = new URLSearchParams(paramString)
  return AUTH_CALLBACK_PARAM_KEYS.some((key) => params.has(key))
}

export function hasAuthCallbackParams(search: string, hash: string): boolean {
  const normalizedSearch = normalizeSearchParamString(search)
  const normalizedHash = normalizeHashParamString(hash)
  return hasKnownAuthParam(normalizedSearch) || hasKnownAuthParam(normalizedHash.replace(/^#/, ""))
}

export function shouldRouteAuthCallbackToEditor(pathname: string, search: string, hash: string): boolean {
  return resolveAppRoute(pathname) !== "editor" && hasAuthCallbackParams(search, hash)
}

export function buildEditorAuthCallbackPath(search: string, hash: string): string {
  const normalizedSearch = normalizeSearchParamString(search)
  const normalizedHash = normalizeHashParamString(hash)
  return buildLocalePath(`/editor${normalizedSearch}${normalizedHash}`)
}
