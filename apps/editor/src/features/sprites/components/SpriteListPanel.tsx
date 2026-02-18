import { ChevronLeft, ChevronRight, Folder, FolderOpen, Image, Pencil, Plus, Trash2 } from "lucide-react"
import { useEffect, useMemo, useState, type ChangeEvent, type DragEvent, type KeyboardEvent, type MouseEvent } from "react"
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
  onAddSprite: (name: string, width: number, height: number, folderId: string | null) => void
  onCreateFolder: (name: string, parentId: string | null) => string | null
  onRenameSprite: (spriteId: string, name: string) => boolean
  onDeleteSprite: (spriteId: string) => boolean
  onMoveSpriteToFolder: (spriteId: string, folderId: string | null) => boolean
  onRenameFolder: (folderId: string, name: string) => boolean
  onDeleteFolder: (folderId: string) => boolean
  onMoveFolderToParent: (folderId: string, newParentId: string | null) => boolean
}

type ContextMenuState =
  | {
      x: number
      y: number
      node: TreeNode
    }
  | null

function nodeKey(node: TreeNode | null): string | null {
  if (!node) return null
  return `${node.type}:${node.id}`
}

export function SpriteListPanel({
  sprites,
  spriteFolders,
  activeSpriteId,
  onSelectSprite,
  onAddSprite,
  onCreateFolder,
  onRenameSprite,
  onDeleteSprite,
  onMoveSpriteToFolder,
  onRenameFolder,
  onDeleteFolder,
  onMoveFolderToParent
}: SpriteListPanelProps) {
  const [isCollapsed, setIsCollapsed] = useState(false)
  const [isAdding, setIsAdding] = useState(false)
  const [newName, setNewName] = useState("")
  const [newWidth, setNewWidth] = useState(String(DEFAULT_SPRITE_DIMENSION))
  const [newHeight, setNewHeight] = useState(String(DEFAULT_SPRITE_DIMENSION))
  const [selectedNode, setSelectedNode] = useState<TreeNode | null>(null)
  const [expandedFolderIds, setExpandedFolderIds] = useState<Set<string>>(() => new Set())
  const [renamingNode, setRenamingNode] = useState<TreeNode | null>(null)
  const [renameValue, setRenameValue] = useState("")
  const [creatingFolderParentId, setCreatingFolderParentId] = useState<string | null | undefined>(undefined)
  const [newFolderName, setNewFolderName] = useState("Nova carpeta")
  const [contextMenu, setContextMenu] = useState<ContextMenuState>(null)
  const [draggedNode, setDraggedNode] = useState<TreeNode | null>(null)
  const [dropTargetFolderId, setDropTargetFolderId] = useState<string | null | undefined>(undefined)

  const handleDragStart = (event: DragEvent<HTMLElement>, node: TreeNode) => {
    event.dataTransfer.setData(DND_MIME, JSON.stringify(node))
    event.dataTransfer.effectAllowed = "move"
    setDraggedNode(node)
  }

  const handleDragEnd = () => {
    setDraggedNode(null)
    setDropTargetFolderId(undefined)
  }

  const handleDragOver = (event: DragEvent<HTMLElement>, targetFolderId: string | null) => {
    if (!event.dataTransfer.types.includes(DND_MIME)) {
      return
    }
    if (
      draggedNode?.type === "folder" &&
      targetFolderId !== null &&
      (draggedNode.id === targetFolderId || isFolderDescendant(targetFolderId, draggedNode.id, spriteFolders))
    ) {
      return
    }
    event.preventDefault()
    event.dataTransfer.dropEffect = "move"
    setDropTargetFolderId(targetFolderId)
  }

  const handleDragLeave = (event: DragEvent<HTMLElement>) => {
    const related = event.relatedTarget
    if (related instanceof Node && event.currentTarget.contains(related)) {
      return
    }
    setDropTargetFolderId(undefined)
  }

  const handleDrop = (event: DragEvent<HTMLElement>, targetFolderId: string | null) => {
    event.preventDefault()
    setDropTargetFolderId(undefined)
    setDraggedNode(null)
    const raw = event.dataTransfer.getData(DND_MIME)
    if (!raw) return
    try {
      const node = JSON.parse(raw) as TreeNode
      if (node.type === "sprite") {
        onMoveSpriteToFolder(node.id, targetFolderId)
      } else if (node.type === "folder") {
        if (
          node.id !== targetFolderId &&
          (targetFolderId === null || !isFolderDescendant(targetFolderId, node.id, spriteFolders))
        ) {
          onMoveFolderToParent(node.id, targetFolderId)
        }
      }
      if (targetFolderId) {
        setExpandedFolderIds((previous) => new Set([...previous, targetFolderId]))
      }
    } catch {
      // ignore malformed drag data
    }
  }

  const foldersById = useMemo(() => new Map(spriteFolders.map((folderEntry) => [folderEntry.id, folderEntry])), [spriteFolders])

  const folderChildrenByParent = useMemo(() => buildFolderChildrenByParent<SpriteFolderEntry>(spriteFolders), [spriteFolders])
  const spritesByFolder = useMemo(() => buildEntriesByFolder<SpriteListEntry>(sprites), [sprites])

  const visibleNodes = useMemo(() => {
    const nodes: TreeNode[] = []
    const collectNodes = (parentId: string | null): void => {
      const childFolders = folderChildrenByParent.get(parentId) ?? []
      for (const folderEntry of childFolders) {
        nodes.push({ type: "folder", id: folderEntry.id })
        if (expandedFolderIds.has(folderEntry.id)) {
          collectNodes(folderEntry.id)
        }
      }
      const folderSprites = spritesByFolder.get(parentId) ?? []
      for (const spriteEntry of folderSprites) {
        nodes.push({ type: "sprite", id: spriteEntry.id })
      }
    }
    collectNodes(null)
    return nodes
  }, [expandedFolderIds, folderChildrenByParent, spritesByFolder])

  const parseDimensionValue = (value: string): number => {
    const parsedValue = Number.parseInt(value, 10)
    if (!Number.isFinite(parsedValue) || parsedValue < 1) {
      return DEFAULT_SPRITE_DIMENSION
    }
    return parsedValue
  }

  const handleAdd = () => {
    if (!newName.trim()) return
    const targetFolderId = selectedNode?.type === "folder" ? selectedNode.id : null
    onAddSprite(newName.trim(), parseDimensionValue(newWidth), parseDimensionValue(newHeight), targetFolderId)
    setNewName("")
    setNewWidth(String(DEFAULT_SPRITE_DIMENSION))
    setNewHeight(String(DEFAULT_SPRITE_DIMENSION))
    setIsAdding(false)
  }

  const startRename = (node: TreeNode) => {
    const nextValue =
      node.type === "sprite" ? sprites.find((entry) => entry.id === node.id)?.name : foldersById.get(node.id)?.name
    if (!nextValue) return
    setRenamingNode(node)
    setRenameValue(nextValue)
    setContextMenu(null)
  }

  const commitRename = () => {
    const trimmedName = renameValue.trim()
    if (!renamingNode || !trimmedName) {
      setRenamingNode(null)
      return
    }
    if (renamingNode.type === "sprite") {
      onRenameSprite(renamingNode.id, trimmedName)
    } else {
      onRenameFolder(renamingNode.id, trimmedName)
    }
    setRenamingNode(null)
  }

  const handleDeleteNode = (node: TreeNode): void => {
    if (node.type === "sprite") {
      onDeleteSprite(node.id)
      return
    }
    onDeleteFolder(node.id)
  }

  const handleCreateFolder = () => {
    if (creatingFolderParentId === undefined) {
      return
    }
    const createdFolderId = onCreateFolder(newFolderName, creatingFolderParentId)
    if (createdFolderId) {
      if (creatingFolderParentId) {
        setExpandedFolderIds((previous) => new Set([...previous, creatingFolderParentId]))
      }
      setExpandedFolderIds((previous) => new Set([...previous, createdFolderId]))
      setSelectedNode({ type: "folder", id: createdFolderId })
      setCreatingFolderParentId(undefined)
      setNewFolderName("Nova carpeta")
    }
  }

  const navigateNode = (direction: -1 | 1) => {
    if (!visibleNodes.length) {
      return
    }
    const selectedKey = nodeKey(selectedNode)
    const currentIndex = selectedKey ? visibleNodes.findIndex((node) => nodeKey(node) === selectedKey) : -1
    const nextIndex = currentIndex < 0 ? (direction === 1 ? 0 : visibleNodes.length - 1) : currentIndex + direction
    const boundedIndex = Math.max(0, Math.min(visibleNodes.length - 1, nextIndex))
    const targetNode = visibleNodes[boundedIndex]
    if (!targetNode) return
    setSelectedNode(targetNode)
    if (targetNode.type === "sprite") {
      onSelectSprite(targetNode.id)
    }
  }

  const toggleFolderExpansion = (folderId: string) => {
    setExpandedFolderIds((previous) => {
      const next = new Set(previous)
      if (next.has(folderId)) {
        next.delete(folderId)
      } else {
        next.add(folderId)
      }
      return next
    })
  }

  useEffect(() => {
    if (!activeSpriteId) {
      return
    }
    setSelectedNode((previous) => (previous?.type === "sprite" && previous.id === activeSpriteId ? previous : { type: "sprite", id: activeSpriteId }))
  }, [activeSpriteId])

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
    if (!selectedNode) {
      return
    }
    if (selectedNode.type === "sprite" && !sprites.some((entry) => entry.id === selectedNode.id)) {
      setSelectedNode(null)
      return
    }
    if (selectedNode.type === "folder" && !foldersById.has(selectedNode.id)) {
      setSelectedNode(null)
    }
  }, [foldersById, selectedNode, sprites])

  useEffect(() => {
    const close = () => setContextMenu(null)
    window.addEventListener("mousedown", close)
    return () => window.removeEventListener("mousedown", close)
  }, [])

  const renderFolderNode = (folderEntry: SpriteFolderEntry, depth: number) => {
    const isExpanded = expandedFolderIds.has(folderEntry.id)
    const isSelected = selectedNode?.type === "folder" && selectedNode.id === folderEntry.id
    const isRenaming = renamingNode?.type === "folder" && renamingNode.id === folderEntry.id
    const isDragOver = dropTargetFolderId === folderEntry.id
    const isDragging = draggedNode?.type === "folder" && draggedNode.id === folderEntry.id
    const childFolders = folderChildrenByParent.get(folderEntry.id) ?? []
    const childSprites = spritesByFolder.get(folderEntry.id) ?? []
    return (
      <div key={folderEntry.id} className="mvp16-sprite-tree-folder-container">
        <button
          type="button"
          draggable={!isRenaming}
          onDragStart={(event) => handleDragStart(event, { type: "folder", id: folderEntry.id })}
          onDragEnd={handleDragEnd}
          onDragOver={(event) => {
            event.stopPropagation()
            handleDragOver(event, folderEntry.id)
          }}
          onDragLeave={(event) => {
            event.stopPropagation()
            handleDragLeave(event)
          }}
          onDrop={(event) => {
            event.stopPropagation()
            handleDrop(event, folderEntry.id)
          }}
          className={`mvp16-sprite-tree-folder-row flex h-8 w-full items-center gap-1 rounded px-2 text-left text-xs transition-colors ${
            isDragOver ? "bg-indigo-100 ring-2 ring-indigo-300" : isSelected ? "bg-indigo-50 text-indigo-700" : "text-slate-700 hover:bg-slate-100"
          } ${isDragging ? "opacity-40" : ""}`}
          style={{ paddingLeft: `${depth * 14 + 8}px` }}
          onClick={() => setSelectedNode({ type: "folder", id: folderEntry.id })}
          onDoubleClick={(event) => {
            event.preventDefault()
            toggleFolderExpansion(folderEntry.id)
          }}
          onContextMenu={(event: MouseEvent<HTMLButtonElement>) => {
            event.preventDefault()
            setSelectedNode({ type: "folder", id: folderEntry.id })
            setContextMenu({
              x: event.clientX,
              y: event.clientY,
              node: { type: "folder", id: folderEntry.id }
            })
          }}
        >
          <span
            className="mvp16-sprite-tree-folder-toggle inline-flex h-4 w-4 items-center justify-center rounded hover:bg-slate-200"
            onClick={(event) => {
              event.preventDefault()
              event.stopPropagation()
              toggleFolderExpansion(folderEntry.id)
            }}
          >
            <ChevronRight className={`h-3.5 w-3.5 transition-transform ${isExpanded ? "rotate-90" : ""}`} />
          </span>
          {isExpanded ? <FolderOpen className="h-3.5 w-3.5 text-amber-500" /> : <Folder className="h-3.5 w-3.5 text-amber-500" />}
          {isRenaming ? (
            <input
              value={renameValue}
              onChange={(event: ChangeEvent<HTMLInputElement>) => setRenameValue(event.target.value)}
              autoFocus
              onBlur={commitRename}
              onClick={(event) => event.stopPropagation()}
              onKeyDown={(event: KeyboardEvent<HTMLInputElement>) => {
                if (event.key === "Enter") {
                  event.preventDefault()
                  commitRename()
                }
                if (event.key === "Escape") {
                  event.preventDefault()
                  setRenamingNode(null)
                }
              }}
              className="mvp16-sprite-tree-rename-input h-6 w-full rounded border border-slate-300 bg-white px-2 text-xs"
            />
          ) : (
            <span className="truncate">{folderEntry.name}</span>
          )}
        </button>
        {isExpanded && (
          <div className="mvp16-sprite-tree-folder-children">
            {childFolders.map((childFolder) => renderFolderNode(childFolder, depth + 1))}
            {childSprites.map((spriteEntry) => renderSpriteNode(spriteEntry, depth + 1))}
          </div>
        )}
      </div>
    )
  }

  const renderSpriteNode = (spriteEntry: SpriteListEntry, depth: number) => {
    const isActive = spriteEntry.id === activeSpriteId
    const isSelected = selectedNode?.type === "sprite" && selectedNode.id === spriteEntry.id
    const isRenaming = renamingNode?.type === "sprite" && renamingNode.id === spriteEntry.id
    const highlighted = isSelected || isActive
    const isDragging = draggedNode?.type === "sprite" && draggedNode.id === spriteEntry.id
    return (
      <button
        key={spriteEntry.id}
        type="button"
        draggable={!isRenaming}
        onDragStart={(event) => handleDragStart(event, { type: "sprite", id: spriteEntry.id })}
        onDragEnd={handleDragEnd}
        className={`mvp16-sprite-tree-sprite-row flex h-8 w-full items-center gap-2 rounded px-2 text-left text-xs ${
          highlighted ? "bg-indigo-50 text-indigo-700" : "text-slate-700 hover:bg-slate-100"
        } ${isDragging ? "opacity-40" : ""}`}
        style={{ paddingLeft: `${depth * 14 + 8}px` }}
        onClick={() => {
          setSelectedNode({ type: "sprite", id: spriteEntry.id })
          onSelectSprite(spriteEntry.id)
        }}
        onDoubleClick={() => startRename({ type: "sprite", id: spriteEntry.id })}
        onContextMenu={(event: MouseEvent<HTMLButtonElement>) => {
          event.preventDefault()
          setSelectedNode({ type: "sprite", id: spriteEntry.id })
          setContextMenu({
            x: event.clientX,
            y: event.clientY,
            node: { type: "sprite", id: spriteEntry.id }
          })
        }}
      >
        {spriteEntry.previewDataUrl ? (
          <img
            src={spriteEntry.previewDataUrl}
            alt=""
            className="mvp16-sprite-tree-thumb h-5 w-5 shrink-0 object-contain"
            style={{ imageRendering: "pixelated" }}
          />
        ) : (
          <Image className={`h-3.5 w-3.5 shrink-0 ${highlighted ? "text-indigo-500" : "text-slate-400"}`} />
        )}
        <div className="flex min-w-0 flex-1 flex-col">
          {isRenaming ? (
            <input
              value={renameValue}
              onChange={(event: ChangeEvent<HTMLInputElement>) => setRenameValue(event.target.value)}
              autoFocus
              onBlur={commitRename}
              onClick={(event) => event.stopPropagation()}
              onKeyDown={(event: KeyboardEvent<HTMLInputElement>) => {
                if (event.key === "Enter") {
                  event.preventDefault()
                  commitRename()
                }
                if (event.key === "Escape") {
                  event.preventDefault()
                  setRenamingNode(null)
                }
              }}
              className="mvp16-sprite-tree-rename-input h-6 w-full rounded border border-slate-300 bg-white px-2 text-xs"
            />
          ) : (
            <span className="truncate font-medium">{spriteEntry.name}</span>
          )}
          <span className="truncate text-[10px] text-slate-400">
            {spriteEntry.width} x {spriteEntry.height}
            {spriteEntry.isEmpty && <span className="mvp16-sprite-empty-badge ml-1 text-amber-400">· buit</span>}
            {spriteEntry.objectNames.length > 0 && (
              <span className="mvp16-sprite-obj-count ml-1 text-slate-400">
                · {spriteEntry.objectNames[0]}{spriteEntry.objectNames.length > 1 && ` +${spriteEntry.objectNames.length - 1} més`}
              </span>
            )}
          </span>
        </div>
      </button>
    )
  }

  const rootFolders = folderChildrenByParent.get(null) ?? []
  const rootSprites = spritesByFolder.get(null) ?? []

  return (
    <EditorSidebarLayout
      classNamePrefix="mvp16-sprite-tree-panel"
      className="border-r border-slate-200"
      isCollapsed={isCollapsed}
      expandedWidthClass="w-[280px]"
      header={
        <div className={`mvp16-sprite-list-header flex items-center border-b border-slate-200 bg-white px-2 py-2 ${isCollapsed ? "justify-center" : "justify-between"}`}>
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
                  setIsAdding(true)
                }}
                title="Add sprite"
              >
                <Plus className="h-4 w-4" />
              </button>
            </div>
          ) : (
            <>
              <div className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="sm"
                  className="mvp16-sprite-tree-header-action h-7 rounded-md border border-transparent px-2 text-[11px] hover:border-slate-200 hover:bg-slate-100"
                  onClick={() => setCreatingFolderParentId(selectedNode?.type === "folder" ? selectedNode.id : null)}
                >
                  <Folder className="mr-1 h-3.5 w-3.5" />
                  Folder
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="mvp16-sprite-tree-header-action h-7 rounded-md border border-transparent px-2 text-[11px] hover:border-slate-200 hover:bg-slate-100"
                  onClick={() => setIsAdding(true)}
                >
                  <Plus className="mr-1 h-3.5 w-3.5" />
                  Sprite
                </Button>
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
          className={`mvp16-sprite-tree-items flex-1 overflow-y-auto p-2 transition-colors ${
            dropTargetFolderId === null && draggedNode ? "bg-indigo-50/50" : "bg-slate-50"
          }`}
          tabIndex={0}
          onDragOver={(event) => handleDragOver(event, null)}
          onDragLeave={handleDragLeave}
          onDrop={(event) => handleDrop(event, null)}
          onKeyDown={(event) => {
            if (renamingNode || creatingFolderParentId !== undefined) {
              return
            }
            if (event.key === "ArrowDown") {
              event.preventDefault()
              navigateNode(1)
              return
            }
            if (event.key === "ArrowUp") {
              event.preventDefault()
              navigateNode(-1)
              return
            }
            if (event.key === "ArrowRight" && selectedNode?.type === "folder") {
              event.preventDefault()
              setExpandedFolderIds((previous) => new Set([...previous, selectedNode.id]))
              return
            }
            if (event.key === "ArrowLeft" && selectedNode?.type === "folder") {
              event.preventDefault()
              setExpandedFolderIds((previous) => {
                const next = new Set(previous)
                next.delete(selectedNode.id)
                return next
              })
              return
            }
            if (event.key === "F2" && selectedNode) {
              event.preventDefault()
              startRename(selectedNode)
              return
            }
            if ((event.key === "Delete" || event.key === "Backspace") && selectedNode) {
              event.preventDefault()
              handleDeleteNode(selectedNode)
            }
          }}
        >
          {creatingFolderParentId !== undefined && (
            <div className="mvp16-sprite-tree-folder-create mb-2 rounded-lg border border-slate-200 bg-white p-2.5 shadow-sm">
              <div className="mb-2 flex items-center gap-1.5">
                <Folder className="h-3.5 w-3.5 text-amber-500" />
                <span className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                  New folder {creatingFolderParentId ? "inside selected folder" : "at root"}
                </span>
              </div>
              <input
                value={newFolderName}
                onChange={(event: ChangeEvent<HTMLInputElement>) => setNewFolderName(event.target.value)}
                autoFocus
                onKeyDown={(event: KeyboardEvent<HTMLInputElement>) => {
                  if (event.key === "Enter") {
                    event.preventDefault()
                    handleCreateFolder()
                  }
                  if (event.key === "Escape") {
                    event.preventDefault()
                    setCreatingFolderParentId(undefined)
                  }
                }}
                className="mvp16-sprite-tree-folder-create-input h-8 w-full rounded-md border border-slate-300 bg-white px-2.5 text-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400"
              />
              <div className="mt-2 flex items-center justify-end gap-1.5">
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-7 rounded-md px-2 text-[11px] text-slate-600 hover:bg-slate-100"
                  onClick={() => setCreatingFolderParentId(undefined)}
                >
                  Cancel
                </Button>
                <Button size="sm" className="h-7 rounded-md px-2 text-[11px]" onClick={handleCreateFolder}>
                  Create
                </Button>
              </div>
            </div>
          )}
          <div className="flex flex-col gap-1">
            {sprites.length === 0 && spriteFolders.length === 0 && (
              <p className="px-2 py-4 text-center text-xs text-slate-400">No sprites yet</p>
            )}
            {rootFolders.map((folderEntry) => renderFolderNode(folderEntry, 0))}
            {rootSprites.map((spriteEntry) => renderSpriteNode(spriteEntry, 0))}
          </div>
        </div>
      }
      footer={
        isAdding ? (
          <div className="mvp16-sprite-list-footer border-t border-slate-200 bg-white p-3">
            <div className="mvp16-sprite-list-add-form flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-700">Add Sprite</span>
                <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-medium text-slate-500">
                  {selectedNode?.type === "folder" ? foldersById.get(selectedNode.id)?.name ?? "Root" : "Root"}
                </span>
              </div>
              <input
                value={newName}
                onChange={(event: ChangeEvent<HTMLInputElement>) => setNewName(event.target.value)}
                placeholder="Sprite nou"
                onKeyDown={(event: KeyboardEvent<HTMLInputElement>) => {
                  if (event.key === "Enter") handleAdd()
                  if (event.key === "Escape") setIsAdding(false)
                }}
                className="mvp16-sprite-list-name-input flex h-8 w-full rounded-md border border-slate-300 bg-white px-3 py-1 text-xs shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400"
              />
              <div className="mvp16-sprite-list-add-details flex items-end gap-2">
                <label className="mvp16-sprite-list-dimension-field flex min-w-0 flex-1 flex-col gap-1 text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                  Width
                  <input
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    value={newWidth}
                    onChange={(event: ChangeEvent<HTMLInputElement>) => setNewWidth(event.target.value)}
                    onKeyDown={(event: KeyboardEvent<HTMLInputElement>) => {
                      if (event.key === "Enter") handleAdd()
                      if (event.key === "Escape") setIsAdding(false)
                    }}
                    className="mvp16-sprite-list-dimension-input h-8 w-full rounded-md border border-slate-300 bg-white px-2 py-1 text-xs font-normal text-slate-700 shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400"
                  />
                </label>
                <label className="mvp16-sprite-list-dimension-field flex min-w-0 flex-1 flex-col gap-1 text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                  Height
                  <input
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    value={newHeight}
                    onChange={(event: ChangeEvent<HTMLInputElement>) => setNewHeight(event.target.value)}
                    onKeyDown={(event: KeyboardEvent<HTMLInputElement>) => {
                      if (event.key === "Enter") handleAdd()
                      if (event.key === "Escape") setIsAdding(false)
                    }}
                    className="mvp16-sprite-list-dimension-input h-8 w-full rounded-md border border-slate-300 bg-white px-2 py-1 text-xs font-normal text-slate-700 shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400"
                  />
                </label>
                <Button size="sm" className="mvp16-sprite-list-submit-button h-8 w-8 shrink-0 px-0" onClick={handleAdd}>
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
              <div className="flex items-center justify-end gap-1.5">
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-7 rounded-md px-2 text-[11px] text-slate-600 hover:bg-slate-100"
                  onClick={() => setIsAdding(false)}
                >
                  Cancel
                </Button>
                <Button size="sm" className="h-7 rounded-md px-2 text-[11px]" onClick={handleAdd}>
                  Create
                </Button>
              </div>
            </div>
          </div>
        ) : null
      }
      overlay={
        contextMenu ? (
          <div
            className="mvp16-sprite-tree-context-menu fixed z-30 max-h-[280px] min-w-[190px] overflow-y-auto rounded-md border border-slate-200 bg-white p-1 shadow-lg"
            style={{ left: `${contextMenu.x}px`, top: `${contextMenu.y}px` }}
            onMouseDown={(event) => event.stopPropagation()}
          >
            {contextMenu.node.type === "folder" ? (
              <>
                <button
                  type="button"
                  className="mvp16-sprite-tree-context-item flex h-7 w-full items-center gap-2 rounded px-2 text-left text-xs hover:bg-slate-100"
                  onClick={() => {
                    setCreatingFolderParentId(contextMenu.node.id)
                    setContextMenu(null)
                  }}
                >
                  <Plus className="h-3.5 w-3.5" />
                  New Folder
                </button>
                <button
                  type="button"
                  className="mvp16-sprite-tree-context-item flex h-7 w-full items-center gap-2 rounded px-2 text-left text-xs hover:bg-slate-100"
                  onClick={() => startRename(contextMenu.node)}
                >
                  <Pencil className="h-3.5 w-3.5" />
                  Rename
                </button>
                <button
                  type="button"
                  className="mvp16-sprite-tree-context-item flex h-7 w-full items-center gap-2 rounded px-2 text-left text-xs text-rose-600 hover:bg-rose-50"
                  onClick={() => {
                    handleDeleteNode(contextMenu.node)
                    setContextMenu(null)
                  }}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  Delete
                </button>
              </>
            ) : (
              <>
                <button
                  type="button"
                  className="mvp16-sprite-tree-context-item flex h-7 w-full items-center gap-2 rounded px-2 text-left text-xs hover:bg-slate-100"
                  onClick={() => startRename(contextMenu.node)}
                >
                  <Pencil className="h-3.5 w-3.5" />
                  Rename
                </button>
                <button
                  type="button"
                  className="mvp16-sprite-tree-context-item flex h-7 w-full items-center gap-2 rounded px-2 text-left text-xs text-rose-600 hover:bg-rose-50"
                  onClick={() => {
                    handleDeleteNode(contextMenu.node)
                    setContextMenu(null)
                  }}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  Delete
                </button>
              </>
            )}
          </div>
        ) : null
      }
    />
  )
}
