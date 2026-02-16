import { useCallback, useEffect, useMemo, useRef, useState, type ChangeEvent, type KeyboardEvent } from "react"
import { Box, Grid3X3, Plus, X } from "lucide-react"
import type { EditorController } from "../editor-state/use-editor-controller.js"
import { Button } from "../../components/ui/button.js"
import { resolveAssetSource } from "../assets/asset-source-resolver.js"

const ROOM_WIDTH = 832
const ROOM_HEIGHT = 480
const ROOM_GRID_SIZE = 32
const DRAG_SNAP_SIZE = 4
const DEFAULT_INSTANCE_SIZE = 32

type RoomDragPreview = {
  instanceId: string
  x: number
  y: number
  width: number
  height: number
}

export function snapToGrid(value: number, gridSize: number): number {
  return Math.round(value / gridSize) * gridSize
}

export function calculateRoomDragPosition(params: {
  clientX: number
  clientY: number
  rectLeft: number
  rectTop: number
  roomWidth: number
  roomHeight: number
  instanceWidth: number
  instanceHeight: number
  snapSize: number
}): { x: number; y: number } {
  const rawX = params.clientX - params.rectLeft - params.instanceWidth / 2
  const rawY = params.clientY - params.rectTop - params.instanceHeight / 2
  const maxX = params.roomWidth - params.instanceWidth
  const maxY = params.roomHeight - params.instanceHeight
  const clampedX = Math.max(0, Math.min(maxX, rawX))
  const clampedY = Math.max(0, Math.min(maxY, rawY))
  const snappedX = snapToGrid(clampedX, params.snapSize)
  const snappedY = snapToGrid(clampedY, params.snapSize)
  return {
    x: Math.max(0, Math.min(maxX, snappedX)),
    y: Math.max(0, Math.min(maxY, snappedY))
  }
}

type RoomEditorSectionProps = {
  controller: EditorController
}

export function RoomEditorSection({ controller }: RoomEditorSectionProps) {
  const [isAddingRoom, setIsAddingRoom] = useState(false)
  const [roomName, setRoomName] = useState("Sala nova")
  const [resolvedSpriteSources, setResolvedSpriteSources] = useState<Record<string, string>>({})
  const [dragPreview, setDragPreview] = useState<RoomDragPreview | null>(null)
  const [draggingInstanceId, setDraggingInstanceId] = useState<string | null>(null)
  const transparentDragImageRef = useRef<HTMLDivElement | null>(null)
  const idleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const sprites = controller.project.resources.sprites
  const spriteById = useMemo(
    () => Object.fromEntries(sprites.map((spriteEntry) => [spriteEntry.id, spriteEntry])),
    [sprites]
  )

  const resetIdleTimer = () => {
    if (idleTimerRef.current) clearTimeout(idleTimerRef.current)
    idleTimerRef.current = setTimeout(() => setIsAddingRoom(false), 5000)
  }

  useEffect(() => {
    return () => {
      if (transparentDragImageRef.current) {
        transparentDragImageRef.current.remove()
        transparentDragImageRef.current = null
      }
    }
  }, [])

  useEffect(() => {
    if (isAddingRoom) {
      resetIdleTimer()
    }
    return () => {
      if (idleTimerRef.current) clearTimeout(idleTimerRef.current)
    }
  }, [isAddingRoom])

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

  const inputCallbackRef = useCallback((node: HTMLInputElement | null) => {
    if (node) node.select()
  }, [])

  const blockUndoShortcuts = (event: KeyboardEvent<HTMLInputElement>): void => {
    if ((event.metaKey || event.ctrlKey) && (event.key.toLowerCase() === "z" || event.key.toLowerCase() === "y")) {
      event.preventDefault()
    }
  }

  const handleAddRoom = () => {
    if (!roomName.trim()) return
    controller.addRoom(roomName)
    setRoomName("Sala nova")
    setIsAddingRoom(false)
  }

  return (
    <div className="mvp15-room-editor-container flex h-[700px] w-full overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
      {/* Left panel: Rooms list */}
      <aside className="mvp3-room-list-panel flex w-[200px] flex-col border-r border-slate-200 bg-slate-50">
        <div className="flex items-center justify-between border-b border-slate-200 p-3">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Rooms</span>
        </div>

        <div className="flex-1 overflow-y-auto p-2">
          <div className="flex flex-col gap-1">
            {controller.project.rooms.length === 0 && (
              <p className="px-2 py-4 text-center text-xs text-slate-400">No rooms yet</p>
            )}
            {controller.project.rooms.map((room) => (
              <button
                key={room.id}
                type="button"
                className={`flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-sm transition-colors ${
                  controller.activeRoomId === room.id
                    ? "bg-white font-medium text-slate-900 shadow-sm ring-1 ring-slate-200"
                    : "text-slate-600 hover:bg-slate-100"
                }`}
                onClick={() => controller.setActiveRoomId(room.id)}
              >
                <Grid3X3 className={`h-3.5 w-3.5 ${controller.activeRoomId === room.id ? "text-blue-500" : "text-slate-400"}`} />
                <span className="truncate">{room.name}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="border-t border-slate-200 bg-white p-3">
          {isAddingRoom ? (
            <div className="flex gap-2">
              <input
                ref={inputCallbackRef}
                value={roomName}
                onChange={(e: ChangeEvent<HTMLInputElement>) => {
                  setRoomName(e.target.value)
                  resetIdleTimer()
                }}
                onKeyDown={(e: KeyboardEvent<HTMLInputElement>) => {
                  blockUndoShortcuts(e)
                  resetIdleTimer()
                  if (e.key === "Enter") handleAddRoom()
                  if (e.key === "Escape") setIsAddingRoom(false)
                }}
                className="flex h-8 w-full rounded-md border border-slate-300 bg-white px-3 py-1 text-xs shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400"
                placeholder="Room name..."
              />
              <Button
                size="sm"
                className="h-8 w-8 shrink-0 px-0"
                onClick={handleAddRoom}
                title="Add room"
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          ) : (
            <Button
              variant="outline"
              size="sm"
              className="w-full h-8 text-xs"
              onClick={() => setIsAddingRoom(true)}
            >
              <Plus className="mr-2 h-3.5 w-3.5" />
              Add Room
            </Button>
          )}
        </div>
      </aside>

      {/* Middle panel: Object picker */}
      <aside className="mvp3-room-object-picker flex w-[180px] flex-col border-r border-slate-200 bg-slate-50">
        <div className="flex items-center justify-between border-b border-slate-200 p-3">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Objects</span>
        </div>

        <div className="flex-1 overflow-y-auto p-2">
          <div className="flex flex-col gap-1">
            {controller.project.objects.length === 0 && (
              <p className="px-2 py-4 text-center text-xs text-slate-400">No objects</p>
            )}
            {controller.project.objects.map((obj) => (
              <button
                key={obj.id}
                type="button"
                className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-sm text-slate-600 transition-colors hover:bg-slate-100"
                onClick={() => controller.addInstanceToActiveRoom(obj.id)}
                title={`Add ${obj.name} to room`}
                disabled={!controller.activeRoom}
              >
                <Box className="h-3.5 w-3.5 text-slate-400" />
                <span className="truncate">{obj.name}</span>
                <Plus className="ml-auto h-3 w-3 text-slate-300" />
              </button>
            ))}
          </div>
        </div>
      </aside>

      {/* Right panel: Canvas */}
      <div className="flex flex-1 flex-col">
        <div className="flex h-12 items-center justify-between border-b border-slate-200 px-4">
          <h3 className="text-sm text-slate-800">
            Room: <span className="font-semibold text-slate-900">{controller.activeRoom?.name ?? "none"}</span>
          </h3>
          {controller.activeRoom && (
            <span className="text-xs text-slate-400">
              {controller.activeRoom.instances.length} instance{controller.activeRoom.instances.length !== 1 ? "s" : ""}
            </span>
          )}
        </div>

        <div className="flex-1 overflow-auto bg-slate-50/50">
          {!controller.activeRoom ? (
            <div className="flex h-full items-center justify-center text-slate-400">
              <p>Select or create a room</p>
            </div>
          ) : (
            <div className="space-y-3">
              <div
                className="mvp15-room-canvas mvp18-room-grid-canvas relative border-b border-slate-200 bg-white"
                style={{
                  width: ROOM_WIDTH,
                  height: ROOM_HEIGHT,
                  backgroundImage:
                    "linear-gradient(to right, rgb(226 232 240 / 0.8) 1px, transparent 1px), linear-gradient(to bottom, rgb(226 232 240 / 0.8) 1px, transparent 1px)",
                  backgroundSize: `${ROOM_GRID_SIZE}px ${ROOM_GRID_SIZE}px`
                }}
                onDragOver={(event) => {
                  event.preventDefault()
                  if (!controller.activeRoom || !draggingInstanceId) return
                  const instanceEntry = controller.activeRoom.instances.find((candidate) => candidate.id === draggingInstanceId)
                  const objectEntry = instanceEntry
                    ? controller.project.objects.find((candidate) => candidate.id === instanceEntry.objectId)
                    : null
                  const instanceWidth = objectEntry?.width ?? DEFAULT_INSTANCE_SIZE
                  const instanceHeight = objectEntry?.height ?? DEFAULT_INSTANCE_SIZE
                  const rect = event.currentTarget.getBoundingClientRect()
                  const position = calculateRoomDragPosition({
                    clientX: event.clientX,
                    clientY: event.clientY,
                    rectLeft: rect.left,
                    rectTop: rect.top,
                    roomWidth: ROOM_WIDTH,
                    roomHeight: ROOM_HEIGHT,
                    instanceWidth,
                    instanceHeight,
                    snapSize: DRAG_SNAP_SIZE
                  })
                  setDragPreview({
                    instanceId: draggingInstanceId,
                    x: position.x,
                    y: position.y,
                    width: instanceWidth,
                    height: instanceHeight
                  })
                }}
                onDragLeave={(event) => {
                  if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
                    setDragPreview(null)
                  }
                }}
                onDrop={(event) => {
                  event.preventDefault()
                  if (!controller.activeRoom) return
                  const instanceId = event.dataTransfer.getData("text/plain")
                  const instanceEntry = controller.activeRoom.instances.find((candidate) => candidate.id === instanceId)
                  const objectEntry = instanceEntry
                    ? controller.project.objects.find((candidate) => candidate.id === instanceEntry.objectId)
                    : null
                  const instanceWidth = objectEntry?.width ?? DEFAULT_INSTANCE_SIZE
                  const instanceHeight = objectEntry?.height ?? DEFAULT_INSTANCE_SIZE
                  const rect = event.currentTarget.getBoundingClientRect()
                  const position = calculateRoomDragPosition({
                    clientX: event.clientX,
                    clientY: event.clientY,
                    rectLeft: rect.left,
                    rectTop: rect.top,
                    roomWidth: ROOM_WIDTH,
                    roomHeight: ROOM_HEIGHT,
                    instanceWidth,
                    instanceHeight,
                    snapSize: DRAG_SNAP_SIZE
                  })
                  controller.moveInstance(instanceId, position.x, position.y)
                  setDragPreview(null)
                  setDraggingInstanceId(null)
                }}
              >
                {controller.activeRoom.instances.map((instanceEntry) => {
                  const objectEntry = controller.project.objects.find((entry) => entry.id === instanceEntry.objectId)
                  const spriteEntry = objectEntry?.spriteId ? spriteById[objectEntry.spriteId] : undefined
                  const spriteSource = spriteEntry ? resolvedSpriteSources[spriteEntry.id] : undefined
                  const instanceWidth = objectEntry?.width ?? DEFAULT_INSTANCE_SIZE
                  const instanceHeight = objectEntry?.height ?? DEFAULT_INSTANCE_SIZE
                  return (
                    <div
                      key={instanceEntry.id}
                      className={`mvp15-room-instance group absolute flex cursor-move items-center justify-center rounded text-[10px] ${spriteSource ? "" : "bg-blue-500 text-white"} ${draggingInstanceId === instanceEntry.id ? "opacity-30" : ""}`}
                      style={{ left: instanceEntry.x, top: instanceEntry.y, width: instanceWidth, height: instanceHeight }}
                      draggable
                      onDragStart={(event) => {
                        event.dataTransfer.setData("text/plain", instanceEntry.id)
                        event.dataTransfer.effectAllowed = "move"
                        if (!transparentDragImageRef.current) {
                          const element = document.createElement("div")
                          element.style.width = "1px"
                          element.style.height = "1px"
                          element.style.position = "fixed"
                          element.style.top = "-1000px"
                          element.style.left = "-1000px"
                          element.style.opacity = "0.01"
                          document.body.appendChild(element)
                          transparentDragImageRef.current = element
                        }
                        event.dataTransfer.setDragImage(transparentDragImageRef.current, 0, 0)
                        setDraggingInstanceId(instanceEntry.id)
                      }}
                      onDragEnd={() => {
                        setDragPreview(null)
                        setDraggingInstanceId(null)
                      }}
                      title={
                        objectEntry
                          ? `${objectEntry.name} (${Math.round(instanceEntry.x)}, ${Math.round(instanceEntry.y)})`
                          : "Instance"
                      }
                    >
                      {spriteSource ? (
                        <img
                          className="mvp15-room-instance-sprite h-full w-full object-contain"
                          src={spriteSource}
                          alt={spriteEntry?.name ?? objectEntry?.name ?? "Sprite"}
                        />
                      ) : (
                        objectEntry?.name.slice(0, 2).toUpperCase() ?? "??"
                      )}
                      <button
                        type="button"
                        className={`absolute -right-1.5 -top-1.5 h-4 w-4 items-center justify-center rounded-full bg-red-500 text-white ${draggingInstanceId ? "hidden" : "hidden group-hover:flex"}`}
                        onClick={(e) => {
                          e.stopPropagation()
                          controller.removeInstance(instanceEntry.id)
                        }}
                        title="Remove instance"
                      >
                        <X className="h-2.5 w-2.5" />
                      </button>
                    </div>
                  )
                })}
                {dragPreview && (
                  <div
                    className="mvp19-room-drag-ghost pointer-events-none absolute z-10 rounded border-2 border-blue-400 bg-blue-400/20"
                    style={{
                      left: dragPreview.x,
                      top: dragPreview.y,
                      width: dragPreview.width,
                      height: dragPreview.height
                    }}
                    aria-hidden
                  />
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
