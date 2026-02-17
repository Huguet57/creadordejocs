import { Box, Plus, X } from "lucide-react"
import { useCallback, useState, type ChangeEvent, type KeyboardEvent } from "react"
import { Button } from "../../components/ui/button.js"
import type { ProjectV1 } from "@creadordejocs/project-format"

type ObjectListPanelProps = {
  objects: ProjectV1["objects"]
  activeObjectId: string | null
  spriteSources: Record<string, string>
  onSelectObject: (id: string) => void
  onDeselectObject: () => void
  onAddObject: (name: string) => void
  onDeleteObject: () => void
}

export function ObjectListPanel({
  objects,
  activeObjectId,
  spriteSources,
  onSelectObject,
  onDeselectObject,
  onAddObject,
  onDeleteObject
}: ObjectListPanelProps) {
  const [isAdding, setIsAdding] = useState(false)
  const [newObjectName, setNewObjectName] = useState("Objecte nou")

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

  return (
    <aside className="mvp3-object-list-panel flex w-[200px] flex-col border-r border-slate-200 bg-slate-50">
      <div className="flex items-center justify-between border-b border-slate-200 p-3">
        <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Objects</span>
      </div>

      <div
        className="flex-1 overflow-y-auto p-2"
        onClick={(e) => {
          if (e.target === e.currentTarget) {
            onDeselectObject()
          }
        }}
      >
        <div className="flex flex-col gap-1">
          {objects.length === 0 && (
            <p className="px-2 py-4 text-center text-xs text-slate-400">No objects yet</p>
          )}
          {objects.map((objectEntry) => (
            <div
              key={objectEntry.id}
              className={`group flex cursor-pointer items-center justify-between rounded px-2 py-1.5 transition-colors ${
                activeObjectId === objectEntry.id
                  ? "bg-white shadow-sm ring-1 ring-slate-200"
                  : "hover:bg-slate-100"
              }`}
              onClick={() => onSelectObject(objectEntry.id)}
            >
              <button
                type="button"
                className="flex flex-1 items-center gap-2 text-left text-sm"
                onClick={() => onSelectObject(objectEntry.id)}
              >
                {objectEntry.spriteId && spriteSources[objectEntry.spriteId] ? (
                  <img
                    src={spriteSources[objectEntry.spriteId]}
                    alt=""
                    className="objlist-sprite-icon h-5 w-5 object-contain"
                    style={{ imageRendering: "pixelated" }}
                  />
                ) : (
                  <Box className={`h-3.5 w-3.5 ${activeObjectId === objectEntry.id ? "text-blue-500" : "text-slate-400"}`} />
                )}
                <span className={`truncate ${activeObjectId === objectEntry.id ? "font-medium text-slate-900" : "text-slate-600"}`}>
                  {objectEntry.name}
                </span>
              </button>
              <button
                type="button"
                className={`opacity-0 transition-opacity hover:text-red-500 group-hover:opacity-100 ${activeObjectId === objectEntry.id ? "opacity-100" : ""}`}
                onClick={(e) => {
                  e.stopPropagation()
                  onSelectObject(objectEntry.id)
                  onDeleteObject()
                }}
                title="Delete object"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}
        </div>
      </div>

      <div className="border-t border-slate-200 bg-white p-3 space-y-2">
        {isAdding ? (
          <div className="mvp3-object-add-panel rounded-md border border-slate-200 bg-slate-50 p-2">
            <div className="mvp3-object-add-panel-header mb-2 flex items-center justify-between">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">Add Object</p>
              <button
                type="button"
                className="mvp3-object-add-panel-close inline-flex h-6 w-6 items-center justify-center rounded text-slate-400 transition-colors hover:bg-slate-200 hover:text-slate-700"
                onClick={() => setIsAdding(false)}
                title="Cancel"
                aria-label="Cancel add object"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
            <div className="flex gap-2">
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
                className="flex h-8 w-full rounded-md border border-slate-300 bg-white px-3 py-1 text-xs shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400"
                placeholder="Name..."
              />
              <Button
                size="sm"
                className="h-8 w-8 shrink-0 px-0"
                onClick={handleAddObject}
                title="Add object"
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          </div>
        ) : (
          <Button
            variant="outline"
            size="sm"
            className="w-full h-8 text-xs"
            onClick={() => setIsAdding(true)}
          >
            <Plus className="mr-2 h-3.5 w-3.5" />
            Add Object
          </Button>
        )}
      </div>
    </aside>
  )
}
