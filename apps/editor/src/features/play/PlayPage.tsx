import { useEffect, useState } from "react"
import type { ProjectV1 } from "@creadordejocs/project-format"
import { RunSection } from "../run/RunSection.js"
import { loadPublishedProject } from "../share/share-api-client.js"
import { usePlayRuntimeController } from "./use-play-runtime-controller.js"

type PlayPageProps = {
  shareId: string
}

type LoadState =
  | { status: "loading" }
  | { status: "loaded"; project: ProjectV1 }
  | { status: "error"; message: string }

function PlayRuntime({ initialProject }: { initialProject: ProjectV1 }) {
  const controller = usePlayRuntimeController(initialProject)
  return <RunSection controller={controller} mode="play" />
}

export function PlayPage({ shareId }: PlayPageProps) {
  const [state, setState] = useState<LoadState>({ status: "loading" })

  useEffect(() => {
    let cancelled = false
    const load = async () => {
      try {
        const project = await loadPublishedProject(shareId)
        if (!cancelled) {
          setState({ status: "loaded", project })
        }
      } catch (error: unknown) {
        if (!cancelled) {
          const message = error instanceof Error ? error.message : "Could not load shared game."
          setState({ status: "error", message })
        }
      }
    }
    void load()
    return () => { cancelled = true }
  }, [shareId])

  if (state.status === "loading") {
    return (
      <main className="mvp-play-page flex min-h-screen items-center justify-center bg-slate-50">
        <p className="mvp-play-loading text-sm text-slate-500">Carregant joc compartit...</p>
      </main>
    )
  }

  if (state.status === "error") {
    return (
      <main className="mvp-play-page flex min-h-screen flex-col items-center justify-center gap-4 bg-slate-50">
        <p className="mvp-play-error text-sm text-red-600">{state.message}</p>
        <a href="/" className="mvp-play-back-link text-sm text-indigo-600 underline hover:text-indigo-800">
          Tornar a l&apos;inici
        </a>
      </main>
    )
  }

  return (
    <main className="mvp-play-page flex min-h-screen flex-col items-center gap-6 bg-slate-50 px-4 py-8">
      <header className="mvp-play-header space-y-1 text-center">
        <h1 className="mvp-play-title text-2xl font-bold text-slate-900">{state.project.metadata.name}</h1>
      </header>

      <PlayRuntime initialProject={state.project} />

      <p className="mvp-play-cta text-sm text-slate-500">
        Crea el teu propi joc amb{" "}
        <a href="https://creadordejocs.cat/editor" className="mvp-play-cta-link font-medium text-indigo-600 underline hover:text-indigo-800">
          creadordejocs.cat
        </a>
      </p>
    </main>
  )
}
