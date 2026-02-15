export type AppRoute = "landing" | "editor"

export function normalizePathname(pathname: string): string {
  if (pathname === "/") {
    return pathname
  }

  return pathname.endsWith("/") ? pathname.slice(0, -1) : pathname
}

export function resolveAppRoute(pathname: string): AppRoute {
  const normalizedPathname = normalizePathname(pathname)
  return normalizedPathname === "/editor" ? "editor" : "landing"
}
