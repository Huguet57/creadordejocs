import {
  Box,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Plus
} from "lucide-react"
import { useMemo, useState, type DragEvent as ReactDragEvent } from "react"
import type { ProjectV1 } from "@creadordejocs/project-format"
import { EditorSidebarLayout } from "../shared/editor-sidebar/EditorSidebarLayout.js"
import { buildEntriesByFolder, buildFolderChildrenByParent } from "../shared/editor-sidebar/tree-utils.js"

type ObjectFolder = NonNullable<ProjectV1["resources"]["objectFolders"]>[number]
type ObjectEntry = ProjectV1["objects"][number]

type RoomObjectPickerPanelProps = {
  objects: ObjectEntry[]
  objectFolders: ObjectFolder[]
  resolvedSpriteSources: Record<string, string>
  placingObjectId: string | null
  hasActiveRoom: boolean
  onTogglePlacement: (objectId: string) => void
  onDragStart: (event: ReactDragEvent, objectId: string) => void
  onDragEnd: () => void
  showGrid: boolean
  onToggleGrid: (show: boolean) => void
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
  showGrid,
  onToggleGrid
}: RoomObjectPickerPanelProps) {
  const [isCollapsed, setIsCollapsed] = useState(false)
  const [expandedFolderIds, setExpandedFolderIds] = useState<Set<string>>(new Set())

  const foldersByParent = useMemo(() => buildFolderChildrenByParent<ObjectFolder>(objectFolders), [objectFolders])
  const objectsByFolder = useMemo(() => buildEntriesByFolder<ObjectEntry>(objects), [objects])

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
            className={`room-objpicker-item -mx-2 flex w-[calc(100%+16px)] items-center gap-2 rounded px-2 py-1.5 text-left text-sm transition-colors ${
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
    <EditorSidebarLayout
      classNamePrefix="mvp3-room-object-picker"
      isCollapsed={isCollapsed}
      expandedWidthClass="w-[180px]"
      header={
        <div className={`room-objpicker-header flex items-center border-b border-slate-200 px-1.5 py-1.5 ${isCollapsed ? "justify-center" : "justify-between"}`}>
          {isCollapsed ? (
            <button
              type="button"
              className="room-objpicker-expand-btn inline-flex h-7 w-7 items-center justify-center rounded text-slate-400 transition-colors hover:bg-slate-200 hover:text-slate-700"
              onClick={() => setIsCollapsed(false)}
              title="Expand object picker"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          ) : (
            <>
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider pl-1">Add objects</span>
              <button
                type="button"
                className="room-objpicker-collapse-btn inline-flex h-7 w-7 items-center justify-center rounded text-slate-400 transition-colors hover:bg-slate-200 hover:text-slate-700"
                onClick={() => setIsCollapsed(true)}
                title="Collapse object picker"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
            </>
          )}
        </div>
      }
      body={
        <div className="room-objpicker-body flex flex-1 flex-col overflow-hidden">
          <div className="flex-1 overflow-y-auto p-2">
            <div className="flex flex-col gap-0.5">
              {objects.length === 0 && (
                <p className="px-2 py-4 text-center text-xs text-slate-400">No objects</p>
              )}
              {renderTree(null, 0)}
            </div>
          </div>

          <div className="mvp19-room-options border-t border-slate-200">
            <div className="flex items-center justify-between border-b border-slate-200 p-3">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Options</span>
            </div>
            <div className="p-3">
              <label className="mvp19-room-grid-toggle flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={showGrid}
                  onChange={(e) => onToggleGrid(e.target.checked)}
                  className="h-3.5 w-3.5 rounded border-slate-300 text-blue-500 focus:ring-blue-400"
                />
                <span className="text-xs text-slate-600">Show grid</span>
              </label>
            </div>
          </div>
        </div>
      }
    />
  )
}
