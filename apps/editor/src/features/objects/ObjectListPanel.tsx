import { Box, ChevronLeft, ChevronRight, Plus, Trash2 } from "lucide-react"
import { useCallback, useEffect, useRef, useState, type ChangeEvent, type KeyboardEvent, type MouseEvent } from "react"
import { Button } from "../../components/ui/button.js"
import type { ProjectV1 } from "@creadordejocs/project-format"

type ContextMenuState = {
  x: number
  y: number
  objectId: string | null
} | null

type ObjectListPanelProps = {
  objects: ProjectV1["objects"]
  openTabIds: string[]
  spriteSources: Record<string, string>
  onSelectObject: (id: string) => void
  onOpenInNewTab: (id: string) => void
  onAddObject: (name: string) => void
  onDeleteObject: (id: string) => void
}

export function ObjectListPanel({
  objects,
  openTabIds,
  spriteSources,
  onSelectObject,
  onOpenInNewTab,
  onAddObject,
  onDeleteObject
}: ObjectListPanelProps) {
  const [isCollapsed, setIsCollapsed] = useState(false)
  const [isAdding, setIsAdding] = useState(false)
  const [newObjectName, setNewObjectName] = useState("Objecte nou")
  const [contextMenu, setContextMenu] = useState<ContextMenuState>(null)
  const contextMenuRef = useRef<HTMLDivElement>(null)

  const inputCallbackRef = useCallback((node: HTMLInputElement | null) => {
    if (node) node.select()
  }, [])

  const blockUndoShortcuts = (event: KeyboardEvent<HTMLInputElement>): void => {
    if ((event.metaKey || event.ctrlKey) && (event.key.toLowerCase() === "z" || event.key.toLowerCase() === "y")) {
      event.preventDefault()
    }
  }

  const handleAddObject = () => {
    if (!newObjectName.trim()) return
    onAddObject(newObjectName)
    setNewObjectName("Objecte nou")
    setIsAdding(false)
  }

  const handleContextMenu = (e: MouseEvent, objectId: string | null) => {
    e.preventDefault()
    setContextMenu({ x: e.clientX, y: e.clientY, objectId })
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
                setIsAdding(true)
              }}
              title="Add object"
            >
              <Plus className="h-4 w-4" />
            </button>
          </div>
        ) : (
          <>
            <button
              type="button"
              className="objlist-add-btn inline-flex h-7 w-7 items-center justify-center rounded text-slate-400 transition-colors hover:bg-slate-200 hover:text-slate-700"
              onClick={() => setIsAdding(true)}
              title="Add object"
            >
              <Plus className="h-4 w-4" />
            </button>
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
        <>
          {isAdding && (
            <div className="objlist-add-form border-b border-slate-200 bg-white p-2">
              <div className="flex gap-1.5">
                <input
                  ref={inputCallbackRef}
                  value={newObjectName}
                  onChange={(e: ChangeEvent<HTMLInputElement>) => {
                    setNewObjectName(e.target.value)
                  }}
                  onKeyDown={(e: KeyboardEvent<HTMLInputElement>) => {
                    blockUndoShortcuts(e)
                    if (e.key === "Enter") handleAddObject()
                    if (e.key === "Escape") setIsAdding(false)
                  }}
                  className="flex h-7 w-full rounded-md border border-slate-300 bg-white px-2 py-1 text-xs shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400"
                  placeholder="Name..."
                />
                <Button
                  size="sm"
                  className="objlist-add-confirm h-7 w-7 shrink-0 px-0"
                  onClick={handleAddObject}
                  title="Add object"
                >
                  <Plus className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          )}

          <div
            className="flex-1 overflow-y-auto p-2"
            onContextMenu={(e) => handleContextMenu(e, null)}
          >
            <div className="flex flex-col gap-0.5">
              {objects.length === 0 && !isAdding && (
                <p className="px-2 py-4 text-center text-xs text-slate-400">
                  Right-click or press + to add
                </p>
              )}
              {objects.map((objectEntry) => {
                const isOpen = openTabIds.includes(objectEntry.id)
                return (
                  <div
                    key={objectEntry.id}
                    className={`objlist-item group flex cursor-pointer items-center rounded px-2 py-1.5 transition-colors ${
                      isOpen
                        ? "bg-white/60 hover:bg-white/80"
                        : "hover:bg-slate-100"
                    }`}
                    onClick={() => onSelectObject(objectEntry.id)}
                    onContextMenu={(e) => {
                      e.stopPropagation()
                      handleContextMenu(e, objectEntry.id)
                    }}
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
                        <Box className="h-3.5 w-3.5 shrink-0 text-slate-400" />
                      )}
                      <span className={`truncate ${isOpen ? "font-medium text-slate-700" : "text-slate-600"}`}>
                        {objectEntry.name}
                      </span>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </>
      )}

      {contextMenu && (
        <div
          ref={contextMenuRef}
          className="objlist-context-menu fixed z-50 min-w-[160px] rounded-md border border-slate-200 bg-white py-1 shadow-lg"
          style={{ left: contextMenu.x, top: contextMenu.y }}
        >
          {contextMenu.objectId ? (
            <>
              <button
                type="button"
                className="objlist-ctx-open flex w-full items-center gap-2 px-3 py-1.5 text-left text-xs text-slate-700 transition-colors hover:bg-slate-100"
                onClick={() => {
                  onSelectObject(contextMenu.objectId!)
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
                  onOpenInNewTab(contextMenu.objectId!)
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
                  onDeleteObject(contextMenu.objectId!)
                  closeContextMenu()
                }}
              >
                <Trash2 className="h-3.5 w-3.5" />
                Delete
              </button>
            </>
          ) : (
            <button
              type="button"
              className="objlist-ctx-new flex w-full items-center gap-2 px-3 py-1.5 text-left text-xs text-slate-700 transition-colors hover:bg-slate-100"
              onClick={() => {
                closeContextMenu()
                setIsAdding(true)
              }}
            >
              <Plus className="h-3.5 w-3.5 text-slate-400" />
              New object
            </button>
          )}
        </div>
      )}
    </aside>
  )
}
