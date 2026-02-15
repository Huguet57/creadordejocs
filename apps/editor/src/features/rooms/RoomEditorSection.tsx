import { useCallback, useEffect, useMemo, useRef, useState, type ChangeEvent, type KeyboardEvent } from "react"
import { Box, Grid3X3, Plus, X } from "lucide-react"
import type { EditorController } from "../editor-state/use-editor-controller.js"
import { Button } from "../../components/ui/button.js"
import { resolveAssetSource } from "../assets/asset-source-resolver.js"

const ROOM_WIDTH = 560
const ROOM_HEIGHT = 320

type RoomEditorSectionProps = {
  controller: EditorController
}

export function RoomEditorSection({ controller }: RoomEditorSectionProps) {
  const [isAddingRoom, setIsAddingRoom] = useState(false)
  const [roomName, setRoomName] = useState("Sala nova")
  const [resolvedSpriteSources, setResolvedSpriteSources] = useState<Record<string, string>>({})
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
    <div className="mvp15-room-editor-container flex h-[600px] w-full overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
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

        <div className="flex-1 overflow-auto p-4 bg-slate-50/50">
          {!controller.activeRoom ? (
            <div className="flex h-full items-center justify-center text-slate-400">
              <p>Select or create a room</p>
            </div>
          ) : (
            <div className="space-y-3">
              <div
                className="mvp15-room-canvas relative rounded-md border border-dashed border-slate-300 bg-white"
                style={{ width: ROOM_WIDTH, height: ROOM_HEIGHT }}
                onDragOver={(event) => event.preventDefault()}
                onDrop={(event) => {
                  if (!controller.activeRoom) return
                  const instanceId = event.dataTransfer.getData("text/plain")
                  const rect = event.currentTarget.getBoundingClientRect()
                  const x = Math.max(0, Math.min(ROOM_WIDTH - 32, event.clientX - rect.left - 16))
                  const y = Math.max(0, Math.min(ROOM_HEIGHT - 32, event.clientY - rect.top - 16))
                  controller.moveInstance(instanceId, x, y)
                }}
              >
                {controller.activeRoom.instances.map((instanceEntry) => {
                  const objectEntry = controller.project.objects.find((entry) => entry.id === instanceEntry.objectId)
                  const spriteEntry = objectEntry?.spriteId ? spriteById[objectEntry.spriteId] : undefined
                  const spriteSource = spriteEntry ? resolvedSpriteSources[spriteEntry.id] : undefined
                  return (
                    <div
                      key={instanceEntry.id}
                      className={`mvp15-room-instance group absolute flex h-8 w-8 cursor-move items-center justify-center overflow-hidden rounded text-[10px] ${spriteSource ? "" : "bg-blue-500 text-white"}`}
                      style={{ left: instanceEntry.x, top: instanceEntry.y }}
                      draggable
                      onDragStart={(event) => event.dataTransfer.setData("text/plain", instanceEntry.id)}
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
                        className="absolute -right-1.5 -top-1.5 hidden h-4 w-4 items-center justify-center rounded-full bg-red-500 text-white group-hover:flex"
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
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
