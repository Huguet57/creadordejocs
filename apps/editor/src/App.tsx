import { useEffect, useMemo, useState, type ChangeEvent, type KeyboardEvent as ReactKeyboardEvent } from "react"
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
  loadSnapshotProject,
  loadSnapshotsFromLocalStorage,
  saveCheckpointSnapshot,
  saveProjectLocally,
  type LocalSnapshot,
  type SaveStatus
} from "./features/project-storage.js"

const ROOM_WIDTH = 560
const ROOM_HEIGHT = 320
const AUTOSAVE_MS = 4000

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
  return "Saved"
}

function buildInitialEditorState(): { project: ProjectV1; roomId: string } {
  const loadedProject = loadProjectFromLocalStorage()
  if (loadedProject) {
    return ensureProjectHasRoom(loadedProject)
  }

  const initial = incrementMetric(createEmptyProjectV1("Primer joc autònom"), "appStart")
  return ensureProjectHasRoom(initial)
}

export function App() {
  const initialState = buildInitialEditorState()
  const [project, setProject] = useState<ProjectV1>(initialState.project)
  const [activeRoomId, setActiveRoomId] = useState<string>(initialState.roomId)
  const [activeObjectId, setActiveObjectId] = useState<string | null>(null)
  const [spriteName, setSpriteName] = useState("Sprite nou")
  const [soundName, setSoundName] = useState("So nou")
  const [objectName, setObjectName] = useState("Objecte nou")
  const [roomName, setRoomName] = useState("Sala nova")
  const [isRunning, setIsRunning] = useState(false)
  const [runSnapshot, setRunSnapshot] = useState<ProjectV1 | null>(null)
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("saved")
  const [isDirty, setIsDirty] = useState(false)
  const [past, setPast] = useState<ProjectV1[]>([])
  const [future, setFuture] = useState<ProjectV1[]>([])
  const [snapshots, setSnapshots] = useState<LocalSnapshot[]>(() => loadSnapshotsFromLocalStorage())

  const activeRoom = useMemo(
    () => project.rooms.find((room) => room.id === activeRoomId) ?? project.rooms[0] ?? null,
    [project.rooms, activeRoomId]
  )

  const selectedObject = useMemo(
    () => project.objects.find((entry) => entry.id === activeObjectId) ?? null,
    [project.objects, activeObjectId]
  )

  const pushProjectChange = (next: ProjectV1): void => {
    setPast((previous) => [...previous.slice(-39), project])
    setFuture([])
    setProject(next)
    setIsDirty(true)
  }

  const applyCheckpoint = (label: string, producer: (value: ProjectV1) => ProjectV1): void => {
    const next = producer(project)
    pushProjectChange(next)
    setSnapshots(saveCheckpointSnapshot(next, label))
  }

  const persistProject = (source: ProjectV1): void => {
    try {
      setSaveStatus("saving")
      saveProjectLocally(source)
      setSaveStatus("saved")
      setIsDirty(false)
    } catch {
      setSaveStatus("error")
    }
  }

  useEffect(() => {
    if (!isDirty) {
      return
    }

    const timeout = window.setTimeout(() => {
      persistProject(project)
    }, AUTOSAVE_MS)

    return () => window.clearTimeout(timeout)
  }, [isDirty, project])

  useEffect(() => {
    const onBeforeUnload = (): void => {
      if (isDirty) {
        saveProjectLocally(project)
      }
    }
    window.addEventListener("beforeunload", onBeforeUnload)
    return () => window.removeEventListener("beforeunload", onBeforeUnload)
  }, [isDirty, project])

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
              const objectEntry = previous.objects.find((entry) => entry.id === instance.objectId)
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

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent): void => {
      const metaOrCtrl = event.metaKey || event.ctrlKey
      if (!metaOrCtrl) {
        return
      }

      if (event.key.toLowerCase() === "z" && !event.shiftKey) {
        event.preventDefault()
        handleUndo()
      } else if (event.key.toLowerCase() === "y" || (event.key.toLowerCase() === "z" && event.shiftKey)) {
        event.preventDefault()
        handleRedo()
      }
    }

    window.addEventListener("keydown", onKeyDown)
    return () => window.removeEventListener("keydown", onKeyDown)
  }, [past, future, project])

  const handleUndo = (): void => {
    const previous = past[past.length - 1]
    if (!previous) return
    setFuture((value) => [project, ...value].slice(0, 40))
    setPast((value) => value.slice(0, -1))
    setProject(previous)
    setIsRunning(false)
    setRunSnapshot(null)
    setIsDirty(true)
  }

  const handleRedo = (): void => {
    const [next, ...rest] = future
    if (!next) return
    setPast((value) => [...value.slice(-39), project])
    setFuture(rest)
    setProject(next)
    setIsDirty(true)
  }

  const handleSave = (): void => {
    persistProject(project)
    setSnapshots(saveCheckpointSnapshot(project, "Manual save"))
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
      setPast((value) => [...value.slice(-39), project])
      setFuture([])
      setProject(normalized)
      setActiveRoomId(roomId)
      setIsRunning(false)
      setRunSnapshot(null)
      setIsDirty(false)
      setSaveStatus("saved")
    } catch {
      setSaveStatus("error")
    }
  }

  const addSprite = (): void => {
    if (!spriteName.trim()) return
    applyCheckpoint(`Create sprite: ${spriteName.trim()}`, (value) => quickCreateSprite(value, spriteName.trim()).project)
    setSpriteName("Sprite nou")
  }

  const addSound = (): void => {
    if (!soundName.trim()) return
    applyCheckpoint(`Create sound: ${soundName.trim()}`, (value) => quickCreateSound(value, soundName.trim()).project)
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
    pushProjectChange(result.project)
    setSnapshots(saveCheckpointSnapshot(result.project, `Create object: ${objectName.trim()}`))
    setActiveObjectId(result.objectId)
    setObjectName("Objecte nou")
  }

  const addRoom = (): void => {
    if (!roomName.trim()) return
    const result = createRoom(project, roomName.trim())
    pushProjectChange(result.project)
    setSnapshots(saveCheckpointSnapshot(result.project, `Create room: ${roomName.trim()}`))
    setActiveRoomId(result.roomId)
    setRoomName("Sala nova")
  }

  const addInstanceToActiveRoom = (): void => {
    if (!activeRoom || !selectedObject) return
    applyCheckpoint("Add instance", (value) =>
      addRoomInstance(value, {
        roomId: activeRoom.id,
        objectId: selectedObject.id,
        x: 80,
        y: 80
      }).project
    )
  }

  const updateSelectedObjectProperty = (key: "x" | "y" | "speed" | "direction", value: number): void => {
    if (!selectedObject) return
    const normalized = Number.isFinite(value) ? value : 0
    const nextObject = { ...selectedObject, [key]: normalized }
    const next = updateObjectProperties(project, {
      objectId: selectedObject.id,
      x: nextObject.x,
      y: nextObject.y,
      speed: nextObject.speed,
      direction: nextObject.direction
    })
    pushProjectChange(next)
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

  const handleDeleteSelectedObject = (): void => {
    if (!selectedObject) return
    const confirmed = window.confirm(`Vols eliminar l'objecte "${selectedObject.name}"?`)
    if (!confirmed) return

    applyCheckpoint(`Delete object: ${selectedObject.name}`, (value) => ({
      ...value,
      objects: value.objects.filter((entry) => entry.id !== selectedObject.id),
      rooms: value.rooms.map((room) => ({
        ...room,
        instances: room.instances.filter((instance) => instance.objectId !== selectedObject.id)
      }))
    }))
    setActiveObjectId(null)
  }

  const restoreSnapshot = (snapshotId: string): void => {
    const restored = loadSnapshotProject(snapshotId)
    if (!restored) {
      setSaveStatus("error")
      return
    }
    const normalized = ensureProjectHasRoom(restored)
    setPast((value) => [...value.slice(-39), project])
    setFuture([])
    setProject(normalized.project)
    setActiveRoomId(normalized.roomId)
    setActiveObjectId(null)
    setIsRunning(false)
    setRunSnapshot(null)
    setIsDirty(true)
  }

  const handleInputShortcutBlock = (event: ReactKeyboardEvent<HTMLInputElement>): void => {
    if ((event.ctrlKey || event.metaKey) && (event.key.toLowerCase() === "z" || event.key.toLowerCase() === "y")) {
      event.preventDefault()
    }
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
                  data-testid="sprite-name-input"
                  value={spriteName}
                  onKeyDown={handleInputShortcutBlock}
                  onChange={(event: ChangeEvent<HTMLInputElement>) => setSpriteName(event.target.value)}
                />
                <Button data-testid="add-sprite-button" onClick={addSprite} variant="secondary">
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
                  onKeyDown={handleInputShortcutBlock}
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
                  data-testid="object-name-input"
                  value={objectName}
                  onKeyDown={handleInputShortcutBlock}
                  onChange={(event: ChangeEvent<HTMLInputElement>) => setObjectName(event.target.value)}
                />
                <Button data-testid="add-object-button" onClick={addObject}>
                  + Objecte
                </Button>
              </div>
            </section>

            <section className="mvp1-editor-section space-y-2">
              <Label htmlFor="room-name">Sala ràpida</Label>
              <div className="mvp1-editor-row flex gap-2">
                <Input
                  id="room-name"
                  value={roomName}
                  onKeyDown={handleInputShortcutBlock}
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
              <Button data-testid="run-button" onClick={handleRun}>
                Run
              </Button>
              <Button data-testid="reset-button" onClick={handleReset} variant="secondary">
                Reset
              </Button>
              <Button data-testid="undo-button" onClick={handleUndo} variant="outline" disabled={past.length === 0}>
                Undo
              </Button>
              <Button data-testid="redo-button" onClick={handleRedo} variant="outline" disabled={future.length === 0}>
                Redo
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
                applyCheckpoint("Move instance", (value) =>
                  moveRoomInstance(value, { roomId: activeRoom.id, instanceId, x, y })
                )
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
              <Button data-testid="save-local-button" onClick={handleSave} variant="secondary">
                Save local
              </Button>
              <Button data-testid="load-local-button" onClick={handleLoad} variant="outline">
                Load local
              </Button>
            </div>
            <p data-testid="save-status" className="text-xs text-slate-600">
              Save status: {formatStatus(saveStatus)}
            </p>

            {selectedObject ? (
              <>
                <div className="mvp1-editor-inspector-grid grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <Label title="Posició horitzontal dins la room">x</Label>
                    <Input
                      data-testid="inspector-x-input"
                      type="number"
                      value={selectedObject.x}
                      onKeyDown={handleInputShortcutBlock}
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
                      onKeyDown={handleInputShortcutBlock}
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
                      onKeyDown={handleInputShortcutBlock}
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
                      onKeyDown={handleInputShortcutBlock}
                      onChange={(event: ChangeEvent<HTMLInputElement>) =>
                        updateSelectedObjectProperty("direction", Number(event.target.value))
                      }
                    />
                  </div>
                </div>
                <Button data-testid="delete-object-button" onClick={handleDeleteSelectedObject} variant="outline">
                  Delete selected object
                </Button>
              </>
            ) : (
              <p className="text-sm text-slate-500">Selecciona un objecte per editar-ne les propietats.</p>
            )}

            <div className="mvp1-editor-snapshot-panel rounded-md border border-slate-200 p-2">
              <p className="text-xs font-semibold text-slate-600">Snapshots locals</p>
              <ul className="mt-2 space-y-1">
                {snapshots.length === 0 && <li className="text-xs text-slate-500">No hi ha snapshots encara.</li>}
                {snapshots.map((entry) => (
                  <li key={entry.id} className="mvp1-editor-snapshot-row flex items-center justify-between gap-2 text-xs">
                    <span className="truncate">{entry.label}</span>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="h-7 px-2"
                      onClick={() => restoreSnapshot(entry.id)}
                    >
                      Restore
                    </Button>
                  </li>
                ))}
              </ul>
            </div>
          </CardContent>
        </Card>
      </div>
    </main>
  )
}
