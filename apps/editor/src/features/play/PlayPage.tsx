import { useEffect, useState } from "react"
import type { ProjectV1 } from "@creadordejocs/project-format"
import { loadPublishedProject } from "../share/share-api-client.js"

type PlayPageProps = {
  shareId: string
}

type PlayState =
  | { status: "loading" }
  | { status: "loaded"; project: ProjectV1 }
  | { status: "error"; message: string }

export function PlayPage({ shareId }: PlayPageProps) {
  const [state, setState] = useState<PlayState>({ status: "loading" })

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

    return () => {
      cancelled = true
    }
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

  const { project } = state

  return (
    <main className="mvp-play-page flex min-h-screen flex-col items-center gap-6 bg-slate-50 px-4 py-8">
      <header className="mvp-play-header space-y-1 text-center">
        <h1 className="mvp-play-title text-2xl font-bold text-slate-900">{project.metadata.name}</h1>
        <p className="mvp-play-subtitle text-sm text-slate-500">Mode play-only</p>
      </header>

      <section className="mvp-play-stats rounded-lg border border-slate-200 bg-white px-6 py-4 shadow-sm">
        <dl className="mvp-play-stats-grid grid grid-cols-3 gap-6 text-center">
          <div>
            <dt className="text-xs text-slate-500">Sales</dt>
            <dd className="text-lg font-semibold text-slate-900">{project.rooms.length}</dd>
          </div>
          <div>
            <dt className="text-xs text-slate-500">Objectes</dt>
            <dd className="text-lg font-semibold text-slate-900">{project.objects.length}</dd>
          </div>
          <div>
            <dt className="text-xs text-slate-500">Sprites</dt>
            <dd className="text-lg font-semibold text-slate-900">{project.resources.sprites.length}</dd>
          </div>
        </dl>
      </section>

      <a href="/" className="mvp-play-back-link text-sm text-indigo-600 underline hover:text-indigo-800">
        Tornar a l&apos;inici
      </a>
    </main>
  )
}
