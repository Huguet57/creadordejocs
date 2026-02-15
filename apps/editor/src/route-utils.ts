import type { EditorSection } from "./features/editor-state/types.js"

export type AppRoute = "landing" | "editor"

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

export function resolveAppRoute(pathname: string): AppRoute {
  const normalizedPathname = normalizePathname(pathname)
  return normalizedPathname === "/editor" || normalizedPathname.startsWith("/editor/") ? "editor" : "landing"
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
  return `/editor/${section}`
}
