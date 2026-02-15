import { useEffect, useMemo, useRef, useState } from "react"
import { Play, RotateCcw } from "lucide-react"
import type { ProjectV1 } from "@creadordejocs/project-format"
import { Button } from "../../components/ui/button.js"
import { resolveAssetSource } from "../assets/asset-source-resolver.js"
import {
  createInitialRuntimeState,
  runRuntimeTick,
  ROOM_WIDTH,
  ROOM_HEIGHT,
  type RuntimeMouseButton,
  type RuntimeMouseInput,
  type RuntimeState
} from "../editor-state/runtime.js"
import { loadPublishedProject } from "../share/share-api-client.js"

const INSTANCE_SIZE = 32

type PlayPageProps = {
  shareId: string
}

type LoadState =
  | { status: "loading" }
  | { status: "loaded"; project: ProjectV1 }
  | { status: "error"; message: string }

function PlayRuntime({ initialProject }: { initialProject: ProjectV1 }) {
  const [project, setProject] = useState<ProjectV1>(initialProject)
  const [runtimeState, setRuntimeState] = useState<RuntimeState>(() => createInitialRuntimeState(initialProject))
  const [isRunning, setIsRunning] = useState(false)
  const [activeRoomId, setActiveRoomId] = useState<string>(() => initialProject.rooms[0]?.id ?? "")
  const [resolvedSpriteSources, setResolvedSpriteSources] = useState<Record<string, string>>({})
  const [runSnapshot, setRunSnapshot] = useState<ProjectV1 | null>(null)

  const canvasRef = useRef<HTMLDivElement>(null)
  const pressedKeysRef = useRef<Set<string>>(new Set())
  const justPressedKeysRef = useRef<Set<string>>(new Set())
  const runtimeRef = useRef<RuntimeState>(runtimeState)
  const runtimeMouseRef = useRef<RuntimeMouseInput>({
    x: 0,
    y: 0,
    moved: false,
    pressedButtons: new Set<RuntimeMouseButton>(),
    justPressedButtons: new Set<RuntimeMouseButton>()
  })

  const activeRoom = useMemo(() => project.rooms.find((r) => r.id === activeRoomId) ?? null, [project, activeRoomId])
  const sprites = project.resources.sprites
  const spriteById = useMemo(
    () => Object.fromEntries(sprites.map((s) => [s.id, s])),
    [sprites]
  )

  // Resolve sprite sources
  useEffect(() => {
    let cancelled = false
    const resolve = async () => {
      const pairs = await Promise.all(
        sprites.map(async (s) => {
          const resolved = await resolveAssetSource(s.assetSource)
          return [s.id, resolved ?? ""] as const
        })
      )
      if (!cancelled) {
        setResolvedSpriteSources(Object.fromEntries(pairs))
      }
    }
    void resolve()
    return () => { cancelled = true }
  }, [sprites])

  // Game loop
  useEffect(() => {
    if (!isRunning || !activeRoom) {
      return
    }
    const interval = window.setInterval(() => {
      const result = runRuntimeTick(
        project,
        activeRoom.id,
        pressedKeysRef.current,
        runtimeRef.current,
        justPressedKeysRef.current,
        runtimeMouseRef.current
      )
      let nextProject = result.project
      let nextRuntime = result.runtime

      if (result.restartRoomRequested && runSnapshot) {
        const snapshotRoom = runSnapshot.rooms.find((r) => r.id === activeRoom.id)
        if (snapshotRoom) {
          nextProject = {
            ...nextProject,
            rooms: nextProject.rooms.map((r) =>
              r.id === activeRoom.id
                ? { ...r, instances: snapshotRoom.instances.map((i) => ({ ...i })) }
                : r
            )
          }
          nextRuntime = createInitialRuntimeState(nextProject)
        }
      }

      runtimeRef.current = nextRuntime
      setRuntimeState(nextRuntime)
      setProject(nextProject)
      if (result.activeRoomId !== activeRoom.id) {
        setActiveRoomId(result.activeRoomId)
      }
      justPressedKeysRef.current.clear()
      runtimeMouseRef.current.moved = false
      runtimeMouseRef.current.justPressedButtons.clear()
    }, 80)
    return () => window.clearInterval(interval)
  }, [activeRoom, isRunning, project, runSnapshot])

  // Keyboard events
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent): void => {
      if (!pressedKeysRef.current.has(event.code)) {
        justPressedKeysRef.current.add(event.code)
      }
      pressedKeysRef.current.add(event.code)
    }
    const onKeyUp = (event: KeyboardEvent): void => {
      pressedKeysRef.current.delete(event.code)
    }
    window.addEventListener("keydown", onKeyDown)
    window.addEventListener("keyup", onKeyUp)
    return () => {
      window.removeEventListener("keydown", onKeyDown)
      window.removeEventListener("keyup", onKeyUp)
    }
  }, [])

  // Clear keys when not running
  useEffect(() => {
    if (isRunning) {
      return
    }
    pressedKeysRef.current.clear()
    justPressedKeysRef.current.clear()
    runtimeMouseRef.current = {
      x: 0,
      y: 0,
      moved: false,
      pressedButtons: new Set<RuntimeMouseButton>(),
      justPressedButtons: new Set<RuntimeMouseButton>()
    }
  }, [isRunning])

  // Mouse events on canvas
  useEffect(() => {
    const el = canvasRef.current
    if (!el) {
      return
    }
    const toRoom = (event: MouseEvent) => {
      const rect = el.getBoundingClientRect()
      return {
        x: Math.max(0, Math.min(ROOM_WIDTH, event.clientX - rect.left)),
        y: Math.max(0, Math.min(ROOM_HEIGHT, event.clientY - rect.top))
      }
    }
    const toBtn = (event: MouseEvent): RuntimeMouseButton | null => {
      if (event.button === 0) return "left"
      if (event.button === 1) return "middle"
      if (event.button === 2) return "right"
      return null
    }
    const onMove = (event: MouseEvent) => {
      if (!isRunning) return
      const p = toRoom(event)
      runtimeMouseRef.current.x = p.x
      runtimeMouseRef.current.y = p.y
      runtimeMouseRef.current.moved = true
    }
    const onDown = (event: MouseEvent) => {
      if (!isRunning) return
      const p = toRoom(event)
      runtimeMouseRef.current.x = p.x
      runtimeMouseRef.current.y = p.y
      runtimeMouseRef.current.moved = true
      const b = toBtn(event)
      if (b) {
        runtimeMouseRef.current.pressedButtons.add(b)
        runtimeMouseRef.current.justPressedButtons.add(b)
      }
    }
    const onUp = (event: MouseEvent) => {
      if (!isRunning) return
      const p = toRoom(event)
      runtimeMouseRef.current.x = p.x
      runtimeMouseRef.current.y = p.y
      const b = toBtn(event)
      if (b) {
        runtimeMouseRef.current.pressedButtons.delete(b)
      }
    }
    el.addEventListener("mousemove", onMove)
    el.addEventListener("mousedown", onDown)
    el.addEventListener("mouseup", onUp)
    el.addEventListener("mouseleave", onUp)
    return () => {
      el.removeEventListener("mousemove", onMove)
      el.removeEventListener("mousedown", onDown)
      el.removeEventListener("mouseup", onUp)
      el.removeEventListener("mouseleave", onUp)
    }
  }, [isRunning])

  // Sound playback
  useEffect(() => {
    if (!runtimeState.playedSoundIds.length) {
      return
    }
    let cancelled = false
    const play = async () => {
      for (const soundId of runtimeState.playedSoundIds) {
        const entry = project.resources.sounds.find((s) => s.id === soundId)
        if (!entry?.assetSource) continue
        const resolved = await resolveAssetSource(entry.assetSource)
        if (cancelled || !resolved) continue
        const audio = new Audio(resolved)
        void audio.play().catch(() => { /* autoplay restriction */ })
      }
    }
    void play()
    return () => { cancelled = true }
  }, [project.resources.sounds, runtimeState.playedSoundIds])

  const startGame = () => {
    setRunSnapshot(project)
    const freshRuntime = createInitialRuntimeState(project)
    runtimeRef.current = freshRuntime
    setRuntimeState(freshRuntime)
    setIsRunning(true)
  }

  const resetGame = () => {
    const base = runSnapshot ?? initialProject
    setProject(base)
    setActiveRoomId(base.rooms[0]?.id ?? "")
    const freshRuntime = createInitialRuntimeState(base)
    runtimeRef.current = freshRuntime
    setRuntimeState(freshRuntime)
    setRunSnapshot(null)
    setIsRunning(false)
  }

  return (
    <div className="mvp-play-runtime flex flex-col items-center gap-4">
      {/* Controls */}
      <div className="mvp-play-controls flex items-center gap-3">
        {!isRunning ? (
          <Button data-testid="play-start-button" onClick={startGame}>
            <Play className="mr-2 h-4 w-4" />
            Jugar
          </Button>
        ) : (
          <Button data-testid="play-reset-button" variant="outline" onClick={resetGame}>
            <RotateCcw className="mr-2 h-4 w-4" />
            Reiniciar
          </Button>
        )}
      </div>

      {/* Canvas */}
      {activeRoom ? (
        <div className="mvp-play-canvas-wrapper relative" style={{ width: ROOM_WIDTH }}>
          <div
            ref={canvasRef}
            className="mvp-play-canvas relative overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm"
            style={{ width: ROOM_WIDTH, height: ROOM_HEIGHT }}
          >
            {activeRoom.instances.map((inst) => {
              const outside =
                inst.x < 0 || inst.y < 0 ||
                inst.x > ROOM_WIDTH - INSTANCE_SIZE ||
                inst.y > ROOM_HEIGHT - INSTANCE_SIZE
              if (outside) return null
              const obj = project.objects.find((o) => o.id === inst.objectId)
              const spr = obj?.spriteId ? spriteById[obj.spriteId] : undefined
              const src = spr ? resolvedSpriteSources[spr.id] : undefined
              return (
                <div
                  key={inst.id}
                  className={`mvp-play-instance absolute flex h-8 w-8 items-center justify-center overflow-hidden rounded text-[10px] ${src ? "" : "bg-indigo-500 text-white"}`}
                  style={{
                    left: inst.x,
                    top: inst.y,
                    transform: `rotate(${inst.rotation ?? 0}deg)`
                  }}
                >
                  {src ? (
                    <img className="mvp-play-instance-sprite h-full w-full object-contain" src={src} alt={spr?.name ?? obj?.name ?? "Sprite"} />
                  ) : (
                    obj?.name.slice(0, 2).toUpperCase() ?? "??"
                  )}
                </div>
              )
            })}
          </div>
          {runtimeState.activeToast && (
            <div className="mvp-play-toast pointer-events-none absolute bottom-2 right-2 z-20">
              <div className="rounded-md bg-slate-900/90 px-3 py-1.5 text-[11px] font-medium text-white shadow-lg">
                {runtimeState.activeToast.text}
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="flex items-center justify-center rounded-lg border border-slate-200 bg-white p-12 text-slate-400"
          style={{ width: ROOM_WIDTH, height: ROOM_HEIGHT }}>
          <p>Aquest joc no té cap sala definida.</p>
        </div>
      )}
    </div>
  )
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
        <a href="https://creadordejocs.cat" className="mvp-play-cta-link font-medium text-indigo-600 underline hover:text-indigo-800">
          creadordejocs.cat
        </a>
      </p>
    </main>
  )
}
