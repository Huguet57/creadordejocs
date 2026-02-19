import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type DragEvent as ReactDragEvent,
  type MouseEvent as ReactMouseEvent
} from "react"
import { EyeOff, X } from "lucide-react"
import type { EditorController } from "../editor-state/use-editor-controller.js"
import { WINDOW_HEIGHT, WINDOW_WIDTH, resolveRoomDimensions } from "../editor-state/runtime-types.js"
import { getPositionCountsByCoordinate, getPositionKey, wouldOverlapSolid } from "./room-placement-utils.js"
import { resolveSpritePreviewSource } from "../sprites/utils/sprite-preview-source.js"
import { RoomListPanel } from "./RoomListPanel.js"
import { RoomObjectPickerPanel } from "./RoomObjectPickerPanel.js"
import { RoomTabBar } from "./RoomTabBar.js"

const ROOM_GRID_SIZE = 32
const DRAG_SNAP_SIZE = 4
const DEFAULT_INSTANCE_SIZE = 32
const OBJECT_DRAG_DATA_KEY = "application/x-creadordejocs-object-id"

type RoomDragPreview = {
  instanceId: string
  objectId: string
  x: number
  y: number
  width: number
  height: number
  isBlocked: boolean
}

type RoomPlacementGhost = {
  objectId: string
  x: number
  y: number
  width: number
  height: number
  isBlocked: boolean
}

export function snapToGrid(value: number, gridSize: number): number {
  return Math.round(value / gridSize) * gridSize
}

export function calculateRoomDragPosition(params: {
  clientX: number
  clientY: number
  rectLeft: number
  rectTop: number
  roomWidth: number
  roomHeight: number
  instanceWidth: number
  instanceHeight: number
  snapSize: number
  zoom?: number
}): { x: number; y: number } {
  const zoom = params.zoom && Number.isFinite(params.zoom) && params.zoom > 0 ? params.zoom : 1
  const rawX = (params.clientX - params.rectLeft) / zoom - params.instanceWidth / 2
  const rawY = (params.clientY - params.rectTop) / zoom - params.instanceHeight / 2
  const maxX = params.roomWidth - params.instanceWidth
  const maxY = params.roomHeight - params.instanceHeight
  const clampedX = Math.max(0, Math.min(maxX, rawX))
  const clampedY = Math.max(0, Math.min(maxY, rawY))
  const snappedX = snapToGrid(clampedX, params.snapSize)
  const snappedY = snapToGrid(clampedY, params.snapSize)
  return {
    x: Math.max(0, Math.min(maxX, snappedX)),
    y: Math.max(0, Math.min(maxY, snappedY))
  }
}

type RoomEditorSectionProps = {
  controller: EditorController
}

export function RoomEditorSection({ controller }: RoomEditorSectionProps) {
  const [resolvedSpriteSources, setResolvedSpriteSources] = useState<Record<string, string>>({})
  const [dragPreview, setDragPreview] = useState<RoomDragPreview | null>(null)
  const [draggingInstanceId, setDraggingInstanceId] = useState<string | null>(null)
  const [draggingObjectId, setDraggingObjectId] = useState<string | null>(null)
  const [placingObjectId, setPlacingObjectId] = useState<string | null>(null)
  const [placementGhost, setPlacementGhost] = useState<RoomPlacementGhost | null>(null)
  const [showGrid, setShowGrid] = useState(true)
  const [roomWidthInput, setRoomWidthInput] = useState<string>(String(WINDOW_WIDTH))
  const [roomHeightInput, setRoomHeightInput] = useState<string>(String(WINDOW_HEIGHT))
  const [zoomPercent, setZoomPercent] = useState<number>(100)
  const transparentDragImageRef = useRef<HTMLDivElement | null>(null)

  // Tab state (VSCode-like: preview + pinned)
  const [openTabs, setOpenTabs] = useState<{ id: string; pinned: boolean }[]>([])
  const instanceCountRef = useRef<number>(0)

  const sprites = controller.project.resources.sprites
  const projectRooms = controller.project.rooms

  const spriteById = useMemo(
    () => Object.fromEntries(sprites.map((spriteEntry) => [spriteEntry.id, spriteEntry])),
    [sprites]
  )
  const objectById = useMemo(
    () => Object.fromEntries(controller.project.objects.map((objectEntry) => [objectEntry.id, objectEntry])),
    [controller.project.objects]
  )
  const activeRoomPositionCounts = useMemo(
    () => getPositionCountsByCoordinate(controller.activeRoom?.instances ?? []),
    [controller.activeRoom]
  )
  const activeRoomDimensions = useMemo(
    () => resolveRoomDimensions(controller.activeRoom),
    [controller.activeRoom]
  )
  const activeRoomWidth = activeRoomDimensions.width
  const activeRoomHeight = activeRoomDimensions.height
  const zoom = zoomPercent / 100
  const activeRoomBackgroundSpriteId = controller.activeRoom?.backgroundSpriteId ?? null
  const activeRoomBackgroundSprite = activeRoomBackgroundSpriteId ? spriteById[activeRoomBackgroundSpriteId] : undefined
  const activeRoomBackgroundSource = activeRoomBackgroundSprite ? resolvedSpriteSources[activeRoomBackgroundSprite.id] : undefined

  const roomCanvasBackgroundStyle = useMemo(() => {
    const backgroundImages: string[] = []
    const backgroundSizes: string[] = []
    const backgroundRepeats: string[] = []
    const backgroundPositions: string[] = []

    if (showGrid) {
      backgroundImages.push(
        "linear-gradient(to right, rgb(226 232 240 / 0.8) 1px, transparent 1px)",
        "linear-gradient(to bottom, rgb(226 232 240 / 0.8) 1px, transparent 1px)"
      )
      backgroundSizes.push(`${ROOM_GRID_SIZE * zoom}px ${ROOM_GRID_SIZE * zoom}px`, `${ROOM_GRID_SIZE * zoom}px ${ROOM_GRID_SIZE * zoom}px`)
      backgroundRepeats.push("repeat", "repeat")
      backgroundPositions.push("0 0", "0 0")
    }

    if (activeRoomBackgroundSource && activeRoomBackgroundSprite) {
      backgroundImages.push(`url(${JSON.stringify(activeRoomBackgroundSource)})`)
      backgroundSizes.push(
        `${Math.max(1, Math.round(activeRoomBackgroundSprite.width * zoom))}px ${Math.max(1, Math.round(activeRoomBackgroundSprite.height * zoom))}px`
      )
      backgroundRepeats.push("repeat")
      backgroundPositions.push("0 0")
    }

    if (backgroundImages.length === 0) {
      return {}
    }

    return {
      backgroundImage: backgroundImages.join(", "),
      backgroundSize: backgroundSizes.join(", "),
      backgroundRepeat: backgroundRepeats.join(", "),
      backgroundPosition: backgroundPositions.join(", ")
    }
  }, [showGrid, zoom, activeRoomBackgroundSource, activeRoomBackgroundSprite])

  // Clean up tabs when rooms are removed
  useEffect(() => {
    const currentRoomIds = new Set(projectRooms.map((r) => r.id))
    setOpenTabs((prev) => {
      const cleaned = prev.filter((tabEntry) => currentRoomIds.has(tabEntry.id))
      return cleaned.length === prev.length ? prev : cleaned
    })
  }, [projectRooms])

  // Ensure active room is visible in tabs
  useEffect(() => {
    if (controller.activeRoomId) {
      const activeId = controller.activeRoomId
      setOpenTabs((prev) => {
        if (prev.some((tabEntry) => tabEntry.id === activeId)) {
          return prev
        }
        return [...prev.filter((tabEntry) => tabEntry.pinned), { id: activeId, pinned: false }]
      })
    }
  }, [controller.activeRoomId])

  // Auto-promote to pinned when instances change
  useEffect(() => {
    const currentCount = controller.activeRoom?.instances.length ?? 0
    if (controller.activeRoomId && instanceCountRef.current !== currentCount && instanceCountRef.current !== 0) {
      const activeId = controller.activeRoomId
      setOpenTabs((prev) =>
        prev.map((tabEntry) =>
          tabEntry.id === activeId && !tabEntry.pinned ? { ...tabEntry, pinned: true } : tabEntry
        )
      )
    }
    instanceCountRef.current = currentCount
  }, [controller.activeRoom?.instances.length, controller.activeRoomId])

  useEffect(() => {
    return () => {
      if (transparentDragImageRef.current) {
        transparentDragImageRef.current.remove()
        transparentDragImageRef.current = null
      }
    }
  }, [])

  useEffect(() => {
    let cancelled = false

    const resolveSprites = async () => {
      const pairs = await Promise.all(
        sprites.map(async (spriteEntry) => {
          const resolved = await resolveSpritePreviewSource(spriteEntry)
          return [spriteEntry.id, resolved] as const
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

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") {
        return
      }
      setPlacingObjectId(null)
      setPlacementGhost(null)
    }
    window.addEventListener("keydown", onKeyDown)
    return () => window.removeEventListener("keydown", onKeyDown)
  }, [])

  useEffect(() => {
    if (!controller.activeRoom) {
      setPlacingObjectId(null)
      setPlacementGhost(null)
      return
    }
    if (placingObjectId && !objectById[placingObjectId]) {
      setPlacingObjectId(null)
      setPlacementGhost(null)
    }
  }, [controller.activeRoom, objectById, placingObjectId])

  useEffect(() => {
    setRoomWidthInput(String(activeRoomWidth))
    setRoomHeightInput(String(activeRoomHeight))
  }, [controller.activeRoom?.id, activeRoomWidth, activeRoomHeight])

  const handleSelectRoom = (id: string) => {
    controller.setActiveRoomId(id)
    setOpenTabs((prev) => {
      const existing = prev.find((tabEntry) => tabEntry.id === id)
      const pinnedTabs = prev.filter((tabEntry) => tabEntry.pinned)
      if (existing?.pinned) {
        return [...pinnedTabs]
      }
      return [...pinnedTabs, { id, pinned: false }]
    })
  }

  const handlePinRoom = (id: string) => {
    controller.setActiveRoomId(id)
    setOpenTabs((prev) => {
      const tabIndex = prev.findIndex((tabEntry) => tabEntry.id === id)
      if (tabIndex === -1) {
        return [...prev, { id, pinned: true }]
      }
      return prev.map((tabEntry, index) => (index === tabIndex ? { ...tabEntry, pinned: true } : tabEntry))
    })
  }

  const handleCloseTab = (tabId: string) => {
    const currentIndex = openTabs.findIndex((tabEntry) => tabEntry.id === tabId)
    const remainingTabs = openTabs.filter((tabEntry) => tabEntry.id !== tabId)
    setOpenTabs(remainingTabs)

    if (controller.activeRoomId === tabId) {
      const nextTabId =
        remainingTabs.length > 0 ? (remainingTabs[Math.min(currentIndex, remainingTabs.length - 1)]?.id ?? null) : null
      controller.setActiveRoomId(nextTabId ?? "")
    }
  }

  const handleDeleteRoom = (roomId: string) => {
    const currentIndex = openTabs.findIndex((tabEntry) => tabEntry.id === roomId)
    const remainingTabs = openTabs.filter((tabEntry) => tabEntry.id !== roomId)

    controller.deleteRoom(roomId)

    setOpenTabs(remainingTabs)
    if (controller.activeRoomId === roomId && remainingTabs.length > 0) {
      const nextTabId = remainingTabs[Math.min(currentIndex, remainingTabs.length - 1)]?.id ?? null
      controller.setActiveRoomId(nextTabId ?? "")
    }
  }

  const commitRoomSize = (nextWidthRaw: string, nextHeightRaw: string) => {
    if (!controller.activeRoom) {
      return
    }
    const parsedWidth = Number.parseInt(nextWidthRaw, 10)
    const parsedHeight = Number.parseInt(nextHeightRaw, 10)
    const safeWidth = Number.isFinite(parsedWidth) ? parsedWidth : activeRoomWidth
    const safeHeight = Number.isFinite(parsedHeight) ? parsedHeight : activeRoomHeight
    controller.updateRoomSize(controller.activeRoom.id, safeWidth, safeHeight)
  }

  const handleObjectPickerDragStart = (event: ReactDragEvent, objectId: string) => {
    event.dataTransfer.setData(OBJECT_DRAG_DATA_KEY, objectId)
    event.dataTransfer.effectAllowed = "copy"
    if (!transparentDragImageRef.current) {
      const element = document.createElement("div")
      element.style.width = "1px"
      element.style.height = "1px"
      element.style.position = "fixed"
      element.style.top = "-1000px"
      element.style.left = "-1000px"
      element.style.opacity = "0.01"
      document.body.appendChild(element)
      transparentDragImageRef.current = element
    }
    event.dataTransfer.setDragImage(transparentDragImageRef.current, 0, 0)
    setDraggingObjectId(objectId)
  }

  const handleObjectPickerDragEnd = () => {
    setDraggingObjectId(null)
    setPlacementGhost(null)
  }

  const updatePlacementGhost = (event: ReactMouseEvent<HTMLDivElement>) => {
    if (!controller.activeRoom || !placingObjectId) {
      setPlacementGhost(null)
      return
    }
    const objectEntry = objectById[placingObjectId]
    if (!objectEntry) {
      setPlacementGhost(null)
      return
    }
    const instanceWidth = objectEntry.width ?? DEFAULT_INSTANCE_SIZE
    const instanceHeight = objectEntry.height ?? DEFAULT_INSTANCE_SIZE
    const rect = event.currentTarget.getBoundingClientRect()
    const position = calculateRoomDragPosition({
      clientX: event.clientX,
      clientY: event.clientY,
      rectLeft: rect.left,
      rectTop: rect.top,
      roomWidth: activeRoomWidth,
      roomHeight: activeRoomHeight,
      instanceWidth,
      instanceHeight,
      snapSize: DRAG_SNAP_SIZE,
      zoom
    })
    const isBlocked = wouldOverlapSolid({
      project: controller.project,
      roomInstances: controller.activeRoom.instances,
      objectId: placingObjectId,
      x: position.x,
      y: position.y
    })
    setPlacementGhost({
      objectId: placingObjectId,
      x: position.x,
      y: position.y,
      width: instanceWidth,
      height: instanceHeight,
      isBlocked
    })
  }

  const handleRoomCanvasClick = (event: ReactMouseEvent<HTMLDivElement>) => {
    if (!placingObjectId || !controller.activeRoom) {
      return
    }
    if (placementGhost?.objectId !== placingObjectId) {
      updatePlacementGhost(event)
      return
    }
    if (placementGhost.isBlocked) {
      return
    }
    controller.addInstanceToActiveRoom(placingObjectId, placementGhost.x, placementGhost.y)
  }

  const tabData = useMemo(
    () =>
      openTabs
        .map((tabEntry) => {
          const room = projectRooms.find((r) => r.id === tabEntry.id)
          if (!room) return null
          return {
            id: room.id,
            name: room.name,
            pinned: tabEntry.pinned
          }
        })
        .filter((t): t is NonNullable<typeof t> => t !== null),
    [openTabs, projectRooms]
  )

  return (
    <div className="mvp15-room-editor-container flex h-[600px] w-full overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
      {/* Left panel: Room list with folders */}
      <RoomListPanel
        rooms={projectRooms}
        roomFolders={controller.project.resources.roomFolders ?? []}
        activeRoomId={controller.activeRoomId}
        onSelectRoom={handleSelectRoom}
        onPinRoom={handlePinRoom}
        onOpenInNewTab={handlePinRoom}
        onAddRoom={(name, folderId) => controller.addRoom(name, folderId)}
        onRenameRoom={(roomId, name) => controller.renameRoom(roomId, name)}
        onDeleteRoom={handleDeleteRoom}
        onCreateFolder={(name, parentId) => controller.createRoomFolder(name, parentId)}
        onRenameFolder={(folderId, name) => controller.renameRoomFolder(folderId, name)}
        onDeleteFolder={(folderId) => controller.deleteRoomFolder(folderId)}
        onMoveFolder={(folderId, newParentId) => controller.moveRoomFolder(folderId, newParentId)}
        onMoveRoomToFolder={(roomId, folderId) => controller.moveRoomToFolder(roomId, folderId)}
      />

      {/* Right panel: Tab bar + Canvas */}
      <div className="roomtabs-editor-area flex min-w-0 flex-1 flex-col border-l border-slate-200">
        <RoomTabBar
          tabs={tabData}
          activeTabId={controller.activeRoomId}
          onSelectTab={(id) => controller.setActiveRoomId(id)}
          onCloseTab={handleCloseTab}
          onPinTab={handlePinRoom}
        />

        <div className="flex min-h-0 flex-1 flex-col bg-slate-50/50">
          {!controller.activeRoom ? (
            <div className="flex h-full items-center justify-center text-slate-400">
              <p>Select or create a room</p>
            </div>
          ) : (
            <div className="flex min-h-0 flex-1">
              {/* Side panel: Object picker + Attributes + Options */}
              <RoomObjectPickerPanel
                objects={controller.project.objects}
                objectFolders={controller.project.resources.objectFolders ?? []}
                resolvedSpriteSources={resolvedSpriteSources}
                placingObjectId={placingObjectId}
                hasActiveRoom={Boolean(controller.activeRoom)}
                onTogglePlacement={(objectId) => {
                  setPlacingObjectId((current) => (current === objectId ? null : objectId))
                  setPlacementGhost(null)
                }}
                onDragStart={handleObjectPickerDragStart}
                onDragEnd={handleObjectPickerDragEnd}
                roomWidthInput={roomWidthInput}
                roomHeightInput={roomHeightInput}
                onRoomWidthInputChange={setRoomWidthInput}
                onRoomHeightInputChange={setRoomHeightInput}
                onCommitRoomSize={() => commitRoomSize(roomWidthInput, roomHeightInput)}
                backgroundSpriteId={activeRoomBackgroundSpriteId}
                backgroundSprites={sprites}
                onChangeBackgroundSprite={(spriteId) => {
                  if (!controller.activeRoom) {
                    return
                  }
                  controller.updateRoomBackground(controller.activeRoom.id, spriteId)
                }}
              />

              <div className="flex min-w-0 flex-1 flex-col">
              <div className="flex items-center border-b border-slate-200 bg-white p-3">
                <label className="mvp19-room-grid-toggle flex cursor-pointer items-center gap-2">
                  <input
                    type="checkbox"
                    checked={showGrid}
                    onChange={(e) => setShowGrid(e.target.checked)}
                    className="h-3.5 w-3.5 rounded border-slate-300 text-blue-500 focus:ring-blue-400"
                  />
                  <span className="text-xs text-slate-600">Grid</span>
                </label>
                <div className="ml-auto flex items-center gap-2 text-xs text-slate-600">
                  <span className="font-medium text-slate-500">Zoom</span>
                  <input
                    type="range"
                    min={25}
                    max={300}
                    step={5}
                    value={zoomPercent}
                    onChange={(event) => setZoomPercent(Number.parseInt(event.target.value, 10) || 100)}
                  />
                  <span className="w-12 text-right text-slate-500">{zoomPercent}%</span>
                </div>
              </div>
              <div className="min-h-0 flex-1 overflow-auto">
                <div
                  className={`mvp15-room-canvas mvp18-room-grid-canvas relative border border-slate-200 bg-white ${
                    placingObjectId ? "cursor-crosshair" : ""
                  }`}
                  style={{
                    width: activeRoomWidth * zoom,
                    height: activeRoomHeight * zoom,
                    ...roomCanvasBackgroundStyle
                  }}
                  onMouseMove={(event) => {
                    if (!placingObjectId) {
                      return
                    }
                    updatePlacementGhost(event)
                  }}
                  onMouseLeave={() => {
                    setPlacementGhost(null)
                  }}
                  onClick={handleRoomCanvasClick}
                  onDragOver={(event) => {
                    event.preventDefault()
                    if (!controller.activeRoom) return
                    const draggedObjectId = event.dataTransfer.getData(OBJECT_DRAG_DATA_KEY) || draggingObjectId
                    if (draggedObjectId) {
                      const objectEntry = objectById[draggedObjectId]
                      if (!objectEntry) {
                        setPlacementGhost(null)
                        return
                      }
                      const instanceWidth = objectEntry.width ?? DEFAULT_INSTANCE_SIZE
                      const instanceHeight = objectEntry.height ?? DEFAULT_INSTANCE_SIZE
                      const rect = event.currentTarget.getBoundingClientRect()
                      const position = calculateRoomDragPosition({
                        clientX: event.clientX,
                        clientY: event.clientY,
                        rectLeft: rect.left,
                        rectTop: rect.top,
                        roomWidth: activeRoomWidth,
                        roomHeight: activeRoomHeight,
                        instanceWidth,
                        instanceHeight,
                        snapSize: DRAG_SNAP_SIZE,
                        zoom
                      })
                      setPlacementGhost({
                        objectId: draggedObjectId,
                        x: position.x,
                        y: position.y,
                        width: instanceWidth,
                        height: instanceHeight,
                        isBlocked: wouldOverlapSolid({
                          project: controller.project,
                          roomInstances: controller.activeRoom.instances,
                          objectId: draggedObjectId,
                          x: position.x,
                          y: position.y
                        })
                      })
                      return
                    }
                    if (!draggingInstanceId) return
                    const instanceEntry = controller.activeRoom.instances.find((candidate) => candidate.id === draggingInstanceId)
                    if (!instanceEntry) return
                    const objectEntry = instanceEntry
                      ? controller.project.objects.find((candidate) => candidate.id === instanceEntry.objectId)
                      : null
                    const instanceWidth = objectEntry?.width ?? DEFAULT_INSTANCE_SIZE
                    const instanceHeight = objectEntry?.height ?? DEFAULT_INSTANCE_SIZE
                    const rect = event.currentTarget.getBoundingClientRect()
                    const position = calculateRoomDragPosition({
                      clientX: event.clientX,
                      clientY: event.clientY,
                      rectLeft: rect.left,
                      rectTop: rect.top,
                      roomWidth: activeRoomWidth,
                      roomHeight: activeRoomHeight,
                      instanceWidth,
                      instanceHeight,
                      snapSize: DRAG_SNAP_SIZE,
                      zoom
                    })
                    setDragPreview({
                      instanceId: draggingInstanceId,
                      objectId: instanceEntry.objectId,
                      x: position.x,
                      y: position.y,
                      width: instanceWidth,
                      height: instanceHeight,
                      isBlocked: wouldOverlapSolid({
                        project: controller.project,
                        roomInstances: controller.activeRoom.instances,
                        objectId: instanceEntry.objectId,
                        x: position.x,
                        y: position.y,
                        excludeInstanceId: draggingInstanceId
                      })
                    })
                  }}
                  onDragLeave={(event) => {
                    if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
                      setDragPreview(null)
                      setPlacementGhost(null)
                    }
                  }}
                  onDrop={(event) => {
                    event.preventDefault()
                    if (!controller.activeRoom) return
                    const draggedObjectId = event.dataTransfer.getData(OBJECT_DRAG_DATA_KEY) || draggingObjectId
                    if (draggedObjectId) {
                      const objectEntry = objectById[draggedObjectId]
                      if (!objectEntry) {
                        setPlacementGhost(null)
                        setDraggingObjectId(null)
                        return
                      }
                      const instanceWidth = objectEntry.width ?? DEFAULT_INSTANCE_SIZE
                      const instanceHeight = objectEntry.height ?? DEFAULT_INSTANCE_SIZE
                      const rect = event.currentTarget.getBoundingClientRect()
                      const position = calculateRoomDragPosition({
                        clientX: event.clientX,
                        clientY: event.clientY,
                        rectLeft: rect.left,
                        rectTop: rect.top,
                        roomWidth: activeRoomWidth,
                        roomHeight: activeRoomHeight,
                        instanceWidth,
                        instanceHeight,
                        snapSize: DRAG_SNAP_SIZE,
                        zoom
                      })
                      const isBlocked = wouldOverlapSolid({
                        project: controller.project,
                        roomInstances: controller.activeRoom.instances,
                        objectId: draggedObjectId,
                        x: position.x,
                        y: position.y
                      })
                      if (isBlocked) {
                        setPlacementGhost({
                          objectId: draggedObjectId,
                          x: position.x,
                          y: position.y,
                          width: instanceWidth,
                          height: instanceHeight,
                          isBlocked: true
                        })
                        return
                      }
                      controller.addInstanceToActiveRoom(draggedObjectId, position.x, position.y)
                      setPlacementGhost(null)
                      setDraggingObjectId(null)
                      return
                    }
                    const instanceId = event.dataTransfer.getData("text/plain")
                    const instanceEntry = controller.activeRoom.instances.find((candidate) => candidate.id === instanceId)
                    if (!instanceEntry) return
                    const objectEntry = instanceEntry
                      ? controller.project.objects.find((candidate) => candidate.id === instanceEntry.objectId)
                      : null
                    const instanceWidth = objectEntry?.width ?? DEFAULT_INSTANCE_SIZE
                    const instanceHeight = objectEntry?.height ?? DEFAULT_INSTANCE_SIZE
                    const rect = event.currentTarget.getBoundingClientRect()
                    const position = calculateRoomDragPosition({
                      clientX: event.clientX,
                      clientY: event.clientY,
                      rectLeft: rect.left,
                      rectTop: rect.top,
                      roomWidth: activeRoomWidth,
                      roomHeight: activeRoomHeight,
                      instanceWidth,
                      instanceHeight,
                      snapSize: DRAG_SNAP_SIZE,
                      zoom
                    })
                    const isBlocked = wouldOverlapSolid({
                      project: controller.project,
                      roomInstances: controller.activeRoom.instances,
                      objectId: instanceEntry.objectId,
                      x: position.x,
                      y: position.y,
                      excludeInstanceId: instanceId
                    })
                    if (isBlocked) {
                      setDragPreview({
                        instanceId,
                        objectId: instanceEntry.objectId,
                        x: position.x,
                        y: position.y,
                        width: instanceWidth,
                        height: instanceHeight,
                        isBlocked: true
                      })
                      return
                    }
                    controller.moveInstance(instanceId, position.x, position.y)
                    setDragPreview(null)
                    setDraggingInstanceId(null)
                  }}
                >
                  {(activeRoomWidth > WINDOW_WIDTH || activeRoomHeight > WINDOW_HEIGHT) && (
                    <div
                      className="pointer-events-none absolute z-0 border-2 border-dashed border-amber-400/60"
                      style={{
                        left: 0,
                        top: 0,
                        width: WINDOW_WIDTH * zoom,
                        height: WINDOW_HEIGHT * zoom
                      }}
                      aria-hidden
                    />
                  )}
                  {controller.activeRoom.instances.map((instanceEntry) => {
                    const objectEntry = objectById[instanceEntry.objectId]
                    const spriteEntry = objectEntry?.spriteId ? spriteById[objectEntry.spriteId] : undefined
                    const spriteSource = spriteEntry ? resolvedSpriteSources[spriteEntry.id] : undefined
                    const instanceWidth = objectEntry?.width ?? DEFAULT_INSTANCE_SIZE
                    const instanceHeight = objectEntry?.height ?? DEFAULT_INSTANCE_SIZE
                    const stackedCount = activeRoomPositionCounts.get(getPositionKey(instanceEntry.x, instanceEntry.y)) ?? 1
                    const isInvisible = objectEntry?.visible === false
                    return (
                      <div
                        key={instanceEntry.id}
                        className={`mvp15-room-instance group absolute flex cursor-move items-center justify-center rounded text-[10px] ${spriteSource ? "" : isInvisible ? "border border-dashed border-blue-400 bg-blue-100 text-blue-400" : "bg-blue-500 text-white"} ${draggingInstanceId === instanceEntry.id ? "opacity-30" : isInvisible ? "opacity-50" : ""}`}
                        style={{
                          left: instanceEntry.x * zoom,
                          top: instanceEntry.y * zoom,
                          width: instanceWidth * zoom,
                          height: instanceHeight * zoom
                        }}
                        draggable
                        onDragStart={(event) => {
                          event.dataTransfer.setData("text/plain", instanceEntry.id)
                          event.dataTransfer.effectAllowed = "move"
                          if (!transparentDragImageRef.current) {
                            const element = document.createElement("div")
                            element.style.width = "1px"
                            element.style.height = "1px"
                            element.style.position = "fixed"
                            element.style.top = "-1000px"
                            element.style.left = "-1000px"
                            element.style.opacity = "0.01"
                            document.body.appendChild(element)
                            transparentDragImageRef.current = element
                          }
                          event.dataTransfer.setDragImage(transparentDragImageRef.current, 0, 0)
                          setDraggingInstanceId(instanceEntry.id)
                        }}
                        onDragEnd={() => {
                          setDragPreview(null)
                          setDraggingInstanceId(null)
                        }}
                        title={
                          objectEntry
                            ? `${objectEntry.name} (${Math.round(instanceEntry.x)}, ${Math.round(instanceEntry.y)})`
                            : "Instance"
                        }
                      >
                        {spriteSource ? (
                          <img
                            className={`mvp15-room-instance-sprite h-full w-full object-contain ${isInvisible ? "opacity-40" : ""}`}
                            src={spriteSource}
                            alt={spriteEntry?.name ?? objectEntry?.name ?? "Sprite"}
                          />
                        ) : (
                          objectEntry?.name.slice(0, 2).toUpperCase() ?? "??"
                        )}
                        {isInvisible && (
                          <EyeOff className="mvp20-room-instance-invisible-icon pointer-events-none absolute bottom-0 left-0 h-3 w-3 text-blue-500 opacity-80" />
                        )}
                        {stackedCount > 1 && (
                          <span className="mvp20-room-instance-stack-badge pointer-events-none absolute -right-1 -top-1 z-20 flex h-4 min-w-4 items-center justify-center rounded-full bg-slate-800 px-1 text-[9px] font-semibold leading-none text-white">
                            {stackedCount}
                          </span>
                        )}
                        <button
                          type="button"
                          className={`absolute -right-1.5 -top-1.5 h-4 w-4 items-center justify-center rounded-full bg-red-500 text-white ${draggingInstanceId ? "hidden" : "hidden group-hover:flex"}`}
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
                  {placementGhost && (
                    <div
                      className={`mvp20-room-placement-ghost pointer-events-none absolute z-10 rounded border-2 ${
                        placementGhost.isBlocked
                          ? "border-red-400 bg-red-400/20"
                          : "border-blue-400 bg-blue-400/20"
                      }`}
                      style={{
                        left: placementGhost.x * zoom,
                        top: placementGhost.y * zoom,
                        width: placementGhost.width * zoom,
                        height: placementGhost.height * zoom
                      }}
                      aria-hidden
                    />
                  )}
                  {dragPreview && (
                    <div
                      className={`mvp19-room-drag-ghost pointer-events-none absolute z-10 rounded border-2 ${
                        dragPreview.isBlocked ? "border-red-400 bg-red-400/20" : "border-blue-400 bg-blue-400/20"
                      }`}
                      style={{
                        left: dragPreview.x * zoom,
                        top: dragPreview.y * zoom,
                        width: dragPreview.width * zoom,
                        height: dragPreview.height * zoom
                      }}
                      aria-hidden
                    />
                  )}
                </div>
              </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
