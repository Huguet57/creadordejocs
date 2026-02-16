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
  const runtimeRef = useRef<RuntimeState>(createInitialRuntimeState(initialProject))
  const runtimeMouseRef = useRef<RuntimeMouseInput>({
    x: 0,
    y: 0,
    moved: false,
    pressedButtons: new Set<RuntimeMouseButton>(),
    justPressedButtons: new Set<RuntimeMouseButton>()
  })

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
        const snapshotRoom = runSnapshot.rooms.find((room) => room.id === activeRoom.id)
        if (snapshotRoom) {
          nextProject = {
            ...nextProject,
            rooms: nextProject.rooms.map((room) =>
              room.id === activeRoom.id
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
      if (!pressedKeysRef.current.has(event.code)) {
        justPressedKeysRef.current.add(event.code)
      }
      pressedKeysRef.current.add(event.code)
    }
    const onKeyUp = (event: KeyboardEvent): void => {
      pressedKeysRef.current.delete(event.code)
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
