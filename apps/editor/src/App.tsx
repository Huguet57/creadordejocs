import { useEffect, useMemo, useState, type ChangeEvent } from "react"
import {
  addRoomInstance,
  createEmptyProjectV1,
  createRoom,
  incrementMetric,
  moveRoomInstance,
  quickCreateObject,
  quickCreateSound,
  quickCreateSprite,
  updateObjectProperties,
  type ProjectV1
} from "@creadordejocs/project-format"
import { Button } from "./components/ui/button.js"
import { Card, CardContent, CardHeader, CardTitle } from "./components/ui/card.js"
import { Input } from "./components/ui/input.js"
import { Label } from "./components/ui/label.js"
import {
  loadProjectFromLocalStorage,
  saveProjectLocally,
  type SaveStatus
} from "./features/project-storage.js"

const ROOM_WIDTH = 560
const ROOM_HEIGHT = 320

function ensureProjectHasRoom(project: ProjectV1): { project: ProjectV1; roomId: string } {
  const firstRoom = project.rooms[0]
  if (firstRoom) {
    return { project, roomId: firstRoom.id }
  }

  return createRoom(project, "Sala principal")
}

function formatStatus(status: SaveStatus): string {
  if (status === "saved") return "Saved"
  if (status === "saving") return "Saving"
  if (status === "error") return "Error"
  return "Idle"
}

export function App() {
  const [project, setProject] = useState<ProjectV1>(() => {
    const loadedProject = loadProjectFromLocalStorage()
    if (loadedProject) {
      return loadedProject
    }

    const initial = createEmptyProjectV1("Primer joc autònom")
    const withMetric = incrementMetric(initial, "appStart")
    return ensureProjectHasRoom(withMetric).project
  })
  const [activeRoomId, setActiveRoomId] = useState<string>(() => {
    const loadedProject = loadProjectFromLocalStorage()
    if (loadedProject?.rooms[0]) {
      return loadedProject.rooms[0].id
    }
    return "room-bootstrap"
  })
  const [activeObjectId, setActiveObjectId] = useState<string | null>(null)
  const [spriteName, setSpriteName] = useState("Sprite nou")
  const [soundName, setSoundName] = useState("So nou")
  const [objectName, setObjectName] = useState("Objecte nou")
  const [roomName, setRoomName] = useState("Sala nova")
  const [isRunning, setIsRunning] = useState(false)
  const [runSnapshot, setRunSnapshot] = useState<ProjectV1 | null>(null)
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("idle")

  useEffect(() => {
    setProject((previous) => {
      const { project: normalized, roomId } = ensureProjectHasRoom(previous)
      setActiveRoomId((current) => (current === "room-bootstrap" ? roomId : current))
      return normalized
    })
  }, [])

  const activeRoom = useMemo(
    () => project.rooms.find((room) => room.id === activeRoomId) ?? project.rooms[0] ?? null,
    [project.rooms, activeRoomId]
  )

  const selectedObject = useMemo(
    () => project.objects.find((entry) => entry.id === activeObjectId) ?? null,
    [project.objects, activeObjectId]
  )

  useEffect(() => {
    if (!isRunning || !activeRoom) {
      return
    }

    const interval = window.setInterval(() => {
      setProject((previous) => ({
        ...previous,
        rooms: previous.rooms.map((room) => {
          if (room.id !== activeRoom.id) {
            return room
          }

          return {
            ...room,
            instances: room.instances.map((instance) => {
              const objectEntry = previous.objects.find((objectValue) => objectValue.id === instance.objectId)
              if (!objectEntry) {
                return instance
              }

              const radians = (objectEntry.direction * Math.PI) / 180
              const nextX = Math.max(0, Math.min(ROOM_WIDTH - 32, instance.x + Math.cos(radians) * objectEntry.speed))
              const nextY = Math.max(0, Math.min(ROOM_HEIGHT - 32, instance.y + Math.sin(radians) * objectEntry.speed))
              return { ...instance, x: nextX, y: nextY }
            })
          }
        })
      }))
    }, 80)

    return () => window.clearInterval(interval)
  }, [activeRoom, isRunning])

  const handleSave = (): void => {
    try {
      setSaveStatus("saving")
      saveProjectLocally(project)
      setSaveStatus("saved")
    } catch {
      setSaveStatus("error")
    }
  }

  const handleLoad = (): void => {
    try {
      setSaveStatus("saving")
      const loaded = loadProjectFromLocalStorage()
      if (!loaded) {
        setSaveStatus("error")
        return
      }
      const { project: normalized, roomId } = ensureProjectHasRoom(loaded)
      setProject(normalized)
      setActiveRoomId(roomId)
      setIsRunning(false)
      setRunSnapshot(null)
      setSaveStatus("saved")
    } catch {
      setSaveStatus("error")
    }
  }

  const addSprite = (): void => {
    if (!spriteName.trim()) return
    const result = quickCreateSprite(project, spriteName.trim())
    setProject(result.project)
    setSpriteName("Sprite nou")
  }

  const addSound = (): void => {
    if (!soundName.trim()) return
    const result = quickCreateSound(project, soundName.trim())
    setProject(result.project)
    setSoundName("So nou")
  }

  const addObject = (): void => {
    if (!objectName.trim()) return
    const spriteId = project.resources.sprites[0]?.id ?? null
    const result = quickCreateObject(project, {
      name: objectName.trim(),
      spriteId,
      x: 64,
      y: 64,
      speed: 1,
      direction: 0
    })
    setProject(result.project)
    setActiveObjectId(result.objectId)
    setObjectName("Objecte nou")
  }

  const addRoom = (): void => {
    if (!roomName.trim()) return
    const result = createRoom(project, roomName.trim())
    setProject(result.project)
    setActiveRoomId(result.roomId)
    setRoomName("Sala nova")
  }

  const addInstanceToActiveRoom = (): void => {
    if (!activeRoom || !selectedObject) return
    const result = addRoomInstance(project, {
      roomId: activeRoom.id,
      objectId: selectedObject.id,
      x: 80,
      y: 80
    })
    setProject(result.project)
  }

  const updateSelectedObjectProperty = (
    key: "x" | "y" | "speed" | "direction",
    value: number
  ): void => {
    if (!selectedObject) return
    const normalized = Number.isFinite(value) ? value : 0
    const nextObject = { ...selectedObject, [key]: normalized }
    setProject(
      updateObjectProperties(project, {
        objectId: selectedObject.id,
        x: nextObject.x,
        y: nextObject.y,
        speed: nextObject.speed,
        direction: nextObject.direction
      })
    )
  }

  const handleRun = (): void => {
    if (isRunning) return
    setRunSnapshot(project)
    setIsRunning(true)
  }

  const handleReset = (): void => {
    if (runSnapshot) {
      setProject(runSnapshot)
    }
    setIsRunning(false)
  }

  return (
    <main className="mvp1-editor-shell min-h-screen bg-slate-50 px-4 py-6 text-slate-900">
      <div className="mvp1-editor-layout mx-auto grid max-w-7xl gap-4 lg:grid-cols-[1.1fr_1.4fr_1fr]">
        <Card className="mvp1-editor-panel">
          <CardHeader>
            <CardTitle>Resources i objectes</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <section className="mvp1-editor-section space-y-2">
              <Label htmlFor="sprite-name">Sprite ràpid</Label>
              <div className="mvp1-editor-row flex gap-2">
                <Input
                  id="sprite-name"
                  value={spriteName}
                  onChange={(event: ChangeEvent<HTMLInputElement>) => setSpriteName(event.target.value)}
                />
                <Button onClick={addSprite} variant="secondary">
                  + Sprite
                </Button>
              </div>
            </section>

            <section className="mvp1-editor-section space-y-2">
              <Label htmlFor="sound-name">So ràpid</Label>
              <div className="mvp1-editor-row flex gap-2">
                <Input
                  id="sound-name"
                  value={soundName}
                  onChange={(event: ChangeEvent<HTMLInputElement>) => setSoundName(event.target.value)}
                />
                <Button onClick={addSound} variant="secondary">
                  + So
                </Button>
              </div>
            </section>

            <section className="mvp1-editor-section space-y-2">
              <Label htmlFor="object-name">Objecte ràpid</Label>
              <div className="mvp1-editor-row flex gap-2">
                <Input
                  id="object-name"
                  value={objectName}
                  onChange={(event: ChangeEvent<HTMLInputElement>) => setObjectName(event.target.value)}
                />
                <Button onClick={addObject}>+ Objecte</Button>
              </div>
            </section>

            <section className="mvp1-editor-section space-y-2">
              <Label htmlFor="room-name">Sala ràpida</Label>
              <div className="mvp1-editor-row flex gap-2">
                <Input
                  id="room-name"
                  value={roomName}
                  onChange={(event: ChangeEvent<HTMLInputElement>) => setRoomName(event.target.value)}
                />
                <Button onClick={addRoom} variant="outline">
                  + Sala
                </Button>
              </div>
            </section>

            <div className="mvp1-editor-list rounded-md border border-slate-200 bg-white p-2">
              <p className="text-xs font-semibold text-slate-600">Objectes</p>
              <div className="mt-2 flex flex-wrap gap-2">
                {project.objects.map((entry) => (
                  <button
                    key={entry.id}
                    type="button"
                    className={`mvp1-editor-object-chip rounded border px-2 py-1 text-xs ${
                      activeObjectId === entry.id ? "border-slate-900 bg-slate-900 text-white" : "border-slate-300 bg-slate-100"
                    }`}
                    onClick={() => setActiveObjectId(entry.id)}
                  >
                    {entry.name}
                  </button>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="mvp1-editor-panel">
          <CardHeader className="flex-row items-center justify-between space-y-0">
            <CardTitle>Room editor</CardTitle>
            <div className="mvp1-editor-row flex gap-2">
              <Button onClick={handleRun}>Run</Button>
              <Button onClick={handleReset} variant="secondary">
                Reset
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="mvp1-editor-row flex items-center gap-2">
              <Label>Sala activa</Label>
              <select
                className="mvp1-editor-select h-9 rounded border border-slate-300 px-2 text-sm"
                value={activeRoom?.id ?? ""}
                onChange={(event) => setActiveRoomId(event.target.value)}
              >
                {project.rooms.map((room) => (
                  <option key={room.id} value={room.id}>
                    {room.name}
                  </option>
                ))}
              </select>
              <Button onClick={addInstanceToActiveRoom} variant="outline" size="sm" disabled={!activeRoom || !selectedObject}>
                + Instància
              </Button>
            </div>

            <div
              className="mvp1-editor-canvas relative rounded-md border border-dashed border-slate-300 bg-white"
              style={{ width: ROOM_WIDTH, height: ROOM_HEIGHT }}
              onDragOver={(event) => event.preventDefault()}
              onDrop={(event) => {
                if (!activeRoom) return
                const instanceId = event.dataTransfer.getData("text/plain")
                const rect = event.currentTarget.getBoundingClientRect()
                const x = Math.max(0, Math.min(ROOM_WIDTH - 32, event.clientX - rect.left - 16))
                const y = Math.max(0, Math.min(ROOM_HEIGHT - 32, event.clientY - rect.top - 16))
                setProject(moveRoomInstance(project, { roomId: activeRoom.id, instanceId, x, y }))
              }}
            >
              {activeRoom?.instances.map((instance) => {
                const objectEntry = project.objects.find((entry) => entry.id === instance.objectId)
                return (
                  <div
                    key={instance.id}
                    className="mvp1-editor-instance absolute flex h-8 w-8 cursor-move items-center justify-center rounded bg-blue-500 text-[10px] text-white"
                    style={{ left: instance.x, top: instance.y }}
                    draggable
                    onDragStart={(event) => event.dataTransfer.setData("text/plain", instance.id)}
                    title={objectEntry ? `${objectEntry.name} (${Math.round(instance.x)}, ${Math.round(instance.y)})` : "Instance"}
                  >
                    {objectEntry?.name.slice(0, 2).toUpperCase() ?? "??"}
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>

        <Card className="mvp1-editor-panel">
          <CardHeader>
            <CardTitle>Inspector</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="mvp1-editor-row flex gap-2">
              <Button onClick={handleSave} variant="secondary">
                Save local
              </Button>
              <Button onClick={handleLoad} variant="outline">
                Load local
              </Button>
            </div>
            <p className="text-xs text-slate-600">Save status: {formatStatus(saveStatus)}</p>

            {selectedObject ? (
              <div className="mvp1-editor-inspector-grid grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <Label title="Posició horitzontal dins la room">x</Label>
                  <Input
                    type="number"
                    value={selectedObject.x}
                    onChange={(event: ChangeEvent<HTMLInputElement>) =>
                      updateSelectedObjectProperty("x", Number(event.target.value))
                    }
                  />
                </div>
                <div className="space-y-1">
                  <Label title="Posició vertical dins la room">y</Label>
                  <Input
                    type="number"
                    value={selectedObject.y}
                    onChange={(event: ChangeEvent<HTMLInputElement>) =>
                      updateSelectedObjectProperty("y", Number(event.target.value))
                    }
                  />
                </div>
                <div className="space-y-1">
                  <Label title="Velocitat base per tick de simulació">speed</Label>
                  <Input
                    type="number"
                    value={selectedObject.speed}
                    onChange={(event: ChangeEvent<HTMLInputElement>) =>
                      updateSelectedObjectProperty("speed", Number(event.target.value))
                    }
                  />
                </div>
                <div className="space-y-1">
                  <Label title="Direcció en graus (0 = dreta, 90 = avall)">direction</Label>
                  <Input
                    type="number"
                    value={selectedObject.direction}
                    onChange={(event: ChangeEvent<HTMLInputElement>) =>
                      updateSelectedObjectProperty("direction", Number(event.target.value))
                    }
                  />
                </div>
              </div>
            ) : (
              <p className="text-sm text-slate-500">Selecciona un objecte per editar-ne les propietats.</p>
            )}
          </CardContent>
        </Card>
      </div>
    </main>
  )
}
