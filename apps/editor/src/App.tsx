import { t, getActiveLocale } from "@/i18n/index.js"
import { useEffect, useRef, useState } from "react"
import { Redo2, Save, Undo2 } from "lucide-react"
import { Button } from "./components/ui/button.js"
import { shouldResetWhenSwitchingSection, useEditorController } from "./features/editor-state/use-editor-controller.js"
import { LandingPage } from "./features/landing/LandingPage.js"
import type { EditorSection } from "./features/editor-state/types.js"
import { EditorSidebarCompact } from "./layout/EditorSidebarCompact.js"
import { EditorWorkspace } from "./layout/EditorWorkspace.js"
import { ImportDropdown } from "./layout/ImportDropdown.js"
import { PlayPage } from "./features/play/PlayPage.js"
import { AccountDropdown } from "./layout/AccountDropdown.js"
import { ShareDropdown } from "./layout/ShareDropdown.js"
import {
  resolveAppRoute,
  resolveEditorSection,
  resolvePlayShareId,
  buildEditorSectionPath,
  buildLocalePath,
  hasAuthCallbackParams,
  shouldRouteAuthCallbackToEditor,
  buildEditorAuthCallbackPath,
  type AppRoute
} from "./route-utils.js"
import { RUNTIME_SEO_BY_LOCALE, SITE_ORIGIN, X_DEFAULT_LOCALE } from "./seo/seo-locales.js"
import { setCanonicalHref, setMetaContent, syncHreflangTags } from "./seo/seo-runtime.js"

const landingRobots = "index,follow,max-snippet:-1,max-image-preview:large,max-video-preview:-1"
const editorRobots = "noindex, nofollow"
const playRobots = "noindex, nofollow"

function formatStatus(status: "idle" | "saved" | "saving" | "error"): string {
  if (status === "saving") return t("appSaving")
  if (status === "saved") return t("appSaved")
  if (status === "error") return t("appSaveError")
  return t("appSaved")
}

export function handleSidebarSectionChange(
  currentSection: EditorSection,
  nextSection: EditorSection,
  isRunning: boolean,
  reset: () => void,
  setActiveSection: (section: EditorSection) => void
): void {
  if (shouldResetWhenSwitchingSection(currentSection, nextSection, isRunning)) {
    reset()
  }
  setActiveSection(nextSection)
}

export function shouldSkipInitialEditorHistorySync(search: string, hash: string): boolean {
  return hasAuthCallbackParams(search, hash)
}

function EditorAppShell() {
  const urlSection = resolveEditorSection(window.location.pathname)
  const controller = useEditorController(urlSection ?? undefined)
  const isPopStateRef = useRef(false)
  const isInitialMountRef = useRef(true)
  const controllerRef = useRef(controller)
  controllerRef.current = controller
  const [manualSaveLabel, setManualSaveLabel] = useState<string | null>(null)
  const manualSaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Sync URL when activeSection changes
  useEffect(() => {
    const sectionPath = buildEditorSectionPath(controller.activeSection)
    if (isPopStateRef.current) {
      isPopStateRef.current = false
      return
    }
    if (isInitialMountRef.current) {
      isInitialMountRef.current = false
      if (shouldSkipInitialEditorHistorySync(window.location.search, window.location.hash)) {
        return
      }
      window.history.replaceState({}, "", sectionPath)
      return
    }
    window.history.pushState({}, "", sectionPath)
  }, [controller.activeSection])

  // Handle popstate for editor section changes
  useEffect(() => {
    const handlePopState = () => {
      const section = resolveEditorSection(window.location.pathname)
      if (section) {
        isPopStateRef.current = true
        const ctrl = controllerRef.current
        if (shouldResetWhenSwitchingSection(ctrl.activeSection, section, ctrl.isRunning)) {
          ctrl.reset()
        }
        ctrl.setActiveSection(section)
      }
    }
    window.addEventListener("popstate", handlePopState)
    return () => window.removeEventListener("popstate", handlePopState)
  }, [])

  return (
    <main
      className="mvp15-editor-shell flex h-screen flex-col overflow-hidden bg-slate-50 px-4 py-4 text-slate-900"
      onContextMenu={(event) => event.preventDefault()}
    >
      <div className="mvp15-editor-frame flex min-h-0 flex-1 flex-col gap-3">
        <div className="flex items-center justify-between px-1">
          <div className="mvp19-header-left flex items-center gap-1">
            <ImportDropdown controller={controller} />
            <AccountDropdown controller={controller} />
            <ShareDropdown controller={controller} />
            <p data-testid="save-status" className="mvp19-header-save-status ml-2 text-xs text-slate-400">
              {manualSaveLabel ?? formatStatus(controller.saveStatus)}
            </p>
          </div>
          <div className="flex items-center gap-1">
            <Button
              data-testid="undo-button"
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-slate-400 hover:text-slate-700"
              disabled={!controller.undoAvailable}
              onClick={() => controller.undo()}
              title={t("appUndoTitle")}
            >
              <Undo2 className="h-4 w-4" />
            </Button>
            <Button
              data-testid="redo-button"
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-slate-400 hover:text-slate-700"
              disabled={!controller.redoAvailable}
              onClick={() => controller.redo()}
              title={t("appRedoTitle")}
            >
              <Redo2 className="h-4 w-4" />
            </Button>
            <Button
              data-testid="save-local-button"
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-slate-400 hover:text-slate-700"
              onClick={() => {
                if (manualSaveTimerRef.current) clearTimeout(manualSaveTimerRef.current)
                setManualSaveLabel(t("appSaving"))
                controller.saveNow()
                manualSaveTimerRef.current = setTimeout(() => {
                  setManualSaveLabel(t("appSaved"))
                  manualSaveTimerRef.current = setTimeout(() => {
                    setManualSaveLabel(null)
                  }, 1500)
                }, 400)
              }}
              title={t("appSaveTitle")}
            >
              <Save className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <div className="mvp15-editor-layout grid min-h-0 flex-1 grid-cols-[64px_1fr] gap-3">
          <EditorSidebarCompact
            activeSection={controller.activeSection}
            onSectionChange={(section) => {
              handleSidebarSectionChange(
                controller.activeSection,
                section,
                controller.isRunning,
                () => controller.reset(),
                (nextSection) => controller.setActiveSection(nextSection)
              )
            }}
          />
          <EditorWorkspace controller={controller} />
        </div>
      </div>
    </main>
  )
}

export function App() {
  const locale = getActiveLocale()
  const meta = RUNTIME_SEO_BY_LOCALE[locale]

  const [route, setRoute] = useState<AppRoute>(() => {
    if (shouldRouteAuthCallbackToEditor(window.location.pathname, window.location.search, window.location.hash)) {
      const callbackPath = buildEditorAuthCallbackPath(window.location.search, window.location.hash)
      window.history.replaceState({}, "", callbackPath)
      return "editor"
    }
    return resolveAppRoute(window.location.pathname)
  })

  useEffect(() => {
    const handlePopState = () => {
      setRoute(resolveAppRoute(window.location.pathname))
    }

    window.addEventListener("popstate", handlePopState)
    return () => {
      window.removeEventListener("popstate", handlePopState)
    }
  }, [])

  useEffect(() => {
    if (route === "editor") {
      document.title = meta.editorTitle
      setMetaContent('meta[name="robots"]', editorRobots)
      setCanonicalHref(`${SITE_ORIGIN}${buildLocalePath("/editor")}`)
      syncHreflangTags("/editor", SITE_ORIGIN, X_DEFAULT_LOCALE)
      return
    }
    if (route === "play") {
      document.title = meta.playTitle
      setMetaContent('meta[name="robots"]', playRobots)
      return
    }

    document.title = meta.landingTitle
    setMetaContent('meta[name="robots"]', landingRobots)
    setCanonicalHref(`${SITE_ORIGIN}${buildLocalePath("/")}`)
    syncHreflangTags("/", SITE_ORIGIN, X_DEFAULT_LOCALE)
  }, [route, meta])

  const openEditor = () => {
    if (resolveAppRoute(window.location.pathname) !== "editor") {
      window.history.pushState({}, "", buildLocalePath("/editor"))
    }
    setRoute("editor")
    window.scrollTo(0, 0)
  }

  if (route === "play") {
    const shareId = resolvePlayShareId(window.location.pathname)
    if (!shareId) {
      return <LandingPage onStartEditor={openEditor} />
    }
    return <PlayPage shareId={shareId} />
  }

  if (route === "landing") {
    return <LandingPage onStartEditor={openEditor} />
  }

  return <EditorAppShell />
}
