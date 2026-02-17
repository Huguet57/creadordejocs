import {
  Box,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  FolderPlus,
  Pencil,
  Plus,
  Trash2
} from "lucide-react"
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ChangeEvent,
  type DragEvent,
  type KeyboardEvent,
  type MouseEvent
} from "react"
import { Button } from "../../components/ui/button.js"
import type { ProjectV1 } from "@creadordejocs/project-format"

type ObjectFolder = NonNullable<ProjectV1["resources"]["objectFolders"]>[number]

type ContextMenuState = {
  x: number
  y: number
  objectId: string | null
  folderId: string | null
} | null

type DragItem = { type: "object"; id: string } | { type: "folder"; id: string } | null

type ObjectListPanelProps = {
  objects: ProjectV1["objects"]
  objectFolders: ObjectFolder[]
  activeObjectId: string | null
  spriteSources: Record<string, string>
  onSelectObject: (id: string) => void
  onOpenInNewTab: (id: string) => void
  onAddObject: (name: string, folderId: string | null) => void
  onDeleteObject: (id: string) => void
  onCreateFolder: (name: string, parentId: string | null) => string | null
  onRenameFolder: (folderId: string, name: string) => boolean
  onDeleteFolder: (folderId: string) => boolean
  onMoveFolder: (folderId: string, newParentId: string | null) => boolean
  onMoveObjectToFolder: (objectId: string, folderId: string | null) => boolean
}

function isDescendantOf(folderId: string, ancestorId: string, folders: ObjectFolder[]): boolean {
  let current = folderId
  const visited = new Set<string>()
  while (current) {
    if (visited.has(current)) return false
    visited.add(current)
    if (current === ancestorId) return true
    const folder = folders.find((f) => f.id === current)
    if (!folder?.parentId) return false
    current = folder.parentId
  }
  return false
}

export function ObjectListPanel({
  objects,
  objectFolders,
  activeObjectId,
  spriteSources,
  onSelectObject,
  onOpenInNewTab,
  onAddObject,
  onDeleteObject,
  onCreateFolder,
  onRenameFolder,
  onDeleteFolder,
  onMoveFolder,
  onMoveObjectToFolder
}: ObjectListPanelProps) {
  const [isCollapsed, setIsCollapsed] = useState(false)
  const [isAdding, setIsAdding] = useState(false)
  const [addingInFolderId, setAddingInFolderId] = useState<string | null>(null)
  const [newObjectName, setNewObjectName] = useState("Objecte nou")
  const [contextMenu, setContextMenu] = useState<ContextMenuState>(null)
  const contextMenuRef = useRef<HTMLDivElement>(null)

  const [expandedFolderIds, setExpandedFolderIds] = useState<Set<string>>(new Set())
  const [renamingFolderId, setRenamingFolderId] = useState<string | null>(null)
  const [renamingValue, setRenamingValue] = useState("")

  const dragItemRef = useRef<DragItem>(null)
  const [dropTargetFolderId, setDropTargetFolderId] = useState<string | null>(null)
  const [dropTargetIsRoot, setDropTargetIsRoot] = useState(false)
  const autoExpandTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const inputCallbackRef = useCallback((node: HTMLInputElement | null) => {
    if (node) node.select()
  }, [])

  const renameInputCallbackRef = useCallback((node: HTMLInputElement | null) => {
    if (node) node.select()
  }, [])

  const blockUndoShortcuts = (event: KeyboardEvent<HTMLInputElement>): void => {
    if ((event.metaKey || event.ctrlKey) && (event.key.toLowerCase() === "z" || event.key.toLowerCase() === "y")) {
      event.preventDefault()
    }
  }

  const startAddingObject = (inFolderId: string | null = null) => {
    setAddingInFolderId(inFolderId)
    setNewObjectName("Objecte nou")
    setIsAdding(true)
  }

  const handleAddObject = () => {
    if (!newObjectName.trim()) return
    onAddObject(newObjectName, addingInFolderId)
    setNewObjectName("Objecte nou")
    setIsAdding(false)
    setAddingInFolderId(null)
  }

  const createFolder = (parentId: string | null) => {
    const createdFolderId = onCreateFolder("New folder", parentId)
    if (!createdFolderId) return
    setExpandedFolderIds((prev) => new Set(prev).add(createdFolderId))
    if (parentId) {
      setExpandedFolderIds((prev) => new Set(prev).add(parentId))
    }
    setRenamingFolderId(createdFolderId)
    setRenamingValue("New folder")
  }

  const renameFolder = (folderId: string, name: string) => {
    const trimmed = name.trim()
    if (!trimmed) return
    const renamed = onRenameFolder(folderId, trimmed)
    if (!renamed) return
    setRenamingFolderId(null)
  }

  const deleteFolder = (folderId: string) => {
    onDeleteFolder(folderId)
  }

  const toggleFolder = (folderId: string) => {
    setExpandedFolderIds((prev) => {
      const next = new Set(prev)
      if (next.has(folderId)) next.delete(folderId)
      else next.add(folderId)
      return next
    })
  }

  const openContextMenu = (e: MouseEvent, objectId: string | null, folderId: string | null) => {
    e.preventDefault()
    e.stopPropagation()
    setContextMenu({ x: e.clientX, y: e.clientY, objectId, folderId })
  }

  const closeContextMenu = () => setContextMenu(null)

  useEffect(() => {
    if (!contextMenu) return
    const handleClick = (e: globalThis.MouseEvent) => {
      if (contextMenuRef.current && !contextMenuRef.current.contains(e.target as Node)) {
        closeContextMenu()
      }
    }
    const handleEscape = (e: globalThis.KeyboardEvent) => {
      if (e.key === "Escape") closeContextMenu()
    }
    document.addEventListener("mousedown", handleClick)
    document.addEventListener("keydown", handleEscape)
    return () => {
      document.removeEventListener("mousedown", handleClick)
      document.removeEventListener("keydown", handleEscape)
    }
  }, [contextMenu])

  const handleDragStart = (e: DragEvent, item: DragItem) => {
    dragItemRef.current = item
    e.dataTransfer.effectAllowed = "move"
    e.dataTransfer.setData("text/plain", "")
  }

  const handleDragEnd = () => {
    dragItemRef.current = null
    setDropTargetFolderId(null)
    setDropTargetIsRoot(false)
    if (autoExpandTimerRef.current) {
      clearTimeout(autoExpandTimerRef.current)
      autoExpandTimerRef.current = null
    }
  }

  const handleFolderDragOver = (e: DragEvent, folderId: string) => {
    e.preventDefault()
    e.stopPropagation()
    e.dataTransfer.dropEffect = "move"

    const dragged = dragItemRef.current
    if (!dragged) return
    if (dragged.type === "folder" && (dragged.id === folderId || isDescendantOf(folderId, dragged.id, objectFolders))) {
      e.dataTransfer.dropEffect = "none"
      return
    }

    if (dropTargetFolderId !== folderId) {
      setDropTargetFolderId(folderId)
      setDropTargetIsRoot(false)
      if (autoExpandTimerRef.current) clearTimeout(autoExpandTimerRef.current)
      autoExpandTimerRef.current = setTimeout(() => {
        setExpandedFolderIds((prev) => new Set(prev).add(folderId))
      }, 500)
    }
  }

  const handleFolderDrop = (e: DragEvent, folderId: string) => {
    e.preventDefault()
    e.stopPropagation()
    const dragged = dragItemRef.current
    if (!dragged) return
    if (dragged.type === "folder" && (dragged.id === folderId || isDescendantOf(folderId, dragged.id, objectFolders))) {
      return
    }

    if (dragged.type === "object") onMoveObjectToFolder(dragged.id, folderId)
    else onMoveFolder(dragged.id, folderId)

    setExpandedFolderIds((prev) => new Set(prev).add(folderId))
    handleDragEnd()
  }

  const handleRootDragOver = (e: DragEvent) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = "move"
    setDropTargetFolderId(null)
    setDropTargetIsRoot(true)
    if (autoExpandTimerRef.current) {
      clearTimeout(autoExpandTimerRef.current)
      autoExpandTimerRef.current = null
    }
  }

  const handleRootDrop = (e: DragEvent) => {
    e.preventDefault()
    const dragged = dragItemRef.current
    if (!dragged) return
    if (dragged.type === "object") onMoveObjectToFolder(dragged.id, null)
    else onMoveFolder(dragged.id, null)
    handleDragEnd()
  }

  const handleDragLeave = (e: DragEvent) => {
    const relatedTarget = e.relatedTarget as Node | null
    if (relatedTarget && (e.currentTarget as Node).contains(relatedTarget)) return
    setDropTargetFolderId(null)
    setDropTargetIsRoot(false)
    if (autoExpandTimerRef.current) {
      clearTimeout(autoExpandTimerRef.current)
      autoExpandTimerRef.current = null
    }
  }

  const getChildFolders = (parentId: string | null) =>
    objectFolders.filter((f) => (f.parentId ?? null) === parentId).sort((a, b) => a.name.localeCompare(b.name))

  const getChildObjects = (folderId: string | null) =>
    objects
      .filter((o) => (o.folderId ?? null) === folderId)
      .sort((a, b) => a.name.localeCompare(b.name))

  function renderTree(parentId: string | null, depth: number) {
    const childFolders = getChildFolders(parentId)
    const childObjects = getChildObjects(parentId)

    return (
      <>
        {childFolders.map((folder) => {
          const isExpanded = expandedFolderIds.has(folder.id)
          const isRenaming = renamingFolderId === folder.id
          const isDropTarget = dropTargetFolderId === folder.id
          return (
            <div key={folder.id}>
              <div
                className={`objlist-folder-row group flex cursor-pointer items-center rounded py-1 pr-2 transition-colors ${
                  isDropTarget ? "bg-blue-50 ring-1 ring-blue-300" : "hover:bg-slate-100"
                }`}
                style={{ paddingLeft: `${depth * 16 + 4}px` }}
                draggable={!isRenaming}
                onDragStart={(e) => handleDragStart(e, { type: "folder", id: folder.id })}
                onDragEnd={handleDragEnd}
                onDragOver={(e) => handleFolderDragOver(e, folder.id)}
                onDragLeave={handleDragLeave}
                onDrop={(e) => handleFolderDrop(e, folder.id)}
                onClick={() => toggleFolder(folder.id)}
                onContextMenu={(e) => openContextMenu(e, null, folder.id)}
              >
                <span className="objlist-folder-chevron mr-0.5 shrink-0 text-slate-400">
                  {isExpanded ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
                </span>
                {isRenaming ? (
                  <input
                    ref={renameInputCallbackRef}
                    className="objlist-folder-rename-input h-5 w-full rounded border border-slate-300 bg-white px-1 text-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-slate-400"
                    value={renamingValue}
                    onChange={(e: ChangeEvent<HTMLInputElement>) => setRenamingValue(e.target.value)}
                    onKeyDown={(e: KeyboardEvent<HTMLInputElement>) => {
                      blockUndoShortcuts(e)
                      if (e.key === "Enter") renameFolder(folder.id, renamingValue)
                      if (e.key === "Escape") setRenamingFolderId(null)
                      e.stopPropagation()
                    }}
                    onBlur={() => renameFolder(folder.id, renamingValue)}
                    onClick={(e) => e.stopPropagation()}
                  />
                ) : (
                  <span
                    className="truncate text-sm text-slate-600"
                    onDoubleClick={(e) => {
                      e.stopPropagation()
                      setRenamingFolderId(folder.id)
                      setRenamingValue(folder.name)
                    }}
                  >
                    {folder.name}
                  </span>
                )}
              </div>
              {isExpanded && renderTree(folder.id, depth + 1)}
            </div>
          )
        })}

        {childObjects.map((objectEntry) => {
          const isActive = activeObjectId === objectEntry.id
          return (
            <div
              key={objectEntry.id}
              className={`objlist-item group flex cursor-pointer items-center rounded py-1.5 pr-2 transition-colors ${
                isActive ? "bg-white shadow-sm ring-1 ring-blue-200" : "hover:bg-slate-100"
              }`}
              style={{ paddingLeft: `${depth * 16 + 8}px` }}
              draggable
              onDragStart={(e) => handleDragStart(e, { type: "object", id: objectEntry.id })}
              onDragEnd={handleDragEnd}
              onClick={() => onSelectObject(objectEntry.id)}
              onContextMenu={(e) => openContextMenu(e, objectEntry.id, null)}
            >
              <div className="flex flex-1 items-center gap-2 text-left text-sm min-w-0">
                {objectEntry.spriteId && spriteSources[objectEntry.spriteId] ? (
                  <img
                    src={spriteSources[objectEntry.spriteId]}
                    alt=""
                    className="objlist-sprite-icon h-5 w-5 shrink-0 object-contain"
                    style={{ imageRendering: "pixelated" }}
                  />
                ) : (
                  <Box className={`h-3.5 w-3.5 shrink-0 ${isActive ? "text-blue-500" : "text-slate-400"}`} />
                )}
                <span className={`truncate ${isActive ? "font-medium text-slate-900" : "text-slate-600"}`}>
                  {objectEntry.name}
                </span>
              </div>
            </div>
          )
        })}

        {isAdding && addingInFolderId === parentId && (
          <div className="objlist-add-form-inline flex gap-1.5 py-1 pr-2" style={{ paddingLeft: `${depth * 16 + 8}px` }}>
            <input
              ref={inputCallbackRef}
              value={newObjectName}
              onChange={(e: ChangeEvent<HTMLInputElement>) => setNewObjectName(e.target.value)}
              onKeyDown={(e: KeyboardEvent<HTMLInputElement>) => {
                blockUndoShortcuts(e)
                if (e.key === "Enter") handleAddObject()
                if (e.key === "Escape") {
                  setIsAdding(false)
                  setAddingInFolderId(null)
                }
              }}
              className="flex h-7 w-full rounded-md border border-slate-300 bg-white px-2 py-1 text-xs shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400"
              placeholder="Name..."
            />
            <Button size="sm" className="objlist-add-confirm h-7 w-7 shrink-0 px-0" onClick={handleAddObject} title="Add object">
              <Plus className="h-3.5 w-3.5" />
            </Button>
          </div>
        )}
      </>
    )
  }

  function renderContextMenu() {
    if (!contextMenu) return null
    const { objectId, folderId } = contextMenu

    return (
      <div
        ref={contextMenuRef}
        className="objlist-context-menu fixed z-50 min-w-[160px] rounded-md border border-slate-200 bg-white py-1 shadow-lg"
        style={{ left: contextMenu.x, top: contextMenu.y }}
      >
        {objectId ? (
          <>
            <button
              type="button"
              className="objlist-ctx-open flex w-full items-center gap-2 px-3 py-1.5 text-left text-xs text-slate-700 transition-colors hover:bg-slate-100"
              onClick={() => {
                onSelectObject(objectId)
                closeContextMenu()
              }}
            >
              <Box className="h-3.5 w-3.5 text-slate-400" />
              Open
            </button>
            <button
              type="button"
              className="objlist-ctx-open-tab flex w-full items-center gap-2 px-3 py-1.5 text-left text-xs text-slate-700 transition-colors hover:bg-slate-100"
              onClick={() => {
                onOpenInNewTab(objectId)
                closeContextMenu()
              }}
            >
              <Plus className="h-3.5 w-3.5 text-slate-400" />
              Open in a new tab
            </button>
            <div className="my-1 border-t border-slate-100" />
            <button
              type="button"
              className="objlist-ctx-delete flex w-full items-center gap-2 px-3 py-1.5 text-left text-xs text-red-600 transition-colors hover:bg-red-50"
              onClick={() => {
                onDeleteObject(objectId)
                closeContextMenu()
              }}
            >
              <Trash2 className="h-3.5 w-3.5" />
              Delete
            </button>
          </>
        ) : folderId ? (
          <>
            <button
              type="button"
              className="objlist-ctx-rename flex w-full items-center gap-2 px-3 py-1.5 text-left text-xs text-slate-700 transition-colors hover:bg-slate-100"
              onClick={() => {
                const folder = objectFolders.find((entry) => entry.id === folderId)
                if (folder) {
                  setRenamingFolderId(folderId)
                  setRenamingValue(folder.name)
                }
                closeContextMenu()
              }}
            >
              <Pencil className="h-3.5 w-3.5 text-slate-400" />
              Rename
            </button>
            <button
              type="button"
              className="objlist-ctx-subfolder flex w-full items-center gap-2 px-3 py-1.5 text-left text-xs text-slate-700 transition-colors hover:bg-slate-100"
              onClick={() => {
                createFolder(folderId)
                closeContextMenu()
              }}
            >
              <FolderPlus className="h-3.5 w-3.5 text-slate-400" />
              New subfolder
            </button>
            <button
              type="button"
              className="objlist-ctx-add-in-folder flex w-full items-center gap-2 px-3 py-1.5 text-left text-xs text-slate-700 transition-colors hover:bg-slate-100"
              onClick={() => {
                setExpandedFolderIds((prev) => new Set(prev).add(folderId))
                startAddingObject(folderId)
                closeContextMenu()
              }}
            >
              <Plus className="h-3.5 w-3.5 text-slate-400" />
              New object here
            </button>
            <div className="my-1 border-t border-slate-100" />
            <button
              type="button"
              className="objlist-ctx-delete-folder flex w-full items-center gap-2 px-3 py-1.5 text-left text-xs text-red-600 transition-colors hover:bg-red-50"
              onClick={() => {
                deleteFolder(folderId)
                closeContextMenu()
              }}
            >
              <Trash2 className="h-3.5 w-3.5" />
              Delete folder
            </button>
          </>
        ) : (
          <>
            <button
              type="button"
              className="objlist-ctx-new flex w-full items-center gap-2 px-3 py-1.5 text-left text-xs text-slate-700 transition-colors hover:bg-slate-100"
              onClick={() => {
                startAddingObject(null)
                closeContextMenu()
              }}
            >
              <Plus className="h-3.5 w-3.5 text-slate-400" />
              New object
            </button>
            <button
              type="button"
              className="objlist-ctx-new-folder flex w-full items-center gap-2 px-3 py-1.5 text-left text-xs text-slate-700 transition-colors hover:bg-slate-100"
              onClick={() => {
                createFolder(null)
                closeContextMenu()
              }}
            >
              <FolderPlus className="h-3.5 w-3.5 text-slate-400" />
              New folder
            </button>
          </>
        )}
      </div>
    )
  }

  return (
    <aside
      className={`mvp3-object-list-panel flex shrink-0 flex-col bg-slate-50 overflow-hidden transition-[width] duration-200 ease-in-out ${
        isCollapsed ? "w-10" : "w-[200px]"
      }`}
    >
      <div className={`objlist-header flex items-center border-b border-slate-200 px-1.5 py-1.5 ${isCollapsed ? "justify-center" : "justify-between"}`}>
        {isCollapsed ? (
          <div className="flex flex-col items-center gap-1">
            <button
              type="button"
              className="objlist-expand-btn inline-flex h-7 w-7 items-center justify-center rounded text-slate-400 transition-colors hover:bg-slate-200 hover:text-slate-700"
              onClick={() => setIsCollapsed(false)}
              title="Expand object list"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
            <button
              type="button"
              className="objlist-add-btn-collapsed inline-flex h-7 w-7 items-center justify-center rounded text-slate-400 transition-colors hover:bg-slate-200 hover:text-slate-700"
              onClick={() => {
                setIsCollapsed(false)
                startAddingObject(null)
              }}
              title="Add object"
            >
              <Plus className="h-4 w-4" />
            </button>
          </div>
        ) : (
          <>
            <div className="flex items-center gap-0.5">
              <button
                type="button"
                className="objlist-add-btn inline-flex h-7 w-7 items-center justify-center rounded text-slate-400 transition-colors hover:bg-slate-200 hover:text-slate-700"
                onClick={() => startAddingObject(null)}
                title="Add object"
              >
                <Plus className="h-4 w-4" />
              </button>
              <button
                type="button"
                className="objlist-add-folder-btn inline-flex h-7 w-7 items-center justify-center rounded text-slate-400 transition-colors hover:bg-slate-200 hover:text-slate-700"
                onClick={() => createFolder(null)}
                title="New folder"
              >
                <FolderPlus className="h-4 w-4" />
              </button>
            </div>
            <button
              type="button"
              className="objlist-collapse-btn inline-flex h-7 w-7 items-center justify-center rounded text-slate-400 transition-colors hover:bg-slate-200 hover:text-slate-700"
              onClick={() => setIsCollapsed(true)}
              title="Collapse object list"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
          </>
        )}
      </div>

      {!isCollapsed && (
        <div
          className={`flex-1 overflow-y-auto p-2 ${dropTargetIsRoot ? "bg-blue-50/50" : ""}`}
          onContextMenu={(e) => openContextMenu(e, null, null)}
          onDragOver={handleRootDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleRootDrop}
        >
          <div className="flex flex-col gap-0.5">
            {objects.length === 0 && objectFolders.length === 0 && !isAdding && (
              <p className="px-2 py-4 text-center text-xs text-slate-400">Right-click or press + to add</p>
            )}
            {renderTree(null, 0)}
          </div>
        </div>
      )}

      {renderContextMenu()}
    </aside>
  )
}
