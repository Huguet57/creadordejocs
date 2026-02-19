import {
  Box,
  Check,
  ChevronDown,
  ChevronRight,
  Plus
} from "lucide-react"
import { useEffect, useMemo, useRef, useState, type DragEvent as ReactDragEvent } from "react"
import type { ProjectV1 } from "@creadordejocs/project-format"
import { WINDOW_HEIGHT, WINDOW_WIDTH } from "../editor-state/runtime-types.js"
import { buildEntriesByFolder, buildFolderChildrenByParent } from "../shared/editor-sidebar/tree-utils.js"

type ObjectFolder = NonNullable<ProjectV1["resources"]["objectFolders"]>[number]
type ObjectEntry = ProjectV1["objects"][number]
type SpriteEntry = ProjectV1["resources"]["sprites"][number]

type RoomObjectPickerPanelProps = {
  objects: ObjectEntry[]
  objectFolders: ObjectFolder[]
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
}

export function RoomObjectPickerPanel({
  objects,
  objectFolders,
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
  onChangeBackgroundSprite
}: RoomObjectPickerPanelProps) {
  const [expandedFolderIds, setExpandedFolderIds] = useState<Set<string>>(new Set())
  const [isBackgroundSelectorOpen, setIsBackgroundSelectorOpen] = useState(false)
  const backgroundSelectorRef = useRef<HTMLDivElement | null>(null)

  const foldersByParent = useMemo(() => buildFolderChildrenByParent<ObjectFolder>(objectFolders), [objectFolders])
  const objectsByFolder = useMemo(() => buildEntriesByFolder<ObjectEntry>(objects), [objects])

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

  const toggleFolder = (folderId: string) => {
    setExpandedFolderIds((prev) => {
      const next = new Set(prev)
      if (next.has(folderId)) next.delete(folderId)
      else next.add(folderId)
      return next
    })
  }

  function renderTree(parentId: string | null, depth: number) {
    const childFolders = foldersByParent.get(parentId) ?? []
    const childObjects = objectsByFolder.get(parentId) ?? []

    return (
      <>
        {childFolders.map((folder) => {
          const isExpanded = expandedFolderIds.has(folder.id)
          return (
            <div key={folder.id}>
              <div
                className="room-objpicker-folder-row group -mx-2 flex cursor-pointer items-center px-2 py-1 pr-2 transition-colors hover:bg-slate-100"
                style={{ paddingLeft: `${depth * 16 + 8}px` }}
                onClick={() => toggleFolder(folder.id)}
              >
                <span className="mr-2 inline-flex h-5 w-5 shrink-0 items-center justify-center text-slate-400">
                  {isExpanded ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
                </span>
                <span className="truncate text-[12px] leading-tight text-slate-600">
                  {folder.name}
                </span>
              </div>
              {isExpanded && renderTree(folder.id, depth + 1)}
            </div>
          )
        })}

        {childObjects.map((obj) => (
          <button
            key={obj.id}
            type="button"
            className={`room-objpicker-item -mx-2 flex w-[calc(100%+16px)] items-center gap-2 rounded px-2 py-1.5 text-left text-[12px] leading-tight transition-colors ${
              placingObjectId === obj.id
                ? "bg-white font-medium text-slate-900 ring-1 ring-slate-300"
                : "text-slate-600 hover:bg-slate-100"
            }`}
            style={{ paddingLeft: `${depth * 16 + 8}px` }}
            onClick={() => onTogglePlacement(obj.id)}
            draggable={hasActiveRoom}
            onDragStart={(event) => onDragStart(event, obj.id)}
            onDragEnd={onDragEnd}
            title={`Add ${obj.name} to room`}
            disabled={!hasActiveRoom}
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
                  placingObjectId === obj.id ? "text-blue-500" : "text-slate-400"
                }`}
              />
            )}
            <span className="truncate">{obj.name}</span>
            <Plus className={`ml-auto h-3 w-3 shrink-0 ${placingObjectId === obj.id ? "text-blue-500" : "text-slate-300"}`} />
          </button>
        ))}
      </>
    )
  }

  return (
    <aside className="mvp3-room-object-picker-container flex w-[220px] shrink-0 flex-col overflow-hidden border-r border-slate-200 bg-slate-50">
      <div className="room-objpicker-header flex items-center border-b border-slate-200 p-3">
        <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Add objects</span>
      </div>

      <div className="room-objpicker-body flex flex-1 flex-col overflow-hidden">
        <div className="flex-1 overflow-y-auto p-2">
          <div className="flex flex-col gap-0.5">
            {objects.length === 0 && (
              <p className="px-2 py-4 text-center text-xs text-slate-400">No objects</p>
            )}
            {renderTree(null, 0)}
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
                <div className="absolute bottom-[calc(100%+4px)] left-0 z-30 max-h-56 w-full overflow-y-auto rounded border border-slate-200 bg-white shadow-lg">
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
          </div>
        </div>

      </div>
    </aside>
  )
}
