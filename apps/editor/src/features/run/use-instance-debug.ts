import { useCallback, useEffect, useState } from "react"
import type { ProjectV1 } from "@creadordejocs/project-format"
import { hitTestInstances } from "./run-window-utils.js"

type UseInstanceDebugParams = {
  isRunning: boolean
  activeRoom: ProjectV1["rooms"][number] | null
  objects: ProjectV1["objects"]
}

type UseInstanceDebugResult = {
  debugEnabled: boolean
  setDebugEnabled: (enabled: boolean) => void
  selectedInstanceId: string | null
  setSelectedInstanceId: (id: string | null) => void
  handleCanvasClick: (worldX: number, worldY: number) => void
}

export function useInstanceDebug({ isRunning, activeRoom, objects }: UseInstanceDebugParams): UseInstanceDebugResult {
  const [debugEnabled, setDebugEnabled] = useState(false)
  const [selectedInstanceId, setSelectedInstanceId] = useState<string | null>(null)

  // Clear selection when game stops
  useEffect(() => {
    if (!isRunning) {
      setSelectedInstanceId(null)
    }
  }, [isRunning])

  // Clear selection when debug mode is turned off
  useEffect(() => {
    if (!debugEnabled) {
      setSelectedInstanceId(null)
    }
  }, [debugEnabled])

  // Clear selection when the selected instance is destroyed
  useEffect(() => {
    if (selectedInstanceId === null) return
    if (!activeRoom) {
      setSelectedInstanceId(null)
      return
    }
    const stillAlive = activeRoom.instances.some((inst) => inst.id === selectedInstanceId)
    if (!stillAlive) {
      setSelectedInstanceId(null)
    }
  }, [selectedInstanceId, activeRoom])

  // Escape key deselects
  useEffect(() => {
    if (selectedInstanceId === null) return
    const onEscape = (event: KeyboardEvent): void => {
      if (event.key === "Escape") {
        setSelectedInstanceId(null)
      }
    }
    window.addEventListener("keydown", onEscape)
    return () => window.removeEventListener("keydown", onEscape)
  }, [selectedInstanceId])

  const handleCanvasClick = useCallback(
    (worldX: number, worldY: number) => {
      if (!debugEnabled || !activeRoom) return
      const hitId = hitTestInstances({
        worldX,
        worldY,
        instances: activeRoom.instances,
        objects
      })
      setSelectedInstanceId(hitId)
    },
    [debugEnabled, activeRoom, objects]
  )

  return { debugEnabled, setDebugEnabled, selectedInstanceId, setSelectedInstanceId, handleCanvasClick }
}
