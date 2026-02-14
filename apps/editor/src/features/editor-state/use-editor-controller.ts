import { useEffect, useMemo, useRef, useState } from "react"
import {
  addObjectEvent,
  addObjectEventAction as addObjectEventActionModel,
  addGlobalVariable as addGlobalVariableModel,
  addObjectVariable as addObjectVariableModel,
  addRoomInstance,
  createEmptyProjectV1,
  createRoom,
  incrementMetric,
  moveObjectEventAction as moveObjectEventActionModel,
  moveRoomInstance,
  removeRoomInstance,
  quickCreateObject,
  quickCreateSound,
  quickCreateSprite,
  removeObjectEvent,
  removeObjectEventAction as removeObjectEventActionModel,
  removeGlobalVariable as removeGlobalVariableModel,
  removeObjectVariable as removeObjectVariableModel,
  setTimeToFirstPlayableFunMs,
  updateObjectEventAction as updateObjectEventActionModel,
  updateObjectEventConfig as updateObjectEventConfigModel,
  updateGlobalVariable as updateGlobalVariableModel,
  updateObjectVariable as updateObjectVariableModel,
  updateObjectProperties,
  updateSoundAssetSource,
  updateSpriteAssetSource,
  type ObjectActionDraft,
  type VariableType,
  type VariableValue,
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
import { createTemplateProject, type GameTemplateId } from "./game-templates.js"
import { createInitialRuntimeState, runRuntimeTick, type RuntimeState } from "./runtime.js"
import type { EditorSection, ObjectEventKey, ObjectEventType } from "./types.js"
import { resolveAssetSource } from "../assets/asset-source-resolver.js"

const AUTOSAVE_MS = 4000

export function getRuntimeKeyFromKeyboardEvent(event: Pick<KeyboardEvent, "code" | "key">): string {
  return event.code
}

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

export function resolveResetState(
  currentProject: ProjectV1,
  runSnapshot: ProjectV1 | null
): { project: ProjectV1; runSnapshot: null } {
  return {
    project: runSnapshot ?? currentProject,
    runSnapshot: null
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
  const [runtimeState, setRuntimeState] = useState<RuntimeState>(() => createInitialRuntimeState(initial.project))
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("saved")
  const [isDirty, setIsDirty] = useState(false)
  const [past, setPast] = useState<ProjectV1[]>([])
  const [future, setFuture] = useState<ProjectV1[]>([])
  const [snapshots, setSnapshots] = useState<LocalSnapshot[]>(() => loadSnapshotsFromLocalStorage())
  const [startedAtMs] = useState<number>(() => Date.now())
  const pressedKeysRef = useRef<Set<string>>(new Set())
  const runtimeRef = useRef<RuntimeState>(createInitialRuntimeState(initial.project))

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
      pressedKeysRef.current.add(getRuntimeKeyFromKeyboardEvent(event))
    }
    const onKeyUp = (event: KeyboardEvent): void => {
      pressedKeysRef.current.delete(getRuntimeKeyFromKeyboardEvent(event))
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

  useEffect(() => {
    if (!runtimeState.playedSoundIds.length) {
      return
    }

    let cancelled = false
    const playedSet = new Set(runtimeState.playedSoundIds)

    const playTriggeredSounds = async () => {
      for (const soundId of playedSet) {
        const soundEntry = project.resources.sounds.find((entry) => entry.id === soundId)
        if (!soundEntry?.assetSource) {
          continue
        }
        const resolvedSource = await resolveAssetSource(soundEntry.assetSource)
        if (cancelled || !resolvedSource) {
          continue
        }
        const audio = new Audio(resolvedSource)
        void audio.play().catch(() => {
          // Ignore autoplay restrictions and failed decodes in MVP mode.
        })
      }
    }

    void playTriggeredSounds()

    return () => {
      cancelled = true
    }
  }, [project.resources.sounds, runtimeState.playedSoundIds])

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
    addGlobalVariable(name: string, type: VariableType, initialValue: VariableValue) {
      const result = addGlobalVariableModel(project, { name, type, initialValue })
      if (!result.variableId) {
        return
      }
      pushProjectChange(result.project, `Create global variable: ${name.trim()}`)
    },
    updateGlobalVariable(variableId: string, name: string, initialValue: VariableValue) {
      pushProjectChange(updateGlobalVariableModel(project, { variableId, name, initialValue }), "Update global variable")
    },
    removeGlobalVariable(variableId: string) {
      pushProjectChange(removeGlobalVariableModel(project, { variableId }), "Remove global variable")
    },
    addObjectVariable(objectId: string, name: string, type: VariableType, initialValue: VariableValue) {
      const result = addObjectVariableModel(project, { objectId, name, type, initialValue })
      if (!result.variableId) {
        return
      }
      pushProjectChange(result.project, `Create object variable: ${name.trim()}`)
    },
    updateObjectVariable(objectId: string, variableId: string, name: string, initialValue: VariableValue) {
      pushProjectChange(
        updateObjectVariableModel(project, { objectId, variableId, name, initialValue }),
        "Update object variable"
      )
    },
    removeObjectVariable(objectId: string, variableId: string) {
      pushProjectChange(removeObjectVariableModel(project, { objectId, variableId }), "Remove object variable")
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
    addInstanceToActiveRoom(objectId?: string) {
      if (!activeRoom) return
      const targetObjectId = objectId ?? selectedObject?.id
      if (!targetObjectId) return
      const next = addRoomInstance(project, {
        roomId: activeRoom.id,
        objectId: targetObjectId,
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
    removeInstance(instanceId: string) {
      if (!activeRoom) return
      pushProjectChange(
        removeRoomInstance(project, { roomId: activeRoom.id, instanceId }),
        "Remove instance"
      )
    },
    run() {
      if (isRunning) return
      const withTimeMetric = setTimeToFirstPlayableFunMs(project, Date.now() - startedAtMs)
      setProject(withTimeMetric)
      setRunSnapshot(withTimeMetric)
      const initialRuntime = createInitialRuntimeState(withTimeMetric)
      runtimeRef.current = initialRuntime
      setRuntimeState(initialRuntime)
      setIsRunning(true)
      setActiveSection("run")
    },
    reset() {
      const nextResetState = resolveResetState(project, runSnapshot)
      setProject(nextResetState.project)
      setIsRunning(false)
      setRunSnapshot(nextResetState.runSnapshot)
      const resetRuntime = createInitialRuntimeState(nextResetState.project)
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
    loadTemplate(templateId: GameTemplateId) {
      const result = createTemplateProject(templateId)
      setPast((value) => [...value.slice(-39), project])
      setFuture([])
      setProject(incrementMetric(result.project, "tutorialCompletion"))
      setActiveRoomId(result.roomId)
      setActiveObjectId(result.focusObjectId)
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
