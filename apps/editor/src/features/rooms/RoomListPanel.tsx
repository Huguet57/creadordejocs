import {
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  FolderPlus,
  Grid3X3,
  Pencil,
  Plus,
  Trash2
} from "lucide-react"
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
  type DragEvent,
  type KeyboardEvent,
  type MouseEvent
} from "react"
import type { ProjectV1 } from "@creadordejocs/project-format"
import { EditorSidebarLayout } from "../shared/editor-sidebar/EditorSidebarLayout.js"
import { buildEntriesByFolder, buildFolderChildrenByParent, isFolderDescendant } from "../shared/editor-sidebar/tree-utils.js"

type RoomFolder = NonNullable<ProjectV1["resources"]["roomFolders"]>[number]
type RoomEntry = ProjectV1["rooms"][number]

type ContextMenuState = {
  x: number
  y: number
  roomId: string | null
  folderId: string | null
} | null

type DragItem = { type: "room"; id: string } | { type: "folder"; id: string } | null

type RoomListPanelProps = {
  rooms: RoomEntry[]
  roomFolders: RoomFolder[]
  activeRoomId: string | null
  onSelectRoom: (id: string) => void
  onPinRoom: (id: string) => void
  onOpenInNewTab: (id: string) => void
  onAddRoom: (name: string, folderId: string | null) => void
  onRenameRoom: (roomId: string, name: string) => boolean
  onDeleteRoom: (id: string) => void
  onCreateFolder: (name: string, parentId: string | null) => string | null
  onRenameFolder: (folderId: string, name: string) => boolean
  onDeleteFolder: (folderId: string) => boolean
  onMoveFolder: (folderId: string, newParentId: string | null) => boolean
  onMoveRoomToFolder: (roomId: string, folderId: string | null) => boolean
}

export function RoomListPanel({
  rooms,
  roomFolders,
  activeRoomId,
  onSelectRoom,
  onPinRoom,
  onOpenInNewTab,
  onAddRoom,
  onRenameRoom,
  onDeleteRoom,
  onCreateFolder,
  onRenameFolder,
  onDeleteFolder,
  onMoveFolder,
  onMoveRoomToFolder
}: RoomListPanelProps) {
  const [isCollapsed, setIsCollapsed] = useState(false)
  const [isAdding, setIsAdding] = useState(false)
  const [addingInFolderId, setAddingInFolderId] = useState<string | null>(null)
  const [newRoomName, setNewRoomName] = useState("")
  const [contextMenu, setContextMenu] = useState<ContextMenuState>(null)
  const contextMenuRef = useRef<HTMLDivElement>(null)

  const [expandedFolderIds, setExpandedFolderIds] = useState<Set<string>>(new Set())
  const [renamingFolderId, setRenamingFolderId] = useState<string | null>(null)
  const [renamingRoomId, setRenamingRoomId] = useState<string | null>(null)
  const [renamingValue, setRenamingValue] = useState("")
  const [creatingFolderParentId, setCreatingFolderParentId] = useState<string | null | undefined>(undefined)
  const [newFolderName, setNewFolderName] = useState("")

  const dragItemRef = useRef<DragItem>(null)
  const [dropTargetFolderId, setDropTargetFolderId] = useState<string | null>(null)
  const [dropTargetIsRoot, setDropTargetIsRoot] = useState(false)
  const autoExpandTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const foldersByParent = useMemo(() => buildFolderChildrenByParent<RoomFolder>(roomFolders), [roomFolders])
  const roomsByFolder = useMemo(() => buildEntriesByFolder<RoomEntry>(rooms), [rooms])

  const inputCallbackRef = useCallback((node: HTMLInputElement | null) => {
    if (node) node.select()
  }, [])

  const renameInputCallbackRef = useCallback((node: HTMLInputElement | null) => {
    if (node) node.select()
  }, [])

  const createFolderInputCallbackRef = useCallback((node: HTMLInputElement | null) => {
    if (node) node.select()
  }, [])

  const blockUndoShortcuts = (event: KeyboardEvent<HTMLInputElement>): void => {
    if ((event.metaKey || event.ctrlKey) && (event.key.toLowerCase() === "z" || event.key.toLowerCase() === "y")) {
      event.preventDefault()
    }
  }

  const startAddingRoom = (inFolderId: string | null = null) => {
    setAddingInFolderId(inFolderId)
    setNewRoomName("")
    setCreatingFolderParentId(undefined)
    setNewFolderName("")
    setIsAdding(true)
  }

  const commitAddRoom = () => {
    const trimmed = newRoomName.trim()
    if (!trimmed) {
      setIsAdding(false)
      setAddingInFolderId(null)
      setNewRoomName("")
      return
    }
    onAddRoom(trimmed, addingInFolderId)
    setNewRoomName("")
    setIsAdding(false)
    setAddingInFolderId(null)
  }

  const createFolder = (parentId: string | null) => {
    setCreatingFolderParentId(parentId)
    setNewFolderName("")
    setIsAdding(false)
    setAddingInFolderId(null)
  }

  const commitCreateFolder = () => {
    if (creatingFolderParentId === undefined) return
    const trimmed = newFolderName.trim()
    if (!trimmed) {
      setCreatingFolderParentId(undefined)
      setNewFolderName("")
      return
    }
    const createdFolderId = onCreateFolder(trimmed, creatingFolderParentId)
    if (!createdFolderId) return
    setExpandedFolderIds((prev) => new Set(prev).add(createdFolderId))
    if (creatingFolderParentId) {
      setExpandedFolderIds((prev) => new Set(prev).add(creatingFolderParentId))
    }
    setCreatingFolderParentId(undefined)
    setNewFolderName("")
  }

  const renameFolder = (folderId: string, name: string) => {
    const trimmed = name.trim()
    if (!trimmed) return
    const renamed = onRenameFolder(folderId, trimmed)
    if (!renamed) return
    setRenamingFolderId(null)
  }

  const renameRoom = (roomId: string, name: string) => {
    const trimmed = name.trim()
    if (!trimmed) return
    onRenameRoom(roomId, trimmed)
    setRenamingRoomId(null)
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

  const openContextMenu = (e: MouseEvent, roomId: string | null, folderId: string | null) => {
    e.preventDefault()
    e.stopPropagation()
    setContextMenu({ x: e.clientX, y: e.clientY, roomId, folderId })
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
    if (dragged.type === "folder" && (dragged.id === folderId || isFolderDescendant(folderId, dragged.id, roomFolders))) {
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
    if (dragged.type === "folder" && (dragged.id === folderId || isFolderDescendant(folderId, dragged.id, roomFolders))) {
      return
    }

    if (dragged.type === "room") onMoveRoomToFolder(dragged.id, folderId)
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
    if (dragged.type === "room") onMoveRoomToFolder(dragged.id, null)
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

  function renderTree(parentId: string | null, depth: number) {
    const childFolders = foldersByParent.get(parentId) ?? []
    const childRooms = roomsByFolder.get(parentId) ?? []

    return (
      <>
        {childFolders.map((folder) => {
          const isExpanded = expandedFolderIds.has(folder.id)
          const isRenaming = renamingFolderId === folder.id
          const isDropTarget = dropTargetFolderId === folder.id
          return (
            <div key={folder.id}>
              <div
                className={`roomlist-folder-row group -mx-2 flex cursor-pointer items-center px-2 py-1 pr-2 transition-colors ${
                  isDropTarget ? "bg-blue-50 ring-1 ring-blue-300" : "hover:bg-slate-100"
                }`}
                style={{ paddingLeft: `${depth * 16 + 8}px` }}
                draggable={!isRenaming}
                onDragStart={(e) => handleDragStart(e, { type: "folder", id: folder.id })}
                onDragEnd={handleDragEnd}
                onDragOver={(e) => handleFolderDragOver(e, folder.id)}
                onDragLeave={handleDragLeave}
                onDrop={(e) => handleFolderDrop(e, folder.id)}
                onClick={() => toggleFolder(folder.id)}
                onContextMenu={(e) => openContextMenu(e, null, folder.id)}
              >
                <span className="roomlist-folder-chevron mr-2 inline-flex h-5 w-5 shrink-0 items-center justify-center text-slate-400">
                  {isExpanded ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
                </span>
                {isRenaming ? (
                  <input
                    ref={renameInputCallbackRef}
                    className="roomlist-folder-rename-input h-5 w-full rounded border border-slate-300 bg-white px-1 text-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-slate-400"
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
                    className="truncate text-[12px] leading-tight text-slate-600"
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

        {childRooms.map((roomEntry: RoomEntry) => {
          const isActive = activeRoomId === roomEntry.id
          const isRenaming = renamingRoomId === roomEntry.id
          return (
            <div
              key={roomEntry.id}
              className={`roomlist-item group -mx-2 flex cursor-pointer items-center px-2 py-1.5 pr-2 transition-colors ${
                isActive ? "bg-blue-50" : "hover:bg-slate-100"
              }`}
              style={{ paddingLeft: `${depth * 16 + 8}px` }}
              draggable={!isRenaming}
              onDragStart={(e) => handleDragStart(e, { type: "room", id: roomEntry.id })}
              onDragEnd={handleDragEnd}
              onClick={() => onSelectRoom(roomEntry.id)}
              onDoubleClick={() => onPinRoom(roomEntry.id)}
              onContextMenu={(e) => openContextMenu(e, roomEntry.id, null)}
            >
              <div className="flex flex-1 items-center gap-2 text-left min-w-0">
                <span className="inline-flex h-5 w-5 shrink-0 items-center justify-center">
                  <Grid3X3 className={`h-3.5 w-3.5 ${isActive ? "text-blue-500" : "text-slate-400"}`} />
                </span>
                {isRenaming ? (
                  <input
                    ref={renameInputCallbackRef}
                    className="roomlist-room-rename-input h-5 w-full rounded border border-slate-300 bg-white px-1 text-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-slate-400"
                    value={renamingValue}
                    onChange={(e: ChangeEvent<HTMLInputElement>) => setRenamingValue(e.target.value)}
                    onKeyDown={(e: KeyboardEvent<HTMLInputElement>) => {
                      blockUndoShortcuts(e)
                      if (e.key === "Enter") renameRoom(roomEntry.id, renamingValue)
                      if (e.key === "Escape") setRenamingRoomId(null)
                      e.stopPropagation()
                    }}
                    onBlur={() => renameRoom(roomEntry.id, renamingValue)}
                    onClick={(e) => e.stopPropagation()}
                  />
                ) : (
                  <span className="truncate text-[12px] leading-tight text-slate-600">
                    {roomEntry.name}
                  </span>
                )}
              </div>
            </div>
          )
        })}

        {creatingFolderParentId === parentId && (
          <div className="roomlist-create-folder-inline -mx-2 flex min-h-[34px] items-center px-2 py-1 pr-2" style={{ paddingLeft: `${depth * 16 + 8}px` }}>
            <span className="roomlist-create-folder-chevron mr-2 inline-flex h-5 w-5 shrink-0 items-center justify-center text-slate-400">
              <ChevronRight className="h-3.5 w-3.5" />
            </span>
            <input
              ref={createFolderInputCallbackRef}
              value={newFolderName}
              onChange={(event: ChangeEvent<HTMLInputElement>) => setNewFolderName(event.target.value)}
              onKeyDown={(event: KeyboardEvent<HTMLInputElement>) => {
                blockUndoShortcuts(event)
                if (event.key === "Enter") commitCreateFolder()
                if (event.key === "Escape") {
                  setCreatingFolderParentId(undefined)
                  setNewFolderName("")
                }
              }}
              onBlur={commitCreateFolder}
              className="roomlist-folder-create-input h-5 w-full rounded border border-slate-300 bg-white px-1 text-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-slate-400"
              placeholder="New folder"
            />
          </div>
        )}

        {isAdding && addingInFolderId === parentId && (
          <div className="roomlist-add-form-inline -mx-2 flex items-center gap-2 px-2 py-1.5 pr-2" style={{ paddingLeft: `${depth * 16 + 8}px` }}>
            <span className="inline-flex h-5 w-5 shrink-0 items-center justify-center">
              <Grid3X3 className="h-3.5 w-3.5 text-slate-400" />
            </span>
            <input
              ref={inputCallbackRef}
              value={newRoomName}
              onChange={(e: ChangeEvent<HTMLInputElement>) => setNewRoomName(e.target.value)}
              onKeyDown={(e: KeyboardEvent<HTMLInputElement>) => {
                blockUndoShortcuts(e)
                if (e.key === "Enter") commitAddRoom()
                if (e.key === "Escape") {
                  setIsAdding(false)
                  setAddingInFolderId(null)
                  setNewRoomName("")
                }
              }}
              onBlur={commitAddRoom}
              className="flex h-7 w-full rounded-md border border-slate-300 bg-white px-2 py-1 text-xs shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400"
              placeholder="Sala nova"
            />
          </div>
        )}
      </>
    )
  }

  function renderContextMenu() {
    if (!contextMenu) return null
    const { roomId, folderId } = contextMenu

    return (
      <div
        ref={contextMenuRef}
        className="roomlist-context-menu fixed z-50 min-w-[160px] rounded-md border border-slate-200 bg-white py-1 shadow-lg"
        style={{ left: contextMenu.x, top: contextMenu.y }}
      >
        {roomId ? (
          <>
            <button
              type="button"
              className="roomlist-ctx-open flex w-full items-center gap-2 px-3 py-1.5 text-left text-xs text-slate-700 transition-colors hover:bg-slate-100"
              onClick={() => {
                onSelectRoom(roomId)
                closeContextMenu()
              }}
            >
              <Grid3X3 className="h-3.5 w-3.5 text-slate-400" />
              Open
            </button>
            <button
              type="button"
              className="roomlist-ctx-open-tab flex w-full items-center gap-2 px-3 py-1.5 text-left text-xs text-slate-700 transition-colors hover:bg-slate-100"
              onClick={() => {
                onOpenInNewTab(roomId)
                closeContextMenu()
              }}
            >
              <Plus className="h-3.5 w-3.5 text-slate-400" />
              Open in a new tab
            </button>
            <button
              type="button"
              className="roomlist-ctx-rename flex w-full items-center gap-2 px-3 py-1.5 text-left text-xs text-slate-700 transition-colors hover:bg-slate-100"
              onClick={() => {
                const room = rooms.find((entry) => entry.id === roomId)
                if (room) {
                  setRenamingRoomId(roomId)
                  setRenamingValue(room.name)
                }
                closeContextMenu()
              }}
            >
              <Pencil className="h-3.5 w-3.5 text-slate-400" />
              Rename
            </button>
            <div className="my-1 border-t border-slate-100" />
            <button
              type="button"
              className="roomlist-ctx-delete flex w-full items-center gap-2 px-3 py-1.5 text-left text-xs text-red-600 transition-colors hover:bg-red-50"
              onClick={() => {
                onDeleteRoom(roomId)
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
              className="roomlist-ctx-rename flex w-full items-center gap-2 px-3 py-1.5 text-left text-xs text-slate-700 transition-colors hover:bg-slate-100"
              onClick={() => {
                const folder = roomFolders.find((entry) => entry.id === folderId)
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
              className="roomlist-ctx-subfolder flex w-full items-center gap-2 px-3 py-1.5 text-left text-xs text-slate-700 transition-colors hover:bg-slate-100"
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
              className="roomlist-ctx-add-in-folder flex w-full items-center gap-2 px-3 py-1.5 text-left text-xs text-slate-700 transition-colors hover:bg-slate-100"
              onClick={() => {
                setExpandedFolderIds((prev) => new Set(prev).add(folderId))
                startAddingRoom(folderId)
                closeContextMenu()
              }}
            >
              <Plus className="h-3.5 w-3.5 text-slate-400" />
              New room here
            </button>
            <div className="my-1 border-t border-slate-100" />
            <button
              type="button"
              className="roomlist-ctx-delete-folder flex w-full items-center gap-2 px-3 py-1.5 text-left text-xs text-red-600 transition-colors hover:bg-red-50"
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
              className="roomlist-ctx-new flex w-full items-center gap-2 px-3 py-1.5 text-left text-xs text-slate-700 transition-colors hover:bg-slate-100"
              onClick={() => {
                startAddingRoom(null)
                closeContextMenu()
              }}
            >
              <Plus className="h-3.5 w-3.5 text-slate-400" />
              New room
            </button>
            <button
              type="button"
              className="roomlist-ctx-new-folder flex w-full items-center gap-2 px-3 py-1.5 text-left text-xs text-slate-700 transition-colors hover:bg-slate-100"
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
    <EditorSidebarLayout
      classNamePrefix="mvp3-room-list-panel"
      isCollapsed={isCollapsed}
      expandedWidthClass="w-[200px]"
      header={
        <div className={`roomlist-header flex items-center border-b border-slate-200 px-1.5 py-1.5 ${isCollapsed ? "justify-center" : "justify-between"}`}>
          {isCollapsed ? (
            <div className="flex flex-col items-center gap-1">
              <button
                type="button"
                className="roomlist-expand-btn inline-flex h-7 w-7 items-center justify-center rounded text-slate-400 transition-colors hover:bg-slate-200 hover:text-slate-700"
                onClick={() => setIsCollapsed(false)}
                title="Expand room list"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
              <button
                type="button"
                className="roomlist-add-btn-collapsed inline-flex h-7 w-7 items-center justify-center rounded text-slate-400 transition-colors hover:bg-slate-200 hover:text-slate-700"
                onClick={() => {
                  setIsCollapsed(false)
                  startAddingRoom(null)
                }}
                title="Add room"
              >
                <Plus className="h-4 w-4" />
              </button>
            </div>
          ) : (
            <>
              <div className="flex items-center gap-0.5">
                <button
                  type="button"
                  className="roomlist-add-btn inline-flex h-7 w-7 items-center justify-center rounded text-slate-400 transition-colors hover:bg-slate-200 hover:text-slate-700"
                  onClick={() => startAddingRoom(null)}
                  title="Add room"
                >
                  <Plus className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  className="roomlist-add-folder-btn inline-flex h-7 w-7 items-center justify-center rounded text-slate-400 transition-colors hover:bg-slate-200 hover:text-slate-700"
                  onClick={() => createFolder(null)}
                  title="New folder"
                >
                  <FolderPlus className="h-4 w-4" />
                </button>
              </div>
              <button
                type="button"
                className="roomlist-collapse-btn inline-flex h-7 w-7 items-center justify-center rounded text-slate-400 transition-colors hover:bg-slate-200 hover:text-slate-700"
                onClick={() => setIsCollapsed(true)}
                title="Collapse room list"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
            </>
          )}
        </div>
      }
      body={
        <div
          className={`roomlist-tree-root flex-1 overflow-y-auto p-2 ${dropTargetIsRoot ? "bg-blue-50/50" : ""}`}
          onContextMenu={(event) => openContextMenu(event, null, null)}
          onDragOver={handleRootDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleRootDrop}
        >
          <div className="flex flex-col gap-0.5">
            {rooms.length === 0 && roomFolders.length === 0 && !isAdding && (
              <p className="px-2 py-4 text-center text-xs text-slate-400">Right-click or press + to add</p>
            )}
            {renderTree(null, 0)}
          </div>
        </div>
      }
      overlay={renderContextMenu()}
    />
  )
}
