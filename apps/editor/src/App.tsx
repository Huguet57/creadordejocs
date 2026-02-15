import { useEffect, useState } from "react"
import { Redo2, Save, Undo2 } from "lucide-react"
import { Button } from "./components/ui/button.js"
import { shouldResetWhenSwitchingSection, useEditorController } from "./features/editor-state/use-editor-controller.js"
import { LandingPage } from "./features/landing/LandingPage.js"
import type { EditorSection } from "./features/editor-state/types.js"
import { EditorSidebarCompact } from "./layout/EditorSidebarCompact.js"
import { EditorWorkspace } from "./layout/EditorWorkspace.js"
import { resolveAppRoute, type AppRoute } from "./route-utils.js"

const landingTitle = "Creador de jocs online | Com crear un joc gratis | CreadorDeJocs"
const editorTitle = "Editor de jocs online | CreadorDeJocs"
const landingRobots = "index,follow,max-snippet:-1,max-image-preview:large,max-video-preview:-1"
const editorRobots = "noindex, nofollow"

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
  const controller = useEditorController()

  return (
    <main className="mvp15-editor-shell min-h-screen bg-slate-50 px-4 py-4 text-slate-900">
      <div className="mvp15-editor-frame mx-auto flex max-w-7xl flex-col gap-3">
        <div className="flex items-center justify-between px-1">
          <p data-testid="save-status" className="text-xs text-slate-400">
            {formatStatus(controller.saveStatus)}
          </p>
          <div className="flex items-center gap-1">
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

        <div className="mvp15-editor-layout grid gap-3 lg:grid-cols-[64px_1fr]">
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

  if (route === "landing") {
    return <LandingPage onStartEditor={openEditor} />
  }

  return <EditorAppShell />
}
