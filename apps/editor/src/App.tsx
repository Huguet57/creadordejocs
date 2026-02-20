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
import { ShareDropdown } from "./layout/ShareDropdown.js"
import { resolveAppRoute, resolveEditorSection, resolvePlayShareId, buildEditorSectionPath, type AppRoute } from "./route-utils.js"

const landingTitle = "Creador de jocs online | Com crear un joc gratis | CreadorDeJocs"
const editorTitle = "Editor de jocs online | CreadorDeJocs"
const playTitle = "Joc compartit | CreadorDeJocs"
const landingRobots = "index,follow,max-snippet:-1,max-image-preview:large,max-video-preview:-1"
const editorRobots = "noindex, nofollow"
const playRobots = "noindex, nofollow"

function formatStatus(status: "idle" | "saved" | "saving" | "error"): string {
  if (status === "saving") return "Saving..."
  if (status === "saved") return "Saved"
  if (status === "error") return "Error"
  return "Saved"
}

function setMetaContent(selector: string, content: string): void {
  const metaTag = document.querySelector(selector)
  if (!metaTag) {
    return
  }

  metaTag.setAttribute("content", content)
}

function setCanonicalHref(href: string): void {
  const canonicalTag = document.querySelector('link[rel="canonical"]')
  if (!canonicalTag) {
    return
  }

  canonicalTag.setAttribute("href", href)
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

function EditorAppShell() {
  const urlSection = resolveEditorSection(window.location.pathname)
  const controller = useEditorController(urlSection ?? undefined)
  const isPopStateRef = useRef(false)
  const isInitialMountRef = useRef(true)
  const controllerRef = useRef(controller)
  const [authError, setAuthError] = useState<string | null>(null)
  const [isStartingGoogleSignIn, setIsStartingGoogleSignIn] = useState(false)
  controllerRef.current = controller

  const handleAuthClick = async (): Promise<void> => {
    if (controller.isAuthenticated) {
      try {
        setAuthError(null)
        await controller.signOut()
      } catch (error) {
        console.error("[auth] sign out failed:", error)
        setAuthError(error instanceof Error ? error.message : "No s'ha pogut tancar la sessio.")
      }
      return
    }

    setIsStartingGoogleSignIn(true)
    setAuthError(null)
    try {
      await controller.signInWithGoogle()
    } catch (error) {
      const message = error instanceof Error ? error.message : "No s'ha pogut iniciar sessio amb Google."
      setAuthError(message)
      console.error("[auth] sign in failed:", error)
    } finally {
      setIsStartingGoogleSignIn(false)
    }
  }

  // Sync URL when activeSection changes
  useEffect(() => {
    const sectionPath = buildEditorSectionPath(controller.activeSection)
    if (isPopStateRef.current) {
      isPopStateRef.current = false
      return
    }
    if (isInitialMountRef.current) {
      isInitialMountRef.current = false
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
            <ShareDropdown controller={controller} />
            <p data-testid="save-status" className="mvp19-header-save-status ml-2 text-xs text-slate-400">
              {formatStatus(controller.saveStatus)}
            </p>
          </div>
          <div className="flex items-center gap-1">
            {authError ? <p className="mr-2 text-xs text-red-600">{authError}</p> : null}
            <Button
              data-testid="auth-button"
              variant="ghost"
              size="sm"
              className="h-7 px-2 text-xs text-slate-500 hover:text-slate-800"
              disabled={isStartingGoogleSignIn}
              onClick={() => void handleAuthClick()}
            >
              {controller.isAuthenticated ? "Sign out" : isStartingGoogleSignIn ? "Connecting..." : "Sign in with Google"}
            </Button>
            <Button
              data-testid="undo-button"
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-slate-400 hover:text-slate-700"
              disabled={!controller.undoAvailable}
              onClick={() => controller.undo()}
              title="Undo"
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
              title="Redo"
            >
              <Redo2 className="h-4 w-4" />
            </Button>
            <Button
              data-testid="save-local-button"
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-slate-400 hover:text-slate-700"
              onClick={() => controller.saveNow()}
              title="Save"
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
  const [route, setRoute] = useState<AppRoute>(() => resolveAppRoute(window.location.pathname))

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
      document.title = editorTitle
      setMetaContent('meta[name="robots"]', editorRobots)
      setCanonicalHref("https://creadordejocs.com/editor")
      return
    }
    if (route === "play") {
      document.title = playTitle
      setMetaContent('meta[name="robots"]', playRobots)
      return
    }

    document.title = landingTitle
    setMetaContent('meta[name="robots"]', landingRobots)
    setCanonicalHref("https://creadordejocs.com/")
  }, [route])

  const openEditor = () => {
    if (resolveAppRoute(window.location.pathname) !== "editor") {
      window.history.pushState({}, "", "/editor")
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
