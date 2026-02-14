import { useEffect, useMemo, useState } from "react"
import {
  addObjectEvent,
  addRoomInstance,
  appendObjectEventAction,
  createEmptyProjectV1,
  createRoom,
  incrementMetric,
  moveRoomInstance,
  quickCreateObject,
  quickCreateSound,
  quickCreateSprite,
  removeObjectEvent,
  updateObjectProperties,
  updateSoundAssetSource,
  updateSpriteAssetSource,
  type ProjectV1
} from "@creadordejocs/project-format"
import {
  loadProjectFromLocalStorage,
  loadSnapshotProject,
  loadSnapshotsFromLocalStorage,
  saveCheckpointSnapshot,
  saveProjectLocally,
  type LocalSnapshot,
  type SaveStatus
} from "../project-storage.js"
import { selectActiveRoom, selectObject } from "./selectors.js"
import type { EditorSection, ObjectEventType } from "./types.js"

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

function createInitialEditorState(): { project: ProjectV1; roomId: string } {
  const loaded = loadProjectFromLocalStorage()
  if (loaded) {
    return ensureProjectHasRoom(loaded)
  }

  return ensureProjectHasRoom(incrementMetric(createEmptyProjectV1("Primer joc autònom"), "appStart"))
}

function runPreviewTick(project: ProjectV1, roomId: string): ProjectV1 {
  return {
    ...project,
    rooms: project.rooms.map((room) => {
      if (room.id !== roomId) {
        return room
      }

      return {
        ...room,
        instances: room.instances.map((instance) => {
          const objectEntry = project.objects.find((entry) => entry.id === instance.objectId)
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
  }
}

export function useEditorController() {
  const initial = createInitialEditorState()
  const [project, setProject] = useState<ProjectV1>(initial.project)
  const [activeSection, setActiveSection] = useState<EditorSection>("objects")
  const [activeRoomId, setActiveRoomId] = useState<string>(initial.roomId)
  const [activeObjectId, setActiveObjectId] = useState<string | null>(null)
  const [isRunning, setIsRunning] = useState(false)
  const [runSnapshot, setRunSnapshot] = useState<ProjectV1 | null>(null)
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("saved")
  const [isDirty, setIsDirty] = useState(false)
  const [past, setPast] = useState<ProjectV1[]>([])
  const [future, setFuture] = useState<ProjectV1[]>([])
  const [snapshots, setSnapshots] = useState<LocalSnapshot[]>(() => loadSnapshotsFromLocalStorage())

  const activeRoom = useMemo(() => selectActiveRoom(project, activeRoomId), [project, activeRoomId])
  const selectedObject = useMemo(() => selectObject(project, activeObjectId), [project, activeObjectId])

  const pushProjectChange = (next: ProjectV1, checkpointLabel?: string): void => {
    setPast((previous) => [...previous.slice(-39), project])
    setFuture([])
    setProject(next)
    setIsDirty(true)
    if (checkpointLabel) {
      setSnapshots(saveCheckpointSnapshot(next, checkpointLabel))
    }
  }

  const persistProject = (source: ProjectV1, withSnapshotLabel?: string): void => {
    try {
      setSaveStatus("saving")
      saveProjectLocally(source)
      setSaveStatus("saved")
      setIsDirty(false)
      if (withSnapshotLabel) {
        setSnapshots(saveCheckpointSnapshot(source, withSnapshotLabel))
      }
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
      setProject((previous) => runPreviewTick(previous, activeRoom.id))
    }, 80)
    return () => window.clearInterval(interval)
  }, [activeRoom, isRunning])

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent): void => {
      if (!(event.metaKey || event.ctrlKey)) {
        return
      }
      if (event.key.toLowerCase() === "z" && !event.shiftKey) {
        event.preventDefault()
        undo()
      } else if (event.key.toLowerCase() === "y" || (event.key.toLowerCase() === "z" && event.shiftKey)) {
        event.preventDefault()
        redo()
      }
    }
    window.addEventListener("keydown", onKeyDown)
    return () => window.removeEventListener("keydown", onKeyDown)
  }, [past, future, project])

  const undo = (): void => {
    const previous = past[past.length - 1]
    if (!previous) return
    setFuture((value) => [project, ...value].slice(0, 40))
    setPast((value) => value.slice(0, -1))
    setProject(previous)
    setIsRunning(false)
    setRunSnapshot(null)
    setIsDirty(true)
  }

  const redo = (): void => {
    const [next, ...rest] = future
    if (!next) return
    setPast((value) => [...value.slice(-39), project])
    setFuture(rest)
    setProject(next)
    setIsDirty(true)
  }

  return {
    project,
    activeSection,
    setActiveSection,
    activeRoomId,
    setActiveRoomId,
    activeObjectId,
    setActiveObjectId,
    activeRoom,
    selectedObject,
    isRunning,
    snapshots,
    saveStatus,
    undoAvailable: past.length > 0,
    redoAvailable: future.length > 0,
    addSprite(name: string) {
      if (!name.trim()) return
      const next = quickCreateSprite(project, name.trim()).project
      pushProjectChange(next, `Create sprite: ${name.trim()}`)
    },
    addSound(name: string) {
      if (!name.trim()) return
      const next = quickCreateSound(project, name.trim()).project
      pushProjectChange(next, `Create sound: ${name.trim()}`)
    },
    addObject(name: string) {
      if (!name.trim()) return
      const spriteId = project.resources.sprites[0]?.id ?? null
      const result = quickCreateObject(project, {
        name: name.trim(),
        spriteId,
        x: 64,
        y: 64,
        speed: 1,
        direction: 0
      })
      pushProjectChange(result.project, `Create object: ${name.trim()}`)
      setActiveObjectId(result.objectId)
    },
    addRoom(name: string) {
      if (!name.trim()) return
      const result = createRoom(project, name.trim())
      pushProjectChange(result.project, `Create room: ${name.trim()}`)
      setActiveRoomId(result.roomId)
    },
    updateSpriteSource(spriteId: string, source: string) {
      pushProjectChange(updateSpriteAssetSource(project, spriteId, source))
    },
    updateSoundSource(soundId: string, source: string) {
      pushProjectChange(updateSoundAssetSource(project, soundId, source))
    },
    addObjectEvent(type: ObjectEventType) {
      if (!selectedObject) return
      pushProjectChange(addObjectEvent(project, { objectId: selectedObject.id, type }), `Add ${type} event`)
    },
    removeObjectEvent(eventId: string) {
      if (!selectedObject) return
      pushProjectChange(
        removeObjectEvent(project, { objectId: selectedObject.id, eventId }),
        `Remove object event`
      )
    },
    addObjectEventAction(eventId: string, actionText: string) {
      if (!selectedObject) return
      pushProjectChange(
        appendObjectEventAction(project, { objectId: selectedObject.id, eventId, actionText }),
        "Add event action"
      )
    },
    updateSelectedObjectProperty(key: "x" | "y" | "speed" | "direction", value: number) {
      if (!selectedObject) return
      const numeric = Number.isFinite(value) ? value : 0
      const nextObject = { ...selectedObject, [key]: numeric }
      pushProjectChange(
        updateObjectProperties(project, {
          objectId: selectedObject.id,
          x: nextObject.x,
          y: nextObject.y,
          speed: nextObject.speed,
          direction: nextObject.direction
        })
      )
    },
    addInstanceToActiveRoom() {
      if (!activeRoom || !selectedObject) return
      const next = addRoomInstance(project, {
        roomId: activeRoom.id,
        objectId: selectedObject.id,
        x: 80,
        y: 80
      }).project
      pushProjectChange(next, "Add instance")
    },
    moveInstance(instanceId: string, x: number, y: number) {
      if (!activeRoom) return
      pushProjectChange(
        moveRoomInstance(project, { roomId: activeRoom.id, instanceId, x, y }),
        "Move instance"
      )
    },
    run() {
      if (isRunning) return
      setRunSnapshot(project)
      setIsRunning(true)
      setActiveSection("run")
    },
    reset() {
      if (runSnapshot) {
        setProject(runSnapshot)
      }
      setIsRunning(false)
    },
    deleteSelectedObject() {
      if (!selectedObject) return
      const confirmed = window.confirm(`Vols eliminar l'objecte "${selectedObject.name}"?`)
      if (!confirmed) return
      const next: ProjectV1 = {
        ...project,
        objects: project.objects.filter((entry) => entry.id !== selectedObject.id),
        rooms: project.rooms.map((room) => ({
          ...room,
          instances: room.instances.filter((instance) => instance.objectId !== selectedObject.id)
        }))
      }
      pushProjectChange(next, `Delete object: ${selectedObject.name}`)
      setActiveObjectId(null)
    },
    saveNow() {
      persistProject(project, "Manual save")
    },
    loadSavedProject() {
      try {
        setSaveStatus("saving")
        const loaded = loadProjectFromLocalStorage()
        if (!loaded) {
          setSaveStatus("error")
          return
        }
        const normalized = ensureProjectHasRoom(loaded)
        setPast((value) => [...value.slice(-39), project])
        setFuture([])
        setProject(normalized.project)
        setActiveRoomId(normalized.roomId)
        setIsRunning(false)
        setRunSnapshot(null)
        setIsDirty(false)
        setSaveStatus("saved")
      } catch {
        setSaveStatus("error")
      }
    },
    restoreSnapshot(snapshotId: string) {
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
    },
    undo,
    redo
  }
}

export type EditorController = ReturnType<typeof useEditorController>
