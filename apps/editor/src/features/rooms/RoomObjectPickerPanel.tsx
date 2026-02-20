import {
  Box,
  Eraser,
  Check,
  ChevronDown,
  ChevronRight,
  Paintbrush,
  Plus
} from "lucide-react"
import { useEffect, useMemo, useRef, useState, type DragEvent as ReactDragEvent } from "react"
import type { ProjectV1 } from "@creadordejocs/project-format"
import { WINDOW_HEIGHT, WINDOW_WIDTH } from "../editor-state/runtime-types.js"
import { buildEntriesByFolder, buildFolderChildrenByParent } from "../shared/editor-sidebar/tree-utils.js"

type ObjectFolder = NonNullable<ProjectV1["resources"]["objectFolders"]>[number]
type SpriteFolder = NonNullable<ProjectV1["resources"]["spriteFolders"]>[number]
type ObjectEntry = ProjectV1["objects"][number]
type SpriteEntry = ProjectV1["resources"]["sprites"][number]

export type RoomEditMode = "objects" | "paintBackground"
export type RoomBackgroundPaintTool = "brush" | "eraser"

type RoomObjectPickerPanelProps = {
  objects: ObjectEntry[]
  objectFolders: ObjectFolder[]
  spriteFolders: SpriteFolder[]
  resolvedSpriteSources: Record<string, string>
  placingObjectId: string | null
  hasActiveRoom: boolean
  onTogglePlacement: (objectId: string) => void
  onDragStart: (event: ReactDragEvent, objectId: string) => void
  onDragEnd: () => void
  roomWidthInput: string
  roomHeightInput: string
  onRoomWidthInputChange: (value: string) => void
  onRoomHeightInputChange: (value: string) => void
  onCommitRoomSize: () => void
  backgroundSpriteId: string | null
  backgroundSprites: SpriteEntry[]
  onChangeBackgroundSprite: (spriteId: string | null) => void
  editMode: RoomEditMode
  onEditModeChange: (mode: RoomEditMode) => void
  paintTool: RoomBackgroundPaintTool
  onPaintToolChange: (tool: RoomBackgroundPaintTool) => void
  paintBrushSpriteId: string | null
  onPaintBrushSpriteChange: (spriteId: string | null) => void
  paintedStampCount: number
}

export function RoomObjectPickerPanel({
  objects,
  objectFolders,
  spriteFolders,
  resolvedSpriteSources,
  placingObjectId,
  hasActiveRoom,
  onTogglePlacement,
  onDragStart,
  onDragEnd,
  roomWidthInput,
  roomHeightInput,
  onRoomWidthInputChange,
  onRoomHeightInputChange,
  onCommitRoomSize,
  backgroundSpriteId,
  backgroundSprites,
  onChangeBackgroundSprite,
  editMode,
  onEditModeChange,
  paintTool,
  onPaintToolChange,
  paintBrushSpriteId,
  onPaintBrushSpriteChange,
  paintedStampCount,
}: RoomObjectPickerPanelProps) {
  const [expandedObjectFolderIds, setExpandedObjectFolderIds] = useState<Set<string>>(new Set())
  const [expandedSpriteFolderIds, setExpandedSpriteFolderIds] = useState<Set<string>>(new Set())
  const [isBackgroundSelectorOpen, setIsBackgroundSelectorOpen] = useState(false)
  const backgroundSelectorRef = useRef<HTMLDivElement | null>(null)

  const objectFoldersByParent = useMemo(
    () => buildFolderChildrenByParent<ObjectFolder>(objectFolders),
    [objectFolders]
  )
  const objectsByFolder = useMemo(() => buildEntriesByFolder<ObjectEntry>(objects), [objects])
  const spriteFoldersByParent = useMemo(
    () => buildFolderChildrenByParent<SpriteFolder>(spriteFolders),
    [spriteFolders]
  )
  const spritesByFolder = useMemo(
    () => buildEntriesByFolder<SpriteEntry>(backgroundSprites),
    [backgroundSprites]
  )
  const canPlaceObjects = hasActiveRoom && editMode === "objects"

  const selectedBackgroundSprite = useMemo(
    () => backgroundSprites.find((spriteEntry) => spriteEntry.id === backgroundSpriteId) ?? null,
    [backgroundSprites, backgroundSpriteId]
  )

  useEffect(() => {
    if (!isBackgroundSelectorOpen) {
      return
    }
    const handleMouseDown = (event: MouseEvent) => {
      if (backgroundSelectorRef.current && !backgroundSelectorRef.current.contains(event.target as Node)) {
        setIsBackgroundSelectorOpen(false)
      }
    }
    document.addEventListener("mousedown", handleMouseDown)
    return () => document.removeEventListener("mousedown", handleMouseDown)
  }, [isBackgroundSelectorOpen])

  useEffect(() => {
    if (!hasActiveRoom) {
      setIsBackgroundSelectorOpen(false)
    }
  }, [hasActiveRoom])

  useEffect(() => {
    if (editMode !== "paintBackground") {
      setIsBackgroundSelectorOpen(false)
    }
  }, [editMode])

  const toggleObjectFolder = (folderId: string) => {
    setExpandedObjectFolderIds((prev) => {
      const next = new Set(prev)
      if (next.has(folderId)) next.delete(folderId)
      else next.add(folderId)
      return next
    })
  }

  const toggleSpriteFolder = (folderId: string) => {
    setExpandedSpriteFolderIds((prev) => {
      const next = new Set(prev)
      if (next.has(folderId)) next.delete(folderId)
      else next.add(folderId)
      return next
    })
  }

  function renderObjectTree(parentId: string | null, depth: number) {
    const childFolders = objectFoldersByParent.get(parentId) ?? []
    const childObjects = objectsByFolder.get(parentId) ?? []

    return (
      <>
        {childFolders.map((folder) => {
          const isExpanded = expandedObjectFolderIds.has(folder.id)
          return (
            <div key={folder.id}>
              <div
                className="room-objpicker-folder-row group -mx-2 flex cursor-pointer items-center px-2 py-1 pr-2 transition-colors hover:bg-slate-100"
                style={{ paddingLeft: `${depth * 16 + 8}px` }}
                onClick={() => toggleObjectFolder(folder.id)}
              >
                <span className="mr-2 inline-flex h-5 w-5 shrink-0 items-center justify-center text-slate-400">
                  {isExpanded ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
                </span>
                <span className="truncate text-[12px] leading-tight text-slate-600">{folder.name}</span>
              </div>
              {isExpanded && renderObjectTree(folder.id, depth + 1)}
            </div>
          )
        })}

        {childObjects.map((obj) => (
          <button
            key={obj.id}
            type="button"
            className={`room-objpicker-item -mx-2 flex w-[calc(100%+16px)] items-center gap-2 rounded px-2 py-1.5 text-left text-[12px] leading-tight transition-colors ${
              placingObjectId === obj.id && canPlaceObjects
                ? "bg-white font-medium text-slate-900 ring-1 ring-slate-300"
                : canPlaceObjects
                  ? "text-slate-600 hover:bg-slate-100"
                  : "text-slate-400"
            }`}
            style={{ paddingLeft: `${depth * 16 + 8}px` }}
            onClick={() => onTogglePlacement(obj.id)}
            draggable={canPlaceObjects}
            onDragStart={(event) => onDragStart(event, obj.id)}
            onDragEnd={onDragEnd}
            title={`Add ${obj.name} to room`}
            disabled={!canPlaceObjects}
          >
            {obj.spriteId && resolvedSpriteSources[obj.spriteId] ? (
              <img
                src={resolvedSpriteSources[obj.spriteId]}
                alt=""
                className="mvp21-room-object-list-sprite-icon h-5 w-5 object-contain"
                style={{ imageRendering: "pixelated" }}
              />
            ) : (
              <Box
                className={`mvp22-room-object-list-fallback-icon h-3.5 w-3.5 ${
                  placingObjectId === obj.id && canPlaceObjects ? "text-blue-500" : "text-slate-400"
                }`}
              />
            )}
            <span className="truncate">{obj.name}</span>
            <Plus
              className={`ml-auto h-3 w-3 shrink-0 ${
                placingObjectId === obj.id && canPlaceObjects ? "text-blue-500" : "text-slate-300"
              }`}
            />
          </button>
        ))}
      </>
    )
  }

  function renderPaintSpriteTree(parentId: string | null, depth: number) {
    const childFolders = spriteFoldersByParent.get(parentId) ?? []
    const childSprites = spritesByFolder.get(parentId) ?? []

    return (
      <>
        {childFolders.map((folder) => {
          const isExpanded = expandedSpriteFolderIds.has(folder.id)
          return (
            <div key={folder.id}>
              <div
                className="room-objpicker-folder-row group -mx-2 flex cursor-pointer items-center px-2 py-1 pr-2 transition-colors hover:bg-slate-100"
                style={{ paddingLeft: `${depth * 16 + 8}px` }}
                onClick={() => toggleSpriteFolder(folder.id)}
              >
                <span className="mr-2 inline-flex h-5 w-5 shrink-0 items-center justify-center text-slate-400">
                  {isExpanded ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
                </span>
                <span className="truncate text-[12px] leading-tight text-slate-600">{folder.name}</span>
              </div>
              {isExpanded && renderPaintSpriteTree(folder.id, depth + 1)}
            </div>
          )
        })}

        {childSprites.map((spriteEntry) => {
          const isSelected = paintBrushSpriteId === spriteEntry.id
          return (
            <button
              key={spriteEntry.id}
              type="button"
              className={`room-paint-sprite-item -mx-2 flex w-[calc(100%+16px)] items-center gap-2 rounded px-2 py-1.5 text-left text-[12px] leading-tight transition-colors ${
                isSelected
                  ? "bg-white font-medium text-slate-900 ring-1 ring-slate-300"
                  : hasActiveRoom
                    ? "text-slate-600 hover:bg-slate-100"
                    : "text-slate-400"
              }`}
              style={{ paddingLeft: `${depth * 16 + 8}px` }}
              onClick={() => {
                onPaintBrushSpriteChange(spriteEntry.id)
                onPaintToolChange("brush")
              }}
              title={`Paint with ${spriteEntry.name}`}
              disabled={!hasActiveRoom}
            >
              {resolvedSpriteSources[spriteEntry.id] ? (
                <img
                  src={resolvedSpriteSources[spriteEntry.id]}
                  alt=""
                  className="h-5 w-5 object-contain"
                  style={{ imageRendering: "pixelated" }}
                />
              ) : (
                <Paintbrush className={`h-3.5 w-3.5 ${isSelected ? "text-blue-500" : "text-slate-400"}`} />
              )}
              <span className="truncate">{spriteEntry.name}</span>
              <Plus className={`ml-auto h-3 w-3 shrink-0 ${isSelected ? "text-blue-500" : "text-slate-300"}`} />
            </button>
          )
        })}
      </>
    )
  }

  return (
    <aside className="mvp3-room-object-picker-container flex w-[220px] shrink-0 flex-col overflow-hidden border-r border-slate-200 bg-slate-50">
      <div className="room-objpicker-header border-b border-slate-200 p-2">
        <div className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-slate-500">Mode</div>
        <div className="grid grid-cols-2 gap-1">
          <button
            type="button"
            className={`flex items-center justify-center gap-1 rounded px-2 py-1 text-[11px] ${
              editMode === "objects" ? "bg-white text-slate-800 ring-1 ring-slate-300" : "text-slate-600 hover:bg-slate-100"
            }`}
            disabled={!hasActiveRoom}
            onClick={() => onEditModeChange("objects")}
          >
            <Box className="h-3 w-3" />
            Objects
          </button>
          <button
            type="button"
            className={`flex items-center justify-center gap-1 rounded px-2 py-1 text-[11px] ${
              editMode === "paintBackground"
                ? "bg-white text-slate-800 ring-1 ring-slate-300"
                : "text-slate-600 hover:bg-slate-100"
            }`}
            disabled={!hasActiveRoom}
            onClick={() => onEditModeChange("paintBackground")}
          >
            <Paintbrush className="h-3 w-3" />
            Paint
          </button>
        </div>
      </div>

      <div className="room-objpicker-body flex flex-1 flex-col overflow-hidden">
        {editMode === "objects" ? (
          <>
            <div className="flex-1 overflow-y-auto p-2">
              <div className="flex flex-col gap-0.5">
                {objects.length === 0 && <p className="px-2 py-4 text-center text-xs text-slate-400">No objects</p>}
                {renderObjectTree(null, 0)}
              </div>
            </div>

            <div className="mvp23-room-attributes border-t border-slate-200">
              <div className="flex items-center justify-between border-b border-slate-200 p-3">
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Attributes</span>
              </div>
              <div className="space-y-2 p-3">
                <label className="flex items-center gap-2 text-xs text-slate-600">
                  <span className="w-16 font-medium text-slate-500">Width</span>
                  <input
                    type="number"
                    min={WINDOW_WIDTH}
                    step={1}
                    disabled={!hasActiveRoom}
                    className="h-7 min-w-0 flex-1 rounded border border-slate-300 bg-white px-2 text-xs focus:outline-none disabled:cursor-not-allowed disabled:bg-slate-100"
                    value={roomWidthInput}
                    onChange={(event) => onRoomWidthInputChange(event.target.value)}
                    onBlur={onCommitRoomSize}
                    onKeyDown={(event) => {
                      if (event.key === "Enter") {
                        event.currentTarget.blur()
                      }
                    }}
                  />
                  <span className="text-xs text-slate-400">px</span>
                </label>
                <label className="flex items-center gap-2 text-xs text-slate-600">
                  <span className="w-16 font-medium text-slate-500">Height</span>
                  <input
                    type="number"
                    min={WINDOW_HEIGHT}
                    step={1}
                    disabled={!hasActiveRoom}
                    className="h-7 min-w-0 flex-1 rounded border border-slate-300 bg-white px-2 text-xs focus:outline-none disabled:cursor-not-allowed disabled:bg-slate-100"
                    value={roomHeightInput}
                    onChange={(event) => onRoomHeightInputChange(event.target.value)}
                    onBlur={onCommitRoomSize}
                    onKeyDown={(event) => {
                      if (event.key === "Enter") {
                        event.currentTarget.blur()
                      }
                    }}
                  />
                  <span className="text-xs text-slate-400">px</span>
                </label>
              </div>
            </div>
          </>
        ) : (
          <>
            <div className="flex-1 overflow-y-auto p-2">
              <div className="flex flex-col gap-0.5">
                {backgroundSprites.length === 0 && spriteFolders.length === 0 && (
                  <p className="px-2 py-4 text-center text-xs text-slate-400">No sprites</p>
                )}
                {renderPaintSpriteTree(null, 0)}
              </div>
            </div>

            <div className="room-paint-tools border-t border-slate-200">
              <div className="flex items-center justify-between border-b border-slate-200 p-3">
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Tools</span>
                <span className="text-[10px] text-slate-400">{paintedStampCount} stamps</span>
              </div>
              <div className="space-y-2 p-3">
                <div className="relative" ref={backgroundSelectorRef}>
                  <span className="mb-1 block text-xs font-medium text-slate-500">Background</span>
                  <button
                    type="button"
                    className="flex h-8 w-full items-center gap-2 rounded border border-slate-300 bg-white px-2 text-left text-xs text-slate-700 focus:outline-none disabled:cursor-not-allowed disabled:bg-slate-100"
                    disabled={!hasActiveRoom}
                    onClick={() => setIsBackgroundSelectorOpen((current) => !current)}
                    aria-expanded={isBackgroundSelectorOpen}
                    aria-haspopup="listbox"
                  >
                    {selectedBackgroundSprite && resolvedSpriteSources[selectedBackgroundSprite.id] ? (
                      <img
                        src={resolvedSpriteSources[selectedBackgroundSprite.id]}
                        alt=""
                        className="h-4 w-4 object-contain"
                        style={{ imageRendering: "pixelated" }}
                      />
                    ) : (
                      <Box className="h-3.5 w-3.5 text-slate-400" />
                    )}
                    <span className="truncate">{selectedBackgroundSprite?.name ?? "No background"}</span>
                    <ChevronDown className="ml-auto h-3.5 w-3.5 text-slate-400" />
                  </button>
                  {isBackgroundSelectorOpen && (
                    <div className="absolute bottom-[calc(100%+4px)] left-0 right-0 z-30 max-h-56 overflow-y-auto rounded border border-slate-200 bg-white shadow-lg">
                      <button
                        type="button"
                        className="flex w-full items-center gap-1.5 px-2 py-1.5 text-left text-xs text-slate-700 hover:bg-slate-50"
                        onClick={() => {
                          onChangeBackgroundSprite(null)
                          setIsBackgroundSelectorOpen(false)
                        }}
                      >
                        <Box className="h-3 w-3 text-slate-400" />
                        <span className="truncate">No background</span>
                        {backgroundSpriteId === null && <Check className="ml-auto h-3 w-3 text-slate-400" />}
                      </button>
                      {backgroundSprites.map((spriteEntry) => (
                        <button
                          key={spriteEntry.id}
                          type="button"
                          className="flex w-full items-center gap-1.5 px-2 py-1.5 text-left text-xs text-slate-700 hover:bg-slate-50"
                          onClick={() => {
                            onChangeBackgroundSprite(spriteEntry.id)
                            setIsBackgroundSelectorOpen(false)
                          }}
                        >
                          {resolvedSpriteSources[spriteEntry.id] ? (
                            <img
                              src={resolvedSpriteSources[spriteEntry.id]}
                              alt=""
                              className="h-3.5 w-3.5 object-contain"
                              style={{ imageRendering: "pixelated" }}
                            />
                          ) : (
                            <Box className="h-3 w-3 text-slate-400" />
                          )}
                          <span className="truncate">{spriteEntry.name}</span>
                          {spriteEntry.id === backgroundSpriteId && <Check className="ml-auto h-3 w-3 text-slate-400" />}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                <button
                  type="button"
                  className={`flex h-8 w-full items-center justify-center gap-1 rounded border px-2 text-xs ${
                    paintTool === "eraser"
                      ? "border-slate-300 bg-slate-100 text-slate-800"
                      : "border-slate-300 bg-white text-slate-700 hover:bg-slate-50"
                  }`}
                  disabled={!hasActiveRoom}
                  onClick={() => onPaintToolChange(paintTool === "eraser" ? "brush" : "eraser")}
                >
                  <Eraser className="h-3.5 w-3.5" />
                  Eraser
                </button>

              </div>
            </div>
          </>
        )}
      </div>
    </aside>
  )
}
