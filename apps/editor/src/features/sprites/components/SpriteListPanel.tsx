import { ChevronDown, ChevronLeft, ChevronRight, FolderPlus, Image, Pencil, Plus, Trash2, X } from "lucide-react"
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
import { Button } from "../../../components/ui/button.js"
import { EditorSidebarLayout } from "../../shared/editor-sidebar/EditorSidebarLayout.js"
import { buildEntriesByFolder, buildFolderChildrenByParent, isFolderDescendant } from "../../shared/editor-sidebar/tree-utils.js"

const DEFAULT_SPRITE_DIMENSION = 32
const DND_MIME = "application/x-sprite-tree-node"

type SpriteListEntry = {
  id: string
  name: string
  folderId: string | null
  width: number
  height: number
  isEmpty: boolean
  previewDataUrl: string
  objectNames: string[]
}

type SpriteFolderEntry = {
  id: string
  name: string
  parentId: string | null
}

type TreeNode = { type: "sprite"; id: string } | { type: "folder"; id: string }

type SpriteListPanelProps = {
  sprites: SpriteListEntry[]
  spriteFolders: SpriteFolderEntry[]
  activeSpriteId: string | null
  onSelectSprite: (spriteId: string) => void
  onPinSprite: (spriteId: string) => void
  onOpenInNewTab: (spriteId: string) => void
  onAddSprite: (name: string, width: number, height: number, folderId: string | null) => void
  onCreateFolder: (name: string, parentId: string | null) => string | null
  onDeleteSprite: (spriteId: string) => boolean
  onMoveSpriteToFolder: (spriteId: string, folderId: string | null) => boolean
  onRenameFolder: (folderId: string, name: string) => boolean
  onDeleteFolder: (folderId: string) => boolean
  onMoveFolderToParent: (folderId: string, newParentId: string | null) => boolean
}

type ContextMenuState = {
  x: number
  y: number
  spriteId: string | null
  folderId: string | null
} | null

export function SpriteListPanel({
  sprites,
  spriteFolders,
  activeSpriteId,
  onSelectSprite,
  onPinSprite,
  onOpenInNewTab,
  onAddSprite,
  onCreateFolder,
  onDeleteSprite,
  onMoveSpriteToFolder,
  onRenameFolder,
  onDeleteFolder,
  onMoveFolderToParent
}: SpriteListPanelProps) {
  const [isCollapsed, setIsCollapsed] = useState(false)
  const [isAdding, setIsAdding] = useState(false)
  const [addingInFolderId, setAddingInFolderId] = useState<string | null>(null)
  const [newName, setNewName] = useState("Sprite nou")
  const [newWidth, setNewWidth] = useState(String(DEFAULT_SPRITE_DIMENSION))
  const [newHeight, setNewHeight] = useState(String(DEFAULT_SPRITE_DIMENSION))
  const [contextMenu, setContextMenu] = useState<ContextMenuState>(null)
  const contextMenuRef = useRef<HTMLDivElement>(null)

  const [expandedFolderIds, setExpandedFolderIds] = useState<Set<string>>(() => new Set())
  const [renamingFolderId, setRenamingFolderId] = useState<string | null>(null)
  const [renameValue, setRenameValue] = useState("")
  const [creatingFolderParentId, setCreatingFolderParentId] = useState<string | null | undefined>(undefined)
  const [newFolderName, setNewFolderName] = useState("")
  const dragItemRef = useRef<TreeNode | null>(null)
  const [dropTargetFolderId, setDropTargetFolderId] = useState<string | null>(null)
  const [dropTargetIsRoot, setDropTargetIsRoot] = useState(false)
  const autoExpandTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const foldersById = useMemo(() => new Map(spriteFolders.map((entry) => [entry.id, entry])), [spriteFolders])
  const folderChildrenByParent = useMemo(() => buildFolderChildrenByParent<SpriteFolderEntry>(spriteFolders), [spriteFolders])
  const spritesByFolder = useMemo(() => buildEntriesByFolder<SpriteListEntry>(sprites), [sprites])

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

  const parseDimensionValue = (value: string): number => {
    const parsedValue = Number.parseInt(value, 10)
    if (!Number.isFinite(parsedValue) || parsedValue < 1) {
      return DEFAULT_SPRITE_DIMENSION
    }
    return parsedValue
  }

  const startAddingSprite = (inFolderId: string | null = null) => {
    setAddingInFolderId(inFolderId)
    setNewName("")
    setNewWidth("")
    setNewHeight("")
    setCreatingFolderParentId(undefined)
    setNewFolderName("")
    setIsCollapsed(false)
    setIsAdding(true)
  }

  const handleAddSprite = () => {
    if (!newName.trim()) return
    onAddSprite(newName.trim(), parseDimensionValue(newWidth), parseDimensionValue(newHeight), addingInFolderId)
    setNewName("")
    setNewWidth("")
    setNewHeight("")
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

  const openContextMenu = (event: MouseEvent, spriteId: string | null, folderId: string | null) => {
    event.preventDefault()
    event.stopPropagation()
    setContextMenu({ x: event.clientX, y: event.clientY, spriteId, folderId })
  }

  const closeContextMenu = () => setContextMenu(null)

  useEffect(() => {
    if (!contextMenu) return
    const handleClick = (event: globalThis.MouseEvent) => {
      if (contextMenuRef.current && !contextMenuRef.current.contains(event.target as Node)) {
        closeContextMenu()
      }
    }
    const handleEscape = (event: globalThis.KeyboardEvent) => {
      if (event.key === "Escape") closeContextMenu()
    }
    document.addEventListener("mousedown", handleClick)
    document.addEventListener("keydown", handleEscape)
    return () => {
      document.removeEventListener("mousedown", handleClick)
      document.removeEventListener("keydown", handleEscape)
    }
  }, [contextMenu])

  const handleDragStart = (event: DragEvent, node: TreeNode) => {
    dragItemRef.current = node
    event.dataTransfer.effectAllowed = "move"
    event.dataTransfer.setData(DND_MIME, JSON.stringify(node))
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

  const handleFolderDragOver = (event: DragEvent, folderId: string) => {
    event.preventDefault()
    event.stopPropagation()
    event.dataTransfer.dropEffect = "move"

    const dragged = dragItemRef.current
    if (!dragged) return
    if (dragged.type === "folder" && (dragged.id === folderId || isFolderDescendant(folderId, dragged.id, spriteFolders))) {
      event.dataTransfer.dropEffect = "none"
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

  const handleFolderDrop = (event: DragEvent, folderId: string) => {
    event.preventDefault()
    event.stopPropagation()
    const dragged = dragItemRef.current
    if (!dragged) return
    if (dragged.type === "folder" && (dragged.id === folderId || isFolderDescendant(folderId, dragged.id, spriteFolders))) {
      return
    }
    if (dragged.type === "sprite") onMoveSpriteToFolder(dragged.id, folderId)
    else onMoveFolderToParent(dragged.id, folderId)
    setExpandedFolderIds((prev) => new Set(prev).add(folderId))
    handleDragEnd()
  }

  const handleRootDragOver = (event: DragEvent) => {
    event.preventDefault()
    event.dataTransfer.dropEffect = "move"
    setDropTargetFolderId(null)
    setDropTargetIsRoot(true)
    if (autoExpandTimerRef.current) {
      clearTimeout(autoExpandTimerRef.current)
      autoExpandTimerRef.current = null
    }
  }

  const handleRootDrop = (event: DragEvent) => {
    event.preventDefault()
    const dragged = dragItemRef.current
    if (!dragged) return
    if (dragged.type === "sprite") onMoveSpriteToFolder(dragged.id, null)
    else onMoveFolderToParent(dragged.id, null)
    handleDragEnd()
  }

  const handleDragLeave = (event: DragEvent) => {
    const relatedTarget = event.relatedTarget as Node | null
    if (relatedTarget && (event.currentTarget as Node).contains(relatedTarget)) return
    setDropTargetFolderId(null)
    setDropTargetIsRoot(false)
    if (autoExpandTimerRef.current) {
      clearTimeout(autoExpandTimerRef.current)
      autoExpandTimerRef.current = null
    }
  }

  useEffect(() => {
    setExpandedFolderIds((previous) => {
      const next = new Set(previous)
      let changed = false
      for (const folderEntry of spriteFolders) {
        if (!next.has(folderEntry.id)) {
          next.add(folderEntry.id)
          changed = true
        }
      }
      for (const expandedId of [...next]) {
        if (!foldersById.has(expandedId)) {
          next.delete(expandedId)
          changed = true
        }
      }
      return changed ? next : previous
    })
  }, [foldersById, spriteFolders])

  useEffect(() => {
    if (renamingFolderId && !foldersById.has(renamingFolderId)) {
      setRenamingFolderId(null)
    }
  }, [foldersById, renamingFolderId])

  function renderTree(parentId: string | null, depth: number) {
    const childFolders = folderChildrenByParent.get(parentId) ?? []
    const childSprites = spritesByFolder.get(parentId) ?? []
    return (
      <>
        {childFolders.map((folderEntry) => {
          const isExpanded = expandedFolderIds.has(folderEntry.id)
          const isRenaming = renamingFolderId === folderEntry.id
          const isDropTarget = dropTargetFolderId === folderEntry.id
          return (
            <div key={folderEntry.id}>
              <div
                className={`mvp16-sprite-folder-row group flex cursor-pointer items-center rounded py-1 pr-2 transition-colors ${
                  isDropTarget ? "bg-blue-50 ring-1 ring-blue-300" : "hover:bg-slate-100"
                }`}
                style={{ paddingLeft: `${depth * 16 + 4}px` }}
                draggable={!isRenaming}
                onDragStart={(event) => handleDragStart(event, { type: "folder", id: folderEntry.id })}
                onDragEnd={handleDragEnd}
                onDragOver={(event) => handleFolderDragOver(event, folderEntry.id)}
                onDragLeave={handleDragLeave}
                onDrop={(event) => handleFolderDrop(event, folderEntry.id)}
                onClick={() => toggleFolder(folderEntry.id)}
                onContextMenu={(event) => openContextMenu(event, null, folderEntry.id)}
              >
                <span className="mvp16-sprite-folder-chevron mr-0.5 shrink-0 text-slate-400">
                  {isExpanded ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
                </span>
                {isRenaming ? (
                  <input
                    ref={renameInputCallbackRef}
                    className="mvp16-sprite-folder-rename-input h-5 w-full rounded border border-slate-300 bg-white px-1 text-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-slate-400"
                    value={renameValue}
                    onChange={(event: ChangeEvent<HTMLInputElement>) => setRenameValue(event.target.value)}
                    onKeyDown={(event: KeyboardEvent<HTMLInputElement>) => {
                      blockUndoShortcuts(event)
                      if (event.key === "Enter") renameFolder(folderEntry.id, renameValue)
                      if (event.key === "Escape") setRenamingFolderId(null)
                      event.stopPropagation()
                    }}
                    onBlur={() => renameFolder(folderEntry.id, renameValue)}
                    onClick={(event) => event.stopPropagation()}
                  />
                ) : (
                  <span
                    className="truncate text-sm text-slate-600"
                    onDoubleClick={(event) => {
                      event.stopPropagation()
                      setRenamingFolderId(folderEntry.id)
                      setRenameValue(folderEntry.name)
                    }}
                  >
                    {folderEntry.name}
                  </span>
                )}
              </div>
              {isExpanded && renderTree(folderEntry.id, depth + 1)}
            </div>
          )
        })}

        {childSprites.map((spriteEntry) => {
          const isActive = activeSpriteId === spriteEntry.id
          return (
            <div
              key={spriteEntry.id}
              className={`mvp16-sprite-item group -mx-2 flex cursor-pointer items-center px-2 py-1.5 pr-2 transition-colors ${
                isActive ? "bg-blue-50" : "hover:bg-slate-100"
              }`}
              style={{ paddingLeft: `${depth * 16 + 8}px` }}
              draggable
              onDragStart={(event) => handleDragStart(event, { type: "sprite", id: spriteEntry.id })}
              onDragEnd={handleDragEnd}
              onClick={() => onSelectSprite(spriteEntry.id)}
              onDoubleClick={() => onPinSprite(spriteEntry.id)}
              onContextMenu={(event) => openContextMenu(event, spriteEntry.id, null)}
            >
              <div className="flex min-w-0 flex-1 items-center gap-2 text-left text-sm">
                {spriteEntry.previewDataUrl ? (
                  <img
                    src={spriteEntry.previewDataUrl}
                    alt=""
                    className="mvp16-sprite-thumb h-5 w-5 shrink-0 object-contain"
                    style={{ imageRendering: "pixelated" }}
                  />
                ) : (
                  <Image className="h-3.5 w-3.5 shrink-0 text-slate-400" />
                )}
                <div className="flex min-w-0 flex-1 flex-col gap-0">
                  <span className="truncate text-[12px] leading-tight text-slate-600">{spriteEntry.name}</span>
                  <span className="truncate text-[9px] leading-tight text-slate-400">
                    {spriteEntry.width} x {spriteEntry.height}
                    {spriteEntry.isEmpty && <span className="ml-1 text-amber-400">· buit</span>}
                    {spriteEntry.objectNames.length > 0 && (
                      <span className="ml-1 text-slate-400">
                        · {spriteEntry.objectNames[0]}{spriteEntry.objectNames.length > 1 && ` +${spriteEntry.objectNames.length - 1} més`}
                      </span>
                    )}
                  </span>
                </div>
              </div>
            </div>
          )
        })}

        {creatingFolderParentId === parentId && (
          <div className="mvp16-sprite-create-folder-inline flex py-1 pr-2" style={{ paddingLeft: `${depth * 16 + 8}px` }}>
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
              className="mvp16-sprite-folder-create-input h-7 w-full rounded-md border border-slate-300 bg-white px-2 py-1 text-xs shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400"
              placeholder="New folder"
            />
          </div>
        )}

        {isAdding && addingInFolderId === parentId && (
          <div className="mvp16-sprite-add-inline flex flex-col gap-1.5 py-1 pr-2" style={{ paddingLeft: `${depth * 16 + 8}px` }}>
            <input
              ref={inputCallbackRef}
              value={newName}
              onChange={(event: ChangeEvent<HTMLInputElement>) => setNewName(event.target.value)}
              onKeyDown={(event: KeyboardEvent<HTMLInputElement>) => {
                blockUndoShortcuts(event)
                if (event.key === "Enter") handleAddSprite()
                if (event.key === "Escape") {
                  setIsAdding(false)
                  setAddingInFolderId(null)
                }
              }}
              className="h-7 w-full rounded-md border border-slate-300 bg-white px-2 py-1 text-xs shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400"
              placeholder="Sprite nou"
            />
            <div className="flex items-end gap-1.5">
              <input
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                value={newWidth}
                onChange={(event: ChangeEvent<HTMLInputElement>) => setNewWidth(event.target.value)}
                onKeyDown={(event: KeyboardEvent<HTMLInputElement>) => {
                  blockUndoShortcuts(event)
                  if (event.key === "Enter") handleAddSprite()
                  if (event.key === "Escape") {
                    setIsAdding(false)
                    setAddingInFolderId(null)
                  }
                }}
                className="h-7 w-full rounded-md border border-slate-300 bg-white px-2 py-1 text-xs shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400"
                placeholder="32"
              />
              <input
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                value={newHeight}
                onChange={(event: ChangeEvent<HTMLInputElement>) => setNewHeight(event.target.value)}
                onKeyDown={(event: KeyboardEvent<HTMLInputElement>) => {
                  blockUndoShortcuts(event)
                  if (event.key === "Enter") handleAddSprite()
                  if (event.key === "Escape") {
                    setIsAdding(false)
                    setAddingInFolderId(null)
                  }
                }}
                className="h-7 w-full rounded-md border border-slate-300 bg-white px-2 py-1 text-xs shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400"
                placeholder="32"
              />
              <Button size="sm" className="h-7 w-7 shrink-0 px-0" onClick={handleAddSprite} title="Add sprite">
                <Plus className="h-3.5 w-3.5" />
              </Button>
              <Button
                size="sm"
                variant="ghost"
                className="h-7 w-7 shrink-0 px-0 text-slate-500 hover:bg-slate-100 hover:text-slate-700"
                onClick={() => {
                  setIsAdding(false)
                  setAddingInFolderId(null)
                  setNewName("")
                  setNewWidth("")
                  setNewHeight("")
                }}
                title="Cancel"
              >
                <X className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        )}
      </>
    )
  }

  function renderContextMenu() {
    if (!contextMenu) return null
    const { spriteId, folderId } = contextMenu
    return (
      <div
        ref={contextMenuRef}
        className="mvp16-sprite-context-menu fixed z-50 min-w-[160px] rounded-md border border-slate-200 bg-white py-1 shadow-lg"
        style={{ left: contextMenu.x, top: contextMenu.y }}
      >
        {spriteId ? (
          <>
            <button
              type="button"
              className="mvp16-sprite-ctx-open flex w-full items-center gap-2 px-3 py-1.5 text-left text-xs text-slate-700 transition-colors hover:bg-slate-100"
              onClick={() => {
                onSelectSprite(spriteId)
                closeContextMenu()
              }}
            >
              <Image className="h-3.5 w-3.5 text-slate-400" />
              Open
            </button>
            <button
              type="button"
              className="mvp16-sprite-ctx-open-tab flex w-full items-center gap-2 px-3 py-1.5 text-left text-xs text-slate-700 transition-colors hover:bg-slate-100"
              onClick={() => {
                onOpenInNewTab(spriteId)
                closeContextMenu()
              }}
            >
              <Plus className="h-3.5 w-3.5 text-slate-400" />
              Open in a new tab
            </button>
            <div className="my-1 border-t border-slate-100" />
            <button
              type="button"
              className="mvp16-sprite-ctx-delete flex w-full items-center gap-2 px-3 py-1.5 text-left text-xs text-red-600 transition-colors hover:bg-red-50"
              onClick={() => {
                onDeleteSprite(spriteId)
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
              className="mvp16-sprite-ctx-rename flex w-full items-center gap-2 px-3 py-1.5 text-left text-xs text-slate-700 transition-colors hover:bg-slate-100"
              onClick={() => {
                const folder = spriteFolders.find((entry) => entry.id === folderId)
                if (folder) {
                  setRenamingFolderId(folderId)
                  setRenameValue(folder.name)
                }
                closeContextMenu()
              }}
            >
              <Pencil className="h-3.5 w-3.5 text-slate-400" />
              Rename
            </button>
            <button
              type="button"
              className="mvp16-sprite-ctx-subfolder flex w-full items-center gap-2 px-3 py-1.5 text-left text-xs text-slate-700 transition-colors hover:bg-slate-100"
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
              className="mvp16-sprite-ctx-add-in-folder flex w-full items-center gap-2 px-3 py-1.5 text-left text-xs text-slate-700 transition-colors hover:bg-slate-100"
              onClick={() => {
                setExpandedFolderIds((prev) => new Set(prev).add(folderId))
                startAddingSprite(folderId)
                closeContextMenu()
              }}
            >
              <Plus className="h-3.5 w-3.5 text-slate-400" />
              New sprite here
            </button>
            <div className="my-1 border-t border-slate-100" />
            <button
              type="button"
              className="mvp16-sprite-ctx-delete-folder flex w-full items-center gap-2 px-3 py-1.5 text-left text-xs text-red-600 transition-colors hover:bg-red-50"
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
              className="mvp16-sprite-ctx-new flex w-full items-center gap-2 px-3 py-1.5 text-left text-xs text-slate-700 transition-colors hover:bg-slate-100"
              onClick={() => {
                startAddingSprite(null)
                closeContextMenu()
              }}
            >
              <Plus className="h-3.5 w-3.5 text-slate-400" />
              New sprite
            </button>
            <button
              type="button"
              className="mvp16-sprite-ctx-new-folder flex w-full items-center gap-2 px-3 py-1.5 text-left text-xs text-slate-700 transition-colors hover:bg-slate-100"
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
      classNamePrefix="mvp16-sprite-tree-panel"
      className="border-r border-slate-200"
      isCollapsed={isCollapsed}
      expandedWidthClass="w-[200px]"
      header={
        <div className={`mvp16-sprite-list-header flex items-center border-b border-slate-200 px-1.5 py-1.5 ${isCollapsed ? "justify-center" : "justify-between"}`}>
          {isCollapsed ? (
            <div className="flex flex-col items-center gap-1">
              <button
                type="button"
                className="mvp16-sprite-expand-btn inline-flex h-7 w-7 items-center justify-center rounded text-slate-400 transition-colors hover:bg-slate-200 hover:text-slate-700"
                onClick={() => setIsCollapsed(false)}
                title="Expand sprite list"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
              <button
                type="button"
                className="mvp16-sprite-add-collapsed-btn inline-flex h-7 w-7 items-center justify-center rounded text-slate-400 transition-colors hover:bg-slate-200 hover:text-slate-700"
                onClick={() => {
                  setIsCollapsed(false)
                  startAddingSprite(null)
                }}
                title="Add sprite"
              >
                <Plus className="h-4 w-4" />
              </button>
            </div>
          ) : (
            <>
              <div className="flex items-center gap-0.5">
                <button
                  type="button"
                  className="mvp16-sprite-add-btn inline-flex h-7 w-7 items-center justify-center rounded text-slate-400 transition-colors hover:bg-slate-200 hover:text-slate-700"
                  onClick={() => startAddingSprite(null)}
                  title="Add sprite"
                >
                  <Plus className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  className="mvp16-sprite-add-folder-btn inline-flex h-7 w-7 items-center justify-center rounded text-slate-400 transition-colors hover:bg-slate-200 hover:text-slate-700"
                  onClick={() => createFolder(null)}
                  title="New folder"
                >
                  <FolderPlus className="h-4 w-4" />
                </button>
              </div>
              <button
                type="button"
                className="mvp16-sprite-collapse-btn inline-flex h-7 w-7 items-center justify-center rounded text-slate-400 transition-colors hover:bg-slate-200 hover:text-slate-700"
                onClick={() => setIsCollapsed(true)}
                title="Collapse sprite list"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
            </>
          )}
        </div>
      }
      body={
        <div
          className={`mvp16-sprite-tree-items flex-1 overflow-y-auto p-2 ${dropTargetIsRoot ? "bg-blue-50/50" : ""}`}
          onContextMenu={(event) => openContextMenu(event, null, null)}
          onDragOver={handleRootDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleRootDrop}
        >
          <div className="flex flex-col gap-0.5">
            {sprites.length === 0 && spriteFolders.length === 0 && (
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
