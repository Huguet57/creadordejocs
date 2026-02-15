import { useEffect, useMemo, useRef, useState } from "react"
import { Play, Square } from "lucide-react"
import type { EditorController } from "../editor-state/use-editor-controller.js"
import { Button } from "../../components/ui/button.js"
import { resolveAssetSource } from "../assets/asset-source-resolver.js"

const ROOM_WIDTH = 560
const ROOM_HEIGHT = 320
const INSTANCE_SIZE = 32

type RunSectionProps = {
  controller: EditorController
}

export function RunSection({ controller }: RunSectionProps) {
  const { runtimeState } = controller
  const [resolvedSpriteSources, setResolvedSpriteSources] = useState<Record<string, string>>({})
  const canvasRef = useRef<HTMLDivElement>(null)
  const globalVariableEntries = controller.project.variables.global.map((variableEntry) => ({
    id: variableEntry.id,
    name: variableEntry.name,
    value: runtimeState.globalVariables[variableEntry.id]
  }))

  const sprites = controller.project.resources.sprites
  const spriteById = useMemo(
    () => Object.fromEntries(sprites.map((spriteEntry) => [spriteEntry.id, spriteEntry])),
    [sprites]
  )

  useEffect(() => {
    let cancelled = false

    const resolveSprites = async () => {
      const pairs = await Promise.all(
        sprites.map(async (spriteEntry) => {
          const resolved = await resolveAssetSource(spriteEntry.assetSource)
          return [spriteEntry.id, resolved ?? ""] as const
        })
      )
      if (!cancelled) {
        setResolvedSpriteSources(Object.fromEntries(pairs))
      }
    }

    void resolveSprites()

    return () => {
      cancelled = true
    }
  }, [sprites])

  useEffect(() => {
    const canvasElement = canvasRef.current
    if (!canvasElement) {
      return
    }
    const toRoomCoordinates = (event: MouseEvent): { x: number; y: number } => {
      const rect = canvasElement.getBoundingClientRect()
      const relativeX = event.clientX - rect.left
      const relativeY = event.clientY - rect.top
      return {
        x: Math.max(0, Math.min(ROOM_WIDTH, relativeX)),
        y: Math.max(0, Math.min(ROOM_HEIGHT, relativeY))
      }
    }
    const toMouseButton = (event: MouseEvent): "left" | "middle" | "right" | null => {
      if (event.button === 0) return "left"
      if (event.button === 1) return "middle"
      if (event.button === 2) return "right"
      return null
    }
    const onMouseMove = (event: MouseEvent): void => {
      if (!controller.isRunning) {
        return
      }
      const point = toRoomCoordinates(event)
      controller.updateRuntimeMousePosition(point.x, point.y)
    }
    const onMouseDown = (event: MouseEvent): void => {
      if (!controller.isRunning) {
        return
      }
      const point = toRoomCoordinates(event)
      controller.updateRuntimeMousePosition(point.x, point.y)
      const button = toMouseButton(event)
      if (button) {
        controller.setRuntimeMouseButton(button, true)
      }
    }
    const onMouseUp = (event: MouseEvent): void => {
      if (!controller.isRunning) {
        return
      }
      const point = toRoomCoordinates(event)
      controller.updateRuntimeMousePosition(point.x, point.y)
      const button = toMouseButton(event)
      if (button) {
        controller.setRuntimeMouseButton(button, false)
      }
    }

    canvasElement.addEventListener("mousemove", onMouseMove)
    canvasElement.addEventListener("mousedown", onMouseDown)
    canvasElement.addEventListener("mouseup", onMouseUp)
    canvasElement.addEventListener("mouseleave", onMouseUp)
    return () => {
      canvasElement.removeEventListener("mousemove", onMouseMove)
      canvasElement.removeEventListener("mousedown", onMouseDown)
      canvasElement.removeEventListener("mouseup", onMouseUp)
      canvasElement.removeEventListener("mouseleave", onMouseUp)
    }
  }, [controller])

  return (
    <div className="mvp15-run-container flex h-[600px] w-full overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
      {/* Left panel: Controls & HUD */}
      <aside className="flex w-[200px] flex-col border-r border-slate-200 bg-slate-50">
        <div className="flex items-center justify-between border-b border-slate-200 p-3">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Run</span>
        </div>

        <div className="flex-1 overflow-y-auto p-3 space-y-4">
          <div className="space-y-2">
            <Button
              className="w-full h-9 text-xs"
              onClick={() => controller.isRunning ? controller.reset() : controller.run()}
            >
              {controller.isRunning ? (
                <>
                  <Square className="mr-2 h-3.5 w-3.5" />
                  Stop
                </>
              ) : (
                <>
                  <Play className="mr-2 h-3.5 w-3.5" />
                  Run
                </>
              )}
            </Button>
          </div>

          <div className="space-y-2">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Status</p>
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-500">Room</span>
                <span className="text-xs font-medium text-slate-800">{controller.activeRoom?.name ?? "none"}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-500">Score</span>
                <span data-testid="run-score" className="text-xs font-medium text-slate-800">{runtimeState.score}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-500">State</span>
                <span
                  data-testid="run-game-state"
                  className={`text-xs font-medium ${runtimeState.gameOver ? "text-red-600" : "text-green-600"}`}
                >
                  {runtimeState.gameOver ? "Game Over" : "Running"}
                </span>
              </div>
              {runtimeState.gameOver && runtimeState.message && (
                <p className="mt-1 rounded bg-red-50 px-2 py-1.5 text-[10px] text-red-600">
                  {runtimeState.message}
                </p>
              )}
            </div>
          </div>

          <div className="mvp16-run-global-vars space-y-2">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Global variables</p>
            {globalVariableEntries.length === 0 ? (
              <p className="mvp16-run-global-vars-empty text-[11px] text-slate-400">No globals defined</p>
            ) : (
              <div className="mvp16-run-global-vars-list space-y-1.5">
                {globalVariableEntries.map((variableEntry) => (
                  <div key={variableEntry.id} className="mvp16-run-global-var-row flex items-center justify-between">
                    <span className="mvp16-run-global-var-name text-xs text-slate-500">{variableEntry.name}</span>
                    <span className="mvp16-run-global-var-value text-xs font-medium text-slate-800">
                      {String(variableEntry.value)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </aside>

      {/* Right panel: Game canvas */}
      <div className="flex flex-1 flex-col">
        <div className="flex h-12 items-center justify-between border-b border-slate-200 px-4">
          <h3 className="text-sm text-slate-800">
            Preview: <span className="font-semibold text-slate-900">{controller.activeRoom?.name ?? "none"}</span>
          </h3>
          {controller.activeRoom && (
            <span className="text-xs text-slate-400">
              {controller.isRunning ? "Playing" : "Stopped"}
            </span>
          )}
        </div>

        <div className="flex-1 overflow-auto p-4 bg-slate-50/50">
          {!controller.activeRoom ? (
            <div className="flex h-full items-center justify-center text-slate-400">
              <p>Create a room first to run the game</p>
            </div>
          ) : (
            <div className="mvp17-run-canvas-wrapper relative" style={{ width: ROOM_WIDTH }}>
              <div
                ref={canvasRef}
                className="mvp15-run-canvas relative overflow-hidden rounded-md border border-dashed border-slate-300 bg-white"
                style={{ width: ROOM_WIDTH, height: ROOM_HEIGHT }}
              >
                {controller.activeRoom.instances.map((instanceEntry) => {
                  const isOutsideRoom =
                    instanceEntry.x < 0 ||
                    instanceEntry.y < 0 ||
                    instanceEntry.x > ROOM_WIDTH - INSTANCE_SIZE ||
                    instanceEntry.y > ROOM_HEIGHT - INSTANCE_SIZE
                  if (isOutsideRoom) {
                    return null
                  }
                  const objectEntry = controller.project.objects.find((entry) => entry.id === instanceEntry.objectId)
                  const spriteEntry = objectEntry?.spriteId ? spriteById[objectEntry.spriteId] : undefined
                  const spriteSource = spriteEntry ? resolvedSpriteSources[spriteEntry.id] : undefined
                  return (
                    <div
                      key={instanceEntry.id}
                      className="mvp15-run-instance absolute flex h-8 w-8 items-center justify-center overflow-hidden rounded bg-indigo-500 text-[10px] text-white"
                      style={{ left: instanceEntry.x, top: instanceEntry.y }}
                    >
                      {spriteSource ? (
                        <img
                          className="mvp15-run-instance-sprite h-full w-full object-cover"
                          src={spriteSource}
                          alt={spriteEntry?.name ?? objectEntry?.name ?? "Sprite"}
                        />
                      ) : (
                        objectEntry?.name.slice(0, 2).toUpperCase() ?? "??"
                      )}
                    </div>
                  )
                })}
              </div>
              {runtimeState.activeToast && (
                <div className="mvp17-run-toast-overlay pointer-events-none absolute bottom-2 right-2 z-20">
                  <div className="mvp17-run-toast-bubble rounded-md bg-slate-900/90 px-3 py-1.5 text-[11px] font-medium text-white shadow-lg">
                    {runtimeState.activeToast.text}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
