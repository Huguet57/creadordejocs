import { useEffect, useMemo, useRef, useState } from "react"
import {
  addObjectEvent,
  addObjectEventAction as addObjectEventActionModel,
  addObjectEventIfAction as addObjectEventIfActionModel,
  addObjectEventIfBlock as addObjectEventIfBlockModel,
  addGlobalVariable as addGlobalVariableModel,
  addObjectVariable as addObjectVariableModel,
  createSpriteFolder as createSpriteFolderModel,
  deleteSprite as deleteSpriteModel,
  deleteSpriteFolder as deleteSpriteFolderModel,
  addRoomInstance,
  createEmptyProjectV1,
  createRoom,
  incrementMetric,
  insertObjectEventItem as insertObjectEventItemModel,
  moveObjectEventItem as moveObjectEventItemModel,
  moveObjectEventAction as moveObjectEventActionModel,
  moveSpriteFolder as moveSpriteFolderModel,
  moveSpriteToFolder as moveSpriteToFolderModel,
  moveRoomInstance,
  renameSprite as renameSpriteModel,
  renameSpriteFolder as renameSpriteFolderModel,
  removeRoomInstance,
  quickCreateObject,
  quickCreateSound,
  quickCreateSpriteWithSize,
  removeObjectEvent,
  removeObjectEventAction as removeObjectEventActionModel,
  removeObjectEventIfAction as removeObjectEventIfActionModel,
  removeObjectEventIfBlock as removeObjectEventIfBlockModel,
  removeGlobalVariable as removeGlobalVariableModel,
  removeObjectVariable as removeObjectVariableModel,
  setTimeToFirstPlayableFunMs,
  updateObjectEventAction as updateObjectEventActionModel,
  updateObjectEventIfAction as updateObjectEventIfActionModel,
  updateObjectEventIfBlockCondition as updateObjectEventIfBlockConditionModel,
  updateObjectEventConfig as updateObjectEventConfigModel,
  updateGlobalVariable as updateGlobalVariableModel,
  updateObjectVariable as updateObjectVariableModel,
  updateObjectProperties,
  updateObjectSpriteId,
  updateSoundAssetSource,
  updateSpriteAssetSource,
  updateSpritePixelsRgba,
  type ObjectActionDraft,
  type ObjectEventItem,
  type IfCondition,
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
import { importProjectFromFile } from "../templates/import-project.js"
import { selectActiveRoom, selectObject } from "./selectors.js"
import { createTemplateProject, type GameTemplateId } from "./game-templates.js"
import {
  createInitialRuntimeState,
  runRuntimeTick,
  type RuntimeMouseButton,
  type RuntimeMouseInput,
  type RuntimeState
} from "./runtime.js"
import { intersectsInstances } from "./runtime-types.js"
import type { EditorSection, ObjectEventKey, ObjectEventType, ObjectKeyboardMode } from "./types.js"
import { resolveAssetSource } from "../assets/asset-source-resolver.js"

const AUTOSAVE_MS = 4000

function wouldOverlapSolidInRoom(
  project: ProjectV1,
  roomInstances: ProjectV1["rooms"][number]["instances"],
  objectId: string,
  x: number,
  y: number,
  excludeInstanceId?: string
): boolean {
  const candidateObject = project.objects.find((objectEntry) => objectEntry.id === objectId)
  const candidateIsSolid = candidateObject?.solid === true
  const candidateInstance: ProjectV1["rooms"][number]["instances"][number] = {
    id: "__candidate__",
    objectId,
    x,
    y
  }

  for (const otherInstance of roomInstances) {
    if (excludeInstanceId && otherInstance.id === excludeInstanceId) {
      continue
    }
    const otherObject = project.objects.find((objectEntry) => objectEntry.id === otherInstance.objectId)
    const otherIsSolid = otherObject?.solid === true
    if (!candidateIsSolid && !otherIsSolid) {
      continue
    }
    if (intersectsInstances(project, candidateInstance, otherInstance)) {
      return true
    }
  }
  return false
}

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

export function resolveInitialSection(project: ProjectV1): EditorSection {
  const hasContent = project.objects.length > 0 || project.resources.sprites.length > 0
  return hasContent ? "objects" : "templates"
}

function getNormalizedObjectSize(value: number | undefined): number {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return 32
  }
  return Math.max(1, Math.round(value))
}

export function isSpriteCompatibleWithObjectSize(
  objectWidth: number | undefined,
  objectHeight: number | undefined,
  spriteWidth: number,
  spriteHeight: number
): boolean {
  const normalizedObjectWidth = getNormalizedObjectSize(objectWidth)
  const normalizedObjectHeight = getNormalizedObjectSize(objectHeight)
  const normalizedSpriteWidth = getNormalizedObjectSize(spriteWidth)
  const normalizedSpriteHeight = getNormalizedObjectSize(spriteHeight)

  return normalizedObjectWidth * normalizedSpriteHeight === normalizedObjectHeight * normalizedSpriteWidth
}

export function resolveNextActiveSpriteIdAfterDelete(
  spriteIds: string[],
  activeSpriteId: string | null,
  deletedSpriteId: string
): string | null {
  const deletedIndex = spriteIds.indexOf(deletedSpriteId)
  if (deletedIndex < 0) {
    return activeSpriteId
  }
  if (activeSpriteId !== deletedSpriteId) {
    return activeSpriteId
  }
  const remainingIds = spriteIds.filter((spriteId) => spriteId !== deletedSpriteId)
  if (!remainingIds.length) {
    return null
  }
  const nextCandidate = spriteIds[deletedIndex + 1]
  if (nextCandidate && nextCandidate !== deletedSpriteId) {
    return nextCandidate
  }
  const previousCandidate = spriteIds[deletedIndex - 1]
  return previousCandidate ?? remainingIds[0] ?? null
}

export function countSpriteAssignments(project: ProjectV1, spriteId: string): number {
  return project.objects.reduce((count, objectEntry) => count + (objectEntry.spriteId === spriteId ? 1 : 0), 0)
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
  runSnapshot: ProjectV1 | null,
  currentRoomId: string
): { project: ProjectV1; runSnapshot: null; roomId: string } {
  const restoredProject = runSnapshot ?? currentProject
  const firstRoom = restoredProject.rooms[0]
  return {
    project: restoredProject,
    runSnapshot: null,
    roomId: firstRoom ? firstRoom.id : currentRoomId
  }
}

export function shouldResetWhenSwitchingSection(
  currentSection: EditorSection,
  nextSection: EditorSection,
  isRunning: boolean
): boolean {
  return isRunning && currentSection === "run" && nextSection !== "run"
}

export function useEditorController(initialSectionOverride?: EditorSection) {
  const initial = createInitialEditorState()
  const [project, setProject] = useState<ProjectV1>(initial.project)
  const [activeSection, setActiveSection] = useState<EditorSection>(
    () => initialSectionOverride ?? resolveInitialSection(initial.project)
  )
  const [activeRoomId, setActiveRoomId] = useState<string>(initial.roomId)
  const [activeObjectId, setActiveObjectId] = useState<string | null>(null)
  const [activeSpriteId, setActiveSpriteId] = useState<string | null>(null)
  const [isRunning, setIsRunning] = useState(false)
  const [runSnapshot, setRunSnapshot] = useState<ProjectV1 | null>(null)
  const [runtimeState, setRuntimeState] = useState<RuntimeState>(() => createInitialRuntimeState(initial.project))
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("saved")
  const [importStatus, setImportStatus] = useState<"idle" | "importing" | "imported" | "error">("idle")
  const [isDirty, setIsDirty] = useState(false)
  const [past, setPast] = useState<ProjectV1[]>([])
  const [future, setFuture] = useState<ProjectV1[]>([])
  const [snapshots, setSnapshots] = useState<LocalSnapshot[]>(() => loadSnapshotsFromLocalStorage())
  const [startedAtMs] = useState<number>(() => Date.now())
  const pressedKeysRef = useRef<Set<string>>(new Set())
  const justPressedKeysRef = useRef<Set<string>>(new Set())
  const runtimeMouseRef = useRef<RuntimeMouseInput>({
    x: 0,
    y: 0,
    moved: false,
    pressedButtons: new Set<RuntimeMouseButton>(),
    justPressedButtons: new Set<RuntimeMouseButton>()
  })
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
    const persistIfDirty = (): void => {
      if (isDirty) {
        saveProjectLocally(project)
      }
    }
    const onVisibilityChange = (): void => {
      if (document.visibilityState === "hidden") {
        persistIfDirty()
      }
    }
    window.addEventListener("pagehide", persistIfDirty)
    document.addEventListener("visibilitychange", onVisibilityChange)
    return () => {
      window.removeEventListener("pagehide", persistIfDirty)
      document.removeEventListener("visibilitychange", onVisibilityChange)
    }
  }, [isDirty, project])

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
        const snapshotRoom = runSnapshot.rooms.find((roomEntry) => roomEntry.id === activeRoom.id)
        if (snapshotRoom) {
          nextProject = {
            ...nextProject,
            rooms: nextProject.rooms.map((roomEntry) =>
              roomEntry.id === activeRoom.id
                ? {
                    ...roomEntry,
                    instances: snapshotRoom.instances.map((instanceEntry) => ({ ...instanceEntry }))
                  }
                : roomEntry
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

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent): void => {
      const runtimeKey = getRuntimeKeyFromKeyboardEvent(event)
      if (!pressedKeysRef.current.has(runtimeKey)) {
        justPressedKeysRef.current.add(runtimeKey)
      }
      pressedKeysRef.current.add(runtimeKey)
    }
    const onKeyUp = (event: KeyboardEvent): void => {
      const runtimeKey = getRuntimeKeyFromKeyboardEvent(event)
      pressedKeysRef.current.delete(runtimeKey)
    }
    window.addEventListener("keydown", onKeyDown)
    window.addEventListener("keyup", onKeyUp)
    return () => {
      window.removeEventListener("keydown", onKeyDown)
      window.removeEventListener("keyup", onKeyUp)
    }
  }, [])

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
    activeSpriteId,
    setActiveSpriteId,
    activeRoom,
    selectedObject,
    isRunning,
    snapshots,
    saveStatus,
    importStatus,
    runtimeState,
    undoAvailable: past.length > 0,
    redoAvailable: future.length > 0,
    addSprite(name: string, width = 32, height = 32, folderId: string | null = null) {
      if (!name.trim()) return null
      const result = quickCreateSpriteWithSize(project, name.trim(), width, height)
      const next = folderId ? moveSpriteToFolderModel(result.project, result.spriteId, folderId) : result.project
      pushProjectChange(next, `Create sprite: ${name.trim()}`)
      setActiveSpriteId(result.spriteId)
      return result.spriteId
    },
    createSpriteFolder(name: string, parentId: string | null = null) {
      const result = createSpriteFolderModel(project, name, parentId)
      if (!result.folderId) {
        return null
      }
      pushProjectChange(result.project, `Create sprite folder: ${name.trim()}`)
      return result.folderId
    },
    renameSpriteFolder(folderId: string, name: string) {
      const next = renameSpriteFolderModel(project, folderId, name)
      if (next === project) {
        return false
      }
      pushProjectChange(next, "Rename sprite folder")
      return true
    },
    deleteSpriteFolder(folderId: string) {
      const folderEntry = (project.resources.spriteFolders ?? []).find((entry) => entry.id === folderId)
      if (!folderEntry) {
        return false
      }
      const confirmed = window.confirm(`Vols eliminar la carpeta "${folderEntry.name}"?`)
      if (!confirmed) {
        return false
      }
      const next = deleteSpriteFolderModel(project, folderId)
      if (next === project) {
        return false
      }
      pushProjectChange(next, `Delete sprite folder: ${folderEntry.name}`)
      return true
    },
    renameSprite(spriteId: string, name: string) {
      const next = renameSpriteModel(project, spriteId, name)
      if (next === project) {
        return false
      }
      pushProjectChange(next, "Rename sprite")
      return true
    },
    moveSpriteToFolder(spriteId: string, folderId: string | null) {
      const next = moveSpriteToFolderModel(project, spriteId, folderId)
      if (next === project) {
        return false
      }
      pushProjectChange(next, "Move sprite")
      return true
    },
    moveSpriteFolder(folderId: string, newParentId: string | null) {
      const next = moveSpriteFolderModel(project, folderId, newParentId)
      if (next === project) {
        return false
      }
      pushProjectChange(next, "Move folder")
      return true
    },
    deleteSprite(spriteId: string) {
      const spriteEntry = project.resources.sprites.find((entry) => entry.id === spriteId)
      if (!spriteEntry) {
        return false
      }
      const assignmentCount = countSpriteAssignments(project, spriteId)
      const warningText =
        assignmentCount > 0
          ? ` Aquest sprite s'utilitza en ${assignmentCount} objecte(s) i es desassignarà automàticament.`
          : ""
      const confirmed = window.confirm(`Vols eliminar el sprite "${spriteEntry.name}"?${warningText}`)
      if (!confirmed) {
        return false
      }
      const spriteIds = project.resources.sprites.map((entry) => entry.id)
      const next = deleteSpriteModel(project, spriteId)
      pushProjectChange(next, `Delete sprite: ${spriteEntry.name}`)
      setActiveSpriteId(resolveNextActiveSpriteIdAfterDelete(spriteIds, activeSpriteId, spriteId))
      return true
    },
    createSpriteForSelectedObject(name: string) {
      if (!selectedObject || !name.trim()) {
        return null
      }
      const result = quickCreateSpriteWithSize(
        project,
        name.trim(),
        getNormalizedObjectSize(selectedObject.width),
        getNormalizedObjectSize(selectedObject.height)
      )
      const withAssignment = updateObjectSpriteId(result.project, selectedObject.id, result.spriteId)
      pushProjectChange(withAssignment, `Create sprite: ${name.trim()}`)
      setActiveSpriteId(result.spriteId)
      return result.spriteId
    },
    addSound(name: string) {
      if (!name.trim()) return
      const next = quickCreateSound(project, name.trim()).project
      pushProjectChange(next, `Create sound: ${name.trim()}`)
    },
    addObject(name: string) {
      const trimmedName = name.trim()
      if (!trimmedName) return
      const createdSprite = quickCreateSpriteWithSize(project, trimmedName, 32, 32)
      const result = quickCreateObject(createdSprite.project, {
        name: trimmedName,
        spriteId: createdSprite.spriteId,
        x: 64,
        y: 64,
        speed: 1,
        direction: 0
      })
      pushProjectChange(result.project, `Create object: ${trimmedName}`)
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
    updateSpritePixels(spriteId: string, pixelsRgba: string[]) {
      pushProjectChange(updateSpritePixelsRgba(project, spriteId, pixelsRgba))
    },
    assignSelectedObjectSprite(spriteId: string | null) {
      if (!selectedObject) return false
      if (spriteId === null) {
        pushProjectChange(updateObjectSpriteId(project, selectedObject.id, null))
        return true
      }
      const spriteEntry = project.resources.sprites.find((entry) => entry.id === spriteId)
      if (!spriteEntry) {
        return false
      }
      if (!isSpriteCompatibleWithObjectSize(selectedObject.width, selectedObject.height, spriteEntry.width, spriteEntry.height)) {
        return false
      }
      pushProjectChange(updateObjectSpriteId(project, selectedObject.id, spriteId))
      return true
    },
    openSpriteEditor(spriteId: string | null) {
      if (spriteId) {
        setActiveSpriteId(spriteId)
      }
      setActiveSection("sprites")
    },
    updateSoundSource(soundId: string, source: string) {
      pushProjectChange(updateSoundAssetSource(project, soundId, source))
    },
    addObjectEvent(
      type: ObjectEventType,
      key: ObjectEventKey | null = null,
      keyboardMode: ObjectKeyboardMode | null = null,
      targetObjectId: string | null = null,
      intervalMs: number | null = null
    ) {
      if (!selectedObject) return
      pushProjectChange(
        addObjectEvent(project, { objectId: selectedObject.id, type, key, keyboardMode, targetObjectId, intervalMs }),
        `Add ${type} event`
      )
    },
    updateObjectEventConfig(
      eventId: string,
      key: ObjectEventKey | null,
      keyboardMode: ObjectKeyboardMode | null,
      targetObjectId: string | null,
      intervalMs: number | null
    ) {
      if (!selectedObject) return
      pushProjectChange(
        updateObjectEventConfigModel(project, {
          objectId: selectedObject.id,
          eventId,
          key,
          keyboardMode,
          targetObjectId,
          intervalMs
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
    moveObjectEventItem(
      eventId: string,
      actionId: string,
      target: {
        targetIfBlockId?: string
        targetBranch?: "then" | "else"
        targetActionId?: string
        position?: "top" | "bottom"
      }
    ) {
      if (!selectedObject) return
      pushProjectChange(
        moveObjectEventItemModel(project, {
          objectId: selectedObject.id,
          eventId,
          actionId,
          ...(target.targetIfBlockId ? { targetIfBlockId: target.targetIfBlockId } : {}),
          ...(target.targetBranch ? { targetBranch: target.targetBranch } : {}),
          ...(target.targetActionId ? { targetActionId: target.targetActionId } : {}),
          ...(target.position ? { position: target.position } : {})
        }),
        "Move event action"
      )
    },
    insertObjectEventItem(eventId: string, item: ObjectEventItem, afterItemId?: string) {
      if (!selectedObject) return
      pushProjectChange(
        insertObjectEventItemModel(project, {
          objectId: selectedObject.id,
          eventId,
          item,
          ...(afterItemId ? { afterItemId } : {})
        }),
        "Paste event action"
      )
    },
    addObjectEventIfBlock(
      eventId: string,
      condition: IfCondition,
      parentIfBlockId?: string,
      parentBranch?: "then" | "else"
    ) {
      if (!selectedObject) return
      const addIfInput = {
        objectId: selectedObject.id,
        eventId,
        condition,
        ...(parentIfBlockId ? { parentIfBlockId } : {}),
        ...(parentBranch ? { parentBranch } : {})
      }
      pushProjectChange(
        addObjectEventIfBlockModel(project, addIfInput),
        "Add if block"
      )
    },
    updateObjectEventIfBlockCondition(eventId: string, ifBlockId: string, condition: IfCondition) {
      if (!selectedObject) return
      pushProjectChange(
        updateObjectEventIfBlockConditionModel(project, {
          objectId: selectedObject.id,
          eventId,
          ifBlockId,
          condition
        }),
        "Update if block condition"
      )
    },
    removeObjectEventIfBlock(eventId: string, ifBlockId: string) {
      if (!selectedObject) return
      pushProjectChange(
        removeObjectEventIfBlockModel(project, { objectId: selectedObject.id, eventId, ifBlockId }),
        "Remove if block"
      )
    },
    addObjectEventIfAction(eventId: string, ifBlockId: string, action: ObjectActionDraft, branch: "then" | "else" = "then") {
      if (!selectedObject) return
      pushProjectChange(
        addObjectEventIfActionModel(project, { objectId: selectedObject.id, eventId, ifBlockId, action, branch }),
        "Add if block action"
      )
    },
    updateObjectEventIfAction(
      eventId: string,
      ifBlockId: string,
      actionId: string,
      action: ObjectActionDraft,
      branch: "then" | "else" = "then"
    ) {
      if (!selectedObject) return
      pushProjectChange(
        updateObjectEventIfActionModel(project, { objectId: selectedObject.id, eventId, ifBlockId, actionId, action, branch }),
        "Update if block action"
      )
    },
    removeObjectEventIfAction(eventId: string, ifBlockId: string, actionId: string, branch: "then" | "else" = "then") {
      if (!selectedObject) return
      pushProjectChange(
        removeObjectEventIfActionModel(project, { objectId: selectedObject.id, eventId, ifBlockId, actionId, branch }),
        "Remove if block action"
      )
    },
    updateSelectedObjectProperty(
      key: "x" | "y" | "speed" | "direction" | "width" | "height" | "visible" | "solid",
      value: number | boolean
    ) {
      if (!selectedObject) return
      const normalizedValue =
        typeof value === "number"
          ? key === "width" || key === "height"
            ? Math.max(1, Math.round(Number.isFinite(value) ? value : 1))
            : Number.isFinite(value)
              ? value
              : 0
          : value
      const nextObject = { ...selectedObject, [key]: normalizedValue }
      pushProjectChange(
        updateObjectProperties(project, {
          objectId: selectedObject.id,
          x: nextObject.x,
          y: nextObject.y,
          speed: nextObject.speed,
          direction: nextObject.direction,
          width: nextObject.width ?? 32,
          height: nextObject.height ?? 32,
          visible: nextObject.visible ?? true,
          solid: nextObject.solid ?? false
        })
      )
    },
    addInstanceToActiveRoom(objectId?: string, x = 80, y = 80) {
      if (!activeRoom) return
      const targetObjectId = objectId ?? selectedObject?.id
      if (!targetObjectId) return
      if (wouldOverlapSolidInRoom(project, activeRoom.instances, targetObjectId, x, y)) {
        return
      }
      const next = addRoomInstance(project, {
        roomId: activeRoom.id,
        objectId: targetObjectId,
        x,
        y
      }).project
      pushProjectChange(next, "Add instance")
    },
    moveInstance(instanceId: string, x: number, y: number) {
      if (!activeRoom) return
      const movingInstance = activeRoom.instances.find((instanceEntry) => instanceEntry.id === instanceId)
      if (!movingInstance) return
      if (wouldOverlapSolidInRoom(project, activeRoom.instances, movingInstance.objectId, x, y, instanceId)) {
        return
      }
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
    updateRuntimeMousePosition(x: number, y: number) {
      runtimeMouseRef.current = {
        ...runtimeMouseRef.current,
        x,
        y,
        moved: runtimeMouseRef.current.x !== x || runtimeMouseRef.current.y !== y
      }
    },
    setRuntimeMouseButton(button: RuntimeMouseButton, isDown: boolean) {
      const pressedButtons = new Set(runtimeMouseRef.current.pressedButtons)
      const justPressedButtons = new Set(runtimeMouseRef.current.justPressedButtons)
      if (isDown) {
        if (!pressedButtons.has(button)) {
          justPressedButtons.add(button)
        }
        pressedButtons.add(button)
      } else {
        pressedButtons.delete(button)
      }
      runtimeMouseRef.current = {
        ...runtimeMouseRef.current,
        pressedButtons,
        justPressedButtons
      }
    },
    run() {
      if (isRunning) return
      const withTimeMetric = setTimeToFirstPlayableFunMs(project, Date.now() - startedAtMs)
      setProject(withTimeMetric)
      setRunSnapshot(withTimeMetric)
      runtimeMouseRef.current = {
        x: 0,
        y: 0,
        moved: false,
        pressedButtons: new Set<RuntimeMouseButton>(),
        justPressedButtons: new Set<RuntimeMouseButton>()
      }
      const initialRuntime = createInitialRuntimeState(withTimeMetric)
      runtimeRef.current = initialRuntime
      setRuntimeState(initialRuntime)
      setIsRunning(true)
      setActiveSection("run")
    },
    reset() {
      const nextResetState = resolveResetState(project, runSnapshot, activeRoomId)
      setProject(nextResetState.project)
      setIsRunning(false)
      setRunSnapshot(nextResetState.runSnapshot)
      setActiveRoomId(nextResetState.roomId)
      runtimeMouseRef.current = {
        x: 0,
        y: 0,
        moved: false,
        pressedButtons: new Set<RuntimeMouseButton>(),
        justPressedButtons: new Set<RuntimeMouseButton>()
      }
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
    async importProjectFromJsonFile(file: File) {
      const confirmed = window.confirm("Aixo sobreescriura el joc actual. Vols continuar?")
      if (!confirmed) {
        setImportStatus("idle")
        return false
      }
      try {
        setImportStatus("importing")
        const loaded = await importProjectFromFile(file)
        const normalized = ensureProjectHasRoom(loaded)
        setPast((value) => [...value.slice(-39), project])
        setFuture([])
        setProject(normalized.project)
        setActiveRoomId(normalized.roomId)
        setActiveObjectId(null)
        setActiveSpriteId(null)
        setActiveSection("objects")
        setIsRunning(false)
        setRunSnapshot(null)
        setIsDirty(true)
        setImportStatus("imported")
        return true
      } catch {
        setImportStatus("error")
        return false
      }
    },
    resetImportStatus() {
      setImportStatus("idle")
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
