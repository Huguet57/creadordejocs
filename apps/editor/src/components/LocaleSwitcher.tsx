import { Globe } from "lucide-react"
import {
  getActiveLocale,
  SUPPORTED_LOCALES,
  type SupportedLocale
} from "@/i18n/index.js"
import { resolveLocaleFromPathname, buildLocalePath } from "@/route-utils.js"

const LOCALE_LABELS: Record<SupportedLocale, string> = {
  ca: "CA",
  es: "ES",
  en: "EN"
}

type LocaleSwitcherProps = {
  variant?: "light" | "dark"
}

export function LocaleSwitcher({ variant = "light" }: LocaleSwitcherProps) {
  const activeLocale = getActiveLocale()

  function switchLocale(newLocale: SupportedLocale): void {
    if (newLocale === activeLocale) return
    const { rest } = resolveLocaleFromPathname(window.location.pathname)
    window.location.href = buildLocalePath(rest, newLocale)
  }

  const baseTextClass = variant === "dark" ? "text-slate-400" : "text-slate-500"
  const activeTextClass = variant === "dark" ? "text-white" : "text-slate-900"
  const hoverTextClass = variant === "dark" ? "hover:text-white" : "hover:text-slate-900"

  return (
    <div className="flex items-center gap-1.5">
      <Globe className={`h-3.5 w-3.5 ${baseTextClass}`} />
      {SUPPORTED_LOCALES.map((loc) => (
        <button
          key={loc}
          className={`text-xs font-medium transition ${loc === activeLocale ? activeTextClass : `${baseTextClass} ${hoverTextClass}`}`}
          onClick={() => switchLocale(loc)}
          aria-current={loc === activeLocale ? "true" : undefined}
        >
          {LOCALE_LABELS[loc]}
        </button>
      ))}
    </div>
  )
}
