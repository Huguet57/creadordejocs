import { useEffect, useMemo, useRef, useState } from "react"
import { Play, RotateCcw } from "lucide-react"
import type { ProjectV1 } from "@creadordejocs/project-format"
import { Button } from "../../components/ui/button.js"
import {
  DEFAULT_SPRITE_SPEED_MS,
  WINDOW_HEIGHT,
  WINDOW_WIDTH,
  clampValue,
  clampWindowToRoom,
  resolveRoomDimensions
} from "../editor-state/runtime-types.js"
import { sortInstancesByLayer } from "../editor-state/instance-layer-utils.js"
import type { RuntimeMouseButton, RuntimeState } from "../editor-state/runtime.js"
import { resolveSpritePreviewSource, spritePixelsToDataUrl } from "../sprites/utils/sprite-preview-source.js"
import { InstanceDebugPanel } from "./InstanceDebugPanel.js"
import { isInstanceVisibleInWindow, mapPointerToWorldCoordinates, toScreenCoordinates } from "./run-window-utils.js"
import { useInstanceDebug } from "./use-instance-debug.js"

type RunSectionProps = {
  controller: RunSectionController
  mode?: "editor" | "play"
}

export type RunSectionController = {
  project: ProjectV1
  runtimeState: RuntimeState
  activeRoom: ProjectV1["rooms"][number] | null
  isRunning: boolean
  run: () => void
  reset: () => void
  updateRuntimeMousePosition: (x: number, y: number) => void
  setRuntimeMouseButton: (button: RuntimeMouseButton, pressed: boolean) => void
}

function isEditableTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) {
    return false
  }
  const tag = target.tagName.toLowerCase()
  return tag === "input" || tag === "textarea" || target.isContentEditable
}

function formatRuntimeVariableValue(
  value: string | number | boolean | (string | number | boolean)[] | Record<string, string | number | boolean> | undefined
): string {
  if (value === undefined) {
    return "–"
  }
  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
    return String(value)
  }
  return JSON.stringify(value)
}

export function RunSection({ controller, mode = "editor" }: RunSectionProps) {
  const isPlayMode = mode === "play"
  const { runtimeState } = controller
  const [resolvedSpriteSources, setResolvedSpriteSources] = useState<Record<string, string>>({})
  const canvasRef = useRef<HTMLDivElement>(null)

  const instanceDebug = useInstanceDebug({
    isRunning: controller.isRunning,
    activeRoom: controller.activeRoom,
    objects: controller.project.objects
  })

  const activeRoomDimensions = useMemo(
    () => resolveRoomDimensions(controller.activeRoom),
    [controller.activeRoom]
  )
  const windowPosition = useMemo(() => {
    if (!controller.activeRoom) {
      return { x: 0, y: 0 }
    }
    const stored = runtimeState.windowByRoomId?.[controller.activeRoom.id] ?? { x: 0, y: 0 }
    return clampWindowToRoom(stored.x, stored.y, activeRoomDimensions.width, activeRoomDimensions.height)
  }, [controller.activeRoom, runtimeState.windowByRoomId, activeRoomDimensions.width, activeRoomDimensions.height])
  const rawMouseX = runtimeState.mouse.x
  const rawMouseY = runtimeState.mouse.y
  const mouseX = Math.round(clampValue(rawMouseX, 0, activeRoomDimensions.width))
  const mouseY = Math.round(clampValue(rawMouseY, 0, activeRoomDimensions.height))
  const userGlobalVariableEntries = controller.project.variables.global.map((variableEntry) => ({
    id: variableEntry.id,
    name: variableEntry.name,
    value: runtimeState.globalVariables[variableEntry.id]
  }))
  const mouseVariableEntries = [
    { id: "mouse.x", name: "mouse.x", value: mouseX },
    { id: "mouse.y", name: "mouse.y", value: mouseY }
  ]
  const sortedActiveRoomInstances = useMemo(
    () => sortInstancesByLayer(controller.activeRoom?.instances ?? []),
    [controller.activeRoom?.instances]
  )

  const sprites = controller.project.resources.sprites
  const spriteById = useMemo(
    () => Object.fromEntries(sprites.map((spriteEntry) => [spriteEntry.id, spriteEntry])),
    [sprites]
  )
  const activeRoomBackgroundSpriteId = controller.activeRoom?.backgroundSpriteId ?? null
  const activeRoomBackgroundSprite = activeRoomBackgroundSpriteId ? spriteById[activeRoomBackgroundSpriteId] : undefined
  const activeRoomBackgroundSource = activeRoomBackgroundSprite ? resolvedSpriteSources[activeRoomBackgroundSprite.id] : undefined

  const resolvedSpriteFrameUrls = useMemo(() => {
    const result: Record<string, string[]> = {}
    for (const spriteEntry of sprites) {
      if (spriteEntry.frames.length > 1) {
        result[spriteEntry.id] = spriteEntry.frames.map((frame) =>
          spritePixelsToDataUrl(frame.pixelsRgba, spriteEntry.width, spriteEntry.height)
        )
      }
    }
    return result
  }, [sprites])

  useEffect(() => {
    let cancelled = false

    const resolveSprites = async () => {
      const pairs = await Promise.all(
        sprites.map(async (spriteEntry) => {
          const resolved = await resolveSpritePreviewSource(spriteEntry)
          return [spriteEntry.id, resolved] as const
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
    const onKeyDown = (event: KeyboardEvent): void => {
      if (event.repeat) {
        return
      }
      if (isEditableTarget(event.target)) {
        return
      }
      if (controller.isRunning || !controller.activeRoom) {
        return
      }
      event.preventDefault()
      controller.run()
    }

    window.addEventListener("keydown", onKeyDown)
    return () => {
      window.removeEventListener("keydown", onKeyDown)
    }
  }, [controller])

  useEffect(() => {
    const canvasElement = canvasRef.current
    if (!canvasElement) {
      return
    }
    const toWorldCoordinates = (event: MouseEvent): { x: number; y: number } => {
      const rect = canvasElement.getBoundingClientRect()
      return mapPointerToWorldCoordinates({
        clientX: event.clientX,
        clientY: event.clientY,
        rectLeft: rect.left,
        rectTop: rect.top,
        windowX: windowPosition.x,
        windowY: windowPosition.y,
        roomWidth: activeRoomDimensions.width,
        roomHeight: activeRoomDimensions.height
      })
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
      const point = toWorldCoordinates(event)
      controller.updateRuntimeMousePosition(point.x, point.y)
    }
    const onMouseDown = (event: MouseEvent): void => {
      if (!controller.isRunning) {
        if (controller.activeRoom) {
          controller.run()
        }
        return
      }
      const point = toWorldCoordinates(event)
      controller.updateRuntimeMousePosition(point.x, point.y)
      const button = toMouseButton(event)
      if (button) {
        controller.setRuntimeMouseButton(button, true)
      }
      if (!isPlayMode) {
        instanceDebug.handleCanvasClick(point.x, point.y)
      }
    }
    const onMouseUp = (event: MouseEvent): void => {
      if (!controller.isRunning) {
        return
      }
      const point = toWorldCoordinates(event)
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
  }, [controller, isPlayMode, instanceDebug, windowPosition.x, windowPosition.y, activeRoomDimensions.width, activeRoomDimensions.height])

  const runCanvasBackgroundStyle = useMemo(() => {
    if (!activeRoomBackgroundSprite || !activeRoomBackgroundSource) {
      return {}
    }
    return {
      backgroundImage: `url(${JSON.stringify(activeRoomBackgroundSource)})`,
      backgroundRepeat: "repeat",
      backgroundSize: `${Math.max(1, Math.round(activeRoomBackgroundSprite.width))}px ${Math.max(1, Math.round(activeRoomBackgroundSprite.height))}px`,
      backgroundPosition: `${-windowPosition.x}px ${-windowPosition.y}px`
    }
  }, [activeRoomBackgroundSprite, activeRoomBackgroundSource, windowPosition.x, windowPosition.y])

  return (
    <div className={`mvp15-run-container flex w-full overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm ${isPlayMode ? "min-h-[560px]" : "h-[600px]"}`}>
      {!isPlayMode && (
        <aside className="flex w-[200px] flex-col border-r border-slate-200 bg-slate-50">
          <div className="flex items-center justify-between border-b border-slate-200 p-3">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Run</span>
          </div>

          <div className="flex-1 overflow-y-auto p-3 space-y-4">
            <div className="space-y-2">
              <Button
                className="w-full h-9 text-xs"
                tabIndex={-1}
                onKeyDown={(e) => e.preventDefault()}
                onClick={() => controller.isRunning ? controller.reset() : controller.run()}
              >
                {controller.isRunning ? (
                  <>
                    <RotateCcw className="mr-2 h-3.5 w-3.5" />
                    Reset
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
                    {runtimeState.gameOver ? "Ha acabat el joc" : "Running"}
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
              {userGlobalVariableEntries.length === 0 ? (
                <p className="mvp16-run-global-vars-empty text-[11px] text-slate-400">No globals defined</p>
              ) : (
                <div className="mvp16-run-global-vars-list space-y-1.5">
                  {userGlobalVariableEntries.map((variableEntry) => (
                    <div key={variableEntry.id} className="mvp16-run-global-var-row flex items-center justify-between">
                      <span className="mvp16-run-global-var-name text-xs text-slate-500">{variableEntry.name}</span>
                      <span className="mvp16-run-global-var-value text-xs font-medium text-slate-800">
                        {formatRuntimeVariableValue(variableEntry.value)}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div className="mvp16-run-mouse-vars space-y-2">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Mouse</p>
              <div className="mvp16-run-mouse-vars-list space-y-1.5">
                {mouseVariableEntries.map((variableEntry) => (
                  <div key={variableEntry.id} className="mvp16-run-mouse-var-row flex items-center justify-between">
                    <span className="mvp16-run-mouse-var-name text-xs text-slate-500">{variableEntry.name}</span>
                    <span className="mvp16-run-mouse-var-value text-xs font-medium text-slate-800">
                      {formatRuntimeVariableValue(variableEntry.value)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
            <InstanceDebugPanel
              project={controller.project}
              runtimeState={runtimeState}
              activeRoom={controller.activeRoom}
              isRunning={controller.isRunning}
              debugEnabled={instanceDebug.debugEnabled}
              onDebugEnabledChange={instanceDebug.setDebugEnabled}
              selectedInstanceId={instanceDebug.selectedInstanceId}
              onSelectedInstanceIdChange={instanceDebug.setSelectedInstanceId}
            />
          </div>
        </aside>
      )}

      {/* Right panel: Game canvas */}
      <div className="flex flex-1 flex-col">
        {!isPlayMode && (
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
        )}

        <div className={`flex-1 overflow-auto ${isPlayMode ? "bg-slate-50" : "bg-slate-50/50"}`}>
          {isPlayMode && (
            <div className="mb-3 flex items-center justify-end">
              <Button
                className="h-9 text-xs"
                tabIndex={-1}
                onKeyDown={(e) => e.preventDefault()}
                onClick={() => controller.isRunning ? controller.reset() : controller.run()}
              >
                {controller.isRunning ? (
                  <>
                    <RotateCcw className="mr-2 h-3.5 w-3.5" />
                    Reset
                  </>
                ) : (
                  <>
                    <Play className="mr-2 h-3.5 w-3.5" />
                    Run
                  </>
                )}
              </Button>
            </div>
          )}
          {!controller.activeRoom ? (
            <div className="flex h-full items-center justify-center text-slate-400">
              <p>Create a room first to run the game</p>
            </div>
          ) : (
            <div className="mvp17-run-canvas-wrapper relative" style={{ width: WINDOW_WIDTH }}>
              <div
                ref={canvasRef}
                className="mvp15-run-canvas relative overflow-hidden border-b border-slate-200 bg-white"
                style={{ width: WINDOW_WIDTH, height: WINDOW_HEIGHT, ...runCanvasBackgroundStyle }}
              >
                {!controller.isRunning && (
                  <div className="mvp19-run-start-overlay pointer-events-none absolute inset-0 z-10 flex items-center justify-center bg-slate-900/30">
                    <div className="mvp19-run-start-overlay-card rounded-md border border-slate-200 bg-white/95 px-4 py-2 text-center shadow-sm">
                      <p className="text-xs font-semibold text-slate-800">Prem qualsevol tecla per començar</p>
                      <p className="text-[11px] text-slate-500">També pots clicar amb el mouse</p>
                    </div>
                  </div>
                )}
                {sortedActiveRoomInstances.map((instanceEntry) => {
                  const objectEntry = controller.project.objects.find((entry) => entry.id === instanceEntry.objectId)
                  const instanceWidth = objectEntry?.width ?? 32
                  const instanceHeight = objectEntry?.height ?? 32
                  if (
                    !isInstanceVisibleInWindow({
                      instanceX: instanceEntry.x,
                      instanceY: instanceEntry.y,
                      instanceWidth,
                      instanceHeight,
                      windowX: windowPosition.x,
                      windowY: windowPosition.y
                    })
                  ) {
                    return null
                  }
                  if (objectEntry?.visible === false) {
                    return null
                  }
                  const screenPosition = toScreenCoordinates(
                    instanceEntry.x,
                    instanceEntry.y,
                    windowPosition.x,
                    windowPosition.y
                  )
                  const effectiveSpriteId = runtimeState.spriteOverrideByInstanceId[instanceEntry.id] ?? objectEntry?.spriteId
                  const spriteEntry = effectiveSpriteId ? spriteById[effectiveSpriteId] : undefined

                  const frameUrls = spriteEntry ? resolvedSpriteFrameUrls[spriteEntry.id] : undefined
                  let spriteSource: string | undefined
                  if (frameUrls && frameUrls.length > 1) {
                    const speedMs = runtimeState.spriteSpeedMsByInstanceId[instanceEntry.id] ?? DEFAULT_SPRITE_SPEED_MS
                    const elapsed = runtimeState.spriteAnimationElapsedMsByInstanceId[instanceEntry.id] ?? 0
                    if (speedMs <= 0) {
                      spriteSource = frameUrls[0]
                    } else {
                      const frameIndex = Math.floor(elapsed / speedMs) % frameUrls.length
                      spriteSource = frameUrls[frameIndex] ?? frameUrls[0]
                    }
                  } else {
                    spriteSource = spriteEntry ? resolvedSpriteSources[spriteEntry.id] : undefined
                  }

                  const isDebugSelected = instanceDebug.debugEnabled && instanceEntry.id === instanceDebug.selectedInstanceId

                  return (
                    <div
                      key={instanceEntry.id}
                      className={`mvp15-run-instance absolute flex items-center justify-center overflow-hidden text-[10px] ${spriteSource ? "" : "bg-indigo-500 text-white"}`}
                      style={{
                        left: screenPosition.x,
                        top: screenPosition.y,
                        width: instanceWidth,
                        height: instanceHeight,
                        transform: `rotate(${instanceEntry.rotation ?? 0}deg)`,
                        ...(isDebugSelected
                          ? { outline: "2px solid #3b82f6", outlineOffset: "1px", zIndex: 50 }
                          : {})
                      }}
                    >
                      {spriteSource ? (
                        <img
                          className="mvp15-run-instance-sprite h-full w-full object-contain"
                          src={spriteSource}
                          alt={spriteEntry?.name ?? objectEntry?.name ?? "Sprite"}
                          style={{ imageRendering: "pixelated" }}
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
