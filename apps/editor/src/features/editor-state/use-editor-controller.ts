import { useEffect, useMemo, useRef, useState } from "react"
import {
  addObjectEvent,
  addObjectEventAction as addObjectEventActionModel,
  addRoomInstance,
  createEmptyProjectV1,
  createRoom,
  incrementMetric,
  moveObjectEventAction as moveObjectEventActionModel,
  moveRoomInstance,
  quickCreateObject,
  quickCreateSound,
  quickCreateSprite,
  removeObjectEvent,
  removeObjectEventAction as removeObjectEventActionModel,
  setTimeToFirstPlayableFunMs,
  updateObjectEventAction as updateObjectEventActionModel,
  updateObjectEventConfig as updateObjectEventConfigModel,
  updateObjectProperties,
  updateSoundAssetSource,
  updateSpriteAssetSource,
  type ObjectActionDraft,
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
import { createDodgeTemplateProject } from "./dodge-template.js"
import { createInitialRuntimeState, runRuntimeTick, type RuntimeState } from "./runtime.js"
import type { EditorSection, ObjectEventKey, ObjectEventType } from "./types.js"

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

export function useEditorController() {
  const initial = createInitialEditorState()
  const [project, setProject] = useState<ProjectV1>(initial.project)
  const [activeSection, setActiveSection] = useState<EditorSection>("objects")
  const [activeRoomId, setActiveRoomId] = useState<string>(initial.roomId)
  const [activeObjectId, setActiveObjectId] = useState<string | null>(null)
  const [isRunning, setIsRunning] = useState(false)
  const [runSnapshot, setRunSnapshot] = useState<ProjectV1 | null>(null)
  const [runtimeState, setRuntimeState] = useState<RuntimeState>(createInitialRuntimeState())
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("saved")
  const [isDirty, setIsDirty] = useState(false)
  const [past, setPast] = useState<ProjectV1[]>([])
  const [future, setFuture] = useState<ProjectV1[]>([])
  const [snapshots, setSnapshots] = useState<LocalSnapshot[]>(() => loadSnapshotsFromLocalStorage())
  const [startedAtMs] = useState<number>(() => Date.now())
  const pressedKeysRef = useRef<Set<string>>(new Set())
  const runtimeRef = useRef<RuntimeState>(createInitialRuntimeState())

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
      setProject((previous) => {
        const result = runRuntimeTick(previous, activeRoom.id, pressedKeysRef.current, runtimeRef.current)
        runtimeRef.current = result.runtime
        setRuntimeState(result.runtime)
        return result.project
      })
    }, 80)
    return () => window.clearInterval(interval)
  }, [activeRoom, isRunning])

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent): void => {
      pressedKeysRef.current.add(event.key)
    }
    const onKeyUp = (event: KeyboardEvent): void => {
      pressedKeysRef.current.delete(event.key)
    }
    window.addEventListener("keydown", onKeyDown)
    window.addEventListener("keyup", onKeyUp)
    return () => {
      window.removeEventListener("keydown", onKeyDown)
      window.removeEventListener("keyup", onKeyUp)
    }
  }, [])

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
    runtimeState,
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
    addObjectEvent(type: ObjectEventType, key: ObjectEventKey | null = null, targetObjectId: string | null = null) {
      if (!selectedObject) return
      pushProjectChange(
        addObjectEvent(project, { objectId: selectedObject.id, type, key, targetObjectId }),
        `Add ${type} event`
      )
    },
    updateObjectEventConfig(eventId: string, key: ObjectEventKey | null, targetObjectId: string | null) {
      if (!selectedObject) return
      pushProjectChange(
        updateObjectEventConfigModel(project, {
          objectId: selectedObject.id,
          eventId,
          key,
          targetObjectId
        })
      )
    },
    removeObjectEvent(eventId: string) {
      if (!selectedObject) return
      pushProjectChange(
        removeObjectEvent(project, { objectId: selectedObject.id, eventId }),
        `Remove object event`
      )
    },
    addObjectEventAction(eventId: string, action: ObjectActionDraft) {
      if (!selectedObject) return
      pushProjectChange(
        addObjectEventActionModel(project, { objectId: selectedObject.id, eventId, action }),
        "Add event action"
      )
    },
    updateObjectEventAction(eventId: string, actionId: string, action: ObjectActionDraft) {
      if (!selectedObject) return
      pushProjectChange(
        updateObjectEventActionModel(project, { objectId: selectedObject.id, eventId, actionId, action }),
        "Update event action"
      )
    },
    removeObjectEventAction(eventId: string, actionId: string) {
      if (!selectedObject) return
      pushProjectChange(
        removeObjectEventActionModel(project, { objectId: selectedObject.id, eventId, actionId }),
        "Remove event action"
      )
    },
    moveObjectEventAction(eventId: string, actionId: string, direction: "up" | "down") {
      if (!selectedObject) return
      pushProjectChange(
        moveObjectEventActionModel(project, { objectId: selectedObject.id, eventId, actionId, direction }),
        "Reorder event action"
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
      const withTimeMetric = setTimeToFirstPlayableFunMs(project, Date.now() - startedAtMs)
      setProject(withTimeMetric)
      setRunSnapshot(withTimeMetric)
      const initialRuntime = createInitialRuntimeState()
      runtimeRef.current = initialRuntime
      setRuntimeState(initialRuntime)
      setIsRunning(true)
      setActiveSection("run")
    },
    reset() {
      if (runSnapshot) {
        setProject(runSnapshot)
      }
      setIsRunning(false)
      const resetRuntime = createInitialRuntimeState()
      runtimeRef.current = resetRuntime
      setRuntimeState(resetRuntime)
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
    loadDodgeTemplate() {
      const result = createDodgeTemplateProject()
      setPast((value) => [...value.slice(-39), project])
      setFuture([])
      setProject(incrementMetric(result.project, "tutorialCompletion"))
      setActiveRoomId(result.roomId)
      setActiveObjectId(result.playerObjectId)
      setActiveSection("objects")
      setIsRunning(false)
      setRunSnapshot(null)
      setIsDirty(true)
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
