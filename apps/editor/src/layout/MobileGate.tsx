import { Monitor } from "lucide-react"
import { t } from "@/i18n/index.js"
import { buildLocalePath } from "@/route-utils.js"

export function MobileGate() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 bg-slate-50 px-6 text-center text-slate-800">
      <Monitor className="h-16 w-16 text-slate-400" />
      <h1 className="text-2xl font-bold">{t("mobileGateTitle")}</h1>
      <p className="max-w-sm text-base text-slate-500">{t("mobileGateDescription")}</p>
      <a
        href={buildLocalePath("/")}
        className="mt-2 rounded-lg bg-slate-800 px-5 py-2 text-sm font-medium text-white hover:bg-slate-700"
      >
        {t("mobileGateBackButton")}
      </a>
    </div>
  )
}
