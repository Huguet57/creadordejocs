import { useEffect, useMemo, useRef, useState } from "react"
import type { ProjectV1 } from "@creadordejocs/project-format"
import {
  createInitialRuntimeState,
  runRuntimeTick,
  type RuntimeMouseButton,
  type RuntimeMouseInput,
  type RuntimeState
} from "../editor-state/runtime.js"
import type { RunSectionController } from "../run/RunSection.js"

export function usePlayRuntimeController(initialProject: ProjectV1): RunSectionController {
  const [project, setProject] = useState<ProjectV1>(initialProject)
  const [runtimeState, setRuntimeState] = useState<RuntimeState>(() => createInitialRuntimeState(initialProject))
  const [isRunning, setIsRunning] = useState(false)
  const [activeRoomId, setActiveRoomId] = useState<string>(() => initialProject.rooms[0]?.id ?? "")
  const [runSnapshot, setRunSnapshot] = useState<ProjectV1 | null>(null)
  const pressedKeysRef = useRef<Set<string>>(new Set())
  const justPressedKeysRef = useRef<Set<string>>(new Set())
  const justReleasedKeysRef = useRef<Set<string>>(new Set())
  const runtimeRef = useRef<RuntimeState>(createInitialRuntimeState(initialProject))
  const runtimeMouseRef = useRef<RuntimeMouseInput>({
    x: 0,
    y: 0,
    moved: false,
    pressedButtons: new Set<RuntimeMouseButton>(),
    justPressedButtons: new Set<RuntimeMouseButton>()
  })
  const projectRef = useRef<ProjectV1>(project)
  projectRef.current = project
  const runSnapshotRef = useRef<ProjectV1 | null>(null)
  runSnapshotRef.current = runSnapshot
  const activeRoomIdRef = useRef<string>(activeRoomId)
  activeRoomIdRef.current = activeRoomId

  const activeRoom = useMemo(() => project.rooms.find((room) => room.id === activeRoomId) ?? null, [project, activeRoomId])

  useEffect(() => {
    setProject(initialProject)
    setActiveRoomId(initialProject.rooms[0]?.id ?? "")
    const fresh = createInitialRuntimeState(initialProject)
    runtimeRef.current = fresh
    setRuntimeState(fresh)
    setIsRunning(false)
    setRunSnapshot(null)
  }, [initialProject])

  useEffect(() => {
    if (!isRunning || !activeRoomId) {
      return
    }
    const interval = window.setInterval(() => {
      const currentProject = projectRef.current
      const currentRoomId = activeRoomIdRef.current
      const currentSnapshot = runSnapshotRef.current
      const result = runRuntimeTick(
        currentProject,
        currentRoomId,
        pressedKeysRef.current,
        runtimeRef.current,
        justPressedKeysRef.current,
        justReleasedKeysRef.current,
        runtimeMouseRef.current
      )
      let nextProject = result.project
      let nextRuntime = result.runtime

      if (result.restartRoomRequested && currentSnapshot) {
        const snapshotRoom = currentSnapshot.rooms.find((room) => room.id === currentRoomId)
        if (snapshotRoom) {
          nextProject = {
            ...nextProject,
            rooms: nextProject.rooms.map((room) =>
              room.id === currentRoomId
                ? {
                    ...room,
                    instances: snapshotRoom.instances.map((instanceEntry) => ({ ...instanceEntry }))
                  }
                : room
            )
          }
          nextRuntime = createInitialRuntimeState(nextProject)
        }
      }

      runtimeRef.current = nextRuntime
      projectRef.current = nextProject
      setRuntimeState(nextRuntime)
      setProject(nextProject)
      if (result.activeRoomId !== currentRoomId) {
        setActiveRoomId(result.activeRoomId)
      }
      justPressedKeysRef.current.clear()
      justReleasedKeysRef.current.clear()
      runtimeMouseRef.current.moved = false
      runtimeMouseRef.current.justPressedButtons.clear()
    }, 80)
    return () => window.clearInterval(interval)
  }, [isRunning, activeRoomId])

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent): void => {
      if (!pressedKeysRef.current.has(event.code)) {
        justPressedKeysRef.current.add(event.code)
      }
      pressedKeysRef.current.add(event.code)
    }
    const onKeyUp = (event: KeyboardEvent): void => {
      if (pressedKeysRef.current.has(event.code)) {
        justReleasedKeysRef.current.add(event.code)
      }
      pressedKeysRef.current.delete(event.code)
    }
    const releaseAllKeys = (): void => {
      for (const key of pressedKeysRef.current) {
        justReleasedKeysRef.current.add(key)
      }
      pressedKeysRef.current.clear()
    }
    const onVisibilityChange = (): void => {
      if (document.visibilityState === "hidden") {
        releaseAllKeys()
      }
    }
    window.addEventListener("keydown", onKeyDown)
    window.addEventListener("keyup", onKeyUp)
    window.addEventListener("blur", releaseAllKeys)
    document.addEventListener("visibilitychange", onVisibilityChange)
    return () => {
      window.removeEventListener("keydown", onKeyDown)
      window.removeEventListener("keyup", onKeyUp)
      window.removeEventListener("blur", releaseAllKeys)
      document.removeEventListener("visibilitychange", onVisibilityChange)
    }
  }, [])

  useEffect(() => {
    if (isRunning) {
      return
    }
    pressedKeysRef.current.clear()
    justPressedKeysRef.current.clear()
    justReleasedKeysRef.current.clear()
    runtimeMouseRef.current = {
      x: 0,
      y: 0,
      moved: false,
      pressedButtons: new Set<RuntimeMouseButton>(),
      justPressedButtons: new Set<RuntimeMouseButton>()
    }
  }, [isRunning])

  const run = (): void => {
    setRunSnapshot(project)
    const freshRuntime = createInitialRuntimeState(project)
    runtimeRef.current = freshRuntime
    setRuntimeState(freshRuntime)
    setIsRunning(true)
  }

  const reset = (): void => {
    const baseProject = runSnapshot ?? initialProject
    setProject(baseProject)
    setActiveRoomId(baseProject.rooms[0]?.id ?? "")
    const freshRuntime = createInitialRuntimeState(baseProject)
    runtimeRef.current = freshRuntime
    setRuntimeState(freshRuntime)
    setRunSnapshot(null)
    setIsRunning(false)
  }

  const updateRuntimeMousePosition = (x: number, y: number): void => {
    runtimeMouseRef.current.x = x
    runtimeMouseRef.current.y = y
    runtimeMouseRef.current.moved = true
  }

  const setRuntimeMouseButton = (button: RuntimeMouseButton, pressed: boolean): void => {
    if (pressed) {
      if (!runtimeMouseRef.current.pressedButtons.has(button)) {
        runtimeMouseRef.current.justPressedButtons.add(button)
      }
      runtimeMouseRef.current.pressedButtons.add(button)
      return
    }
    runtimeMouseRef.current.pressedButtons.delete(button)
  }

  return {
    project,
    runtimeState,
    activeRoom,
    isRunning,
    run,
    reset,
    updateRuntimeMousePosition,
    setRuntimeMouseButton
  }
}
