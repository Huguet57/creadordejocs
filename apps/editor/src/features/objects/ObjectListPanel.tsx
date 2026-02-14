import { Box, Plus, Trash2 } from "lucide-react"
import { useState, type ChangeEvent, type KeyboardEvent } from "react"
import { Button } from "../../components/ui/button.js"
import { Input } from "../../components/ui/input.js"
import type { ProjectV1 } from "@creadordejocs/project-format"

type ObjectListPanelProps = {
  objects: ProjectV1["objects"]
  activeObjectId: string | null
  onSelectObject: (id: string) => void
  onAddObject: (name: string) => void
  onDeleteObject: () => void
}

export function ObjectListPanel({
  objects,
  activeObjectId,
  onSelectObject,
  onAddObject,
  onDeleteObject
}: ObjectListPanelProps) {
  const [newObjectName, setNewObjectName] = useState("Objecte nou")

  const blockUndoShortcuts = (event: KeyboardEvent<HTMLInputElement>): void => {
    if ((event.metaKey || event.ctrlKey) && (event.key.toLowerCase() === "z" || event.key.toLowerCase() === "y")) {
      event.preventDefault()
    }
  }

  const handleAddObject = () => {
    if (!newObjectName.trim()) return
    onAddObject(newObjectName)
    setNewObjectName("Objecte nou")
  }

  return (
    <aside className="mvp3-object-list-panel flex w-[200px] flex-col border-r border-slate-200 bg-slate-50">
      <div className="flex items-center justify-between border-b border-slate-200 p-3">
        <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Objects</span>
      </div>

      <div className="flex-1 overflow-y-auto p-2">
        <div className="flex flex-col gap-1">
          {objects.length === 0 && (
            <p className="px-2 py-4 text-center text-xs text-slate-400">No objects yet</p>
          )}
          {objects.map((objectEntry) => (
            <button
              key={objectEntry.id}
              type="button"
              className={`flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-sm transition-colors ${
                activeObjectId === objectEntry.id
                  ? "bg-white font-medium text-slate-900 shadow-sm ring-1 ring-slate-200"
                  : "text-slate-600 hover:bg-slate-100"
              }`}
              onClick={() => onSelectObject(objectEntry.id)}
            >
              <Box className={`h-3.5 w-3.5 ${activeObjectId === objectEntry.id ? "text-blue-500" : "text-slate-400"}`} />
              <span className="truncate">{objectEntry.name}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="border-t border-slate-200 p-3 space-y-3">
        <div className="flex gap-2">
          <Input
            value={newObjectName}
            onChange={(e: ChangeEvent<HTMLInputElement>) => setNewObjectName(e.target.value)}
            onKeyDown={(e) => {
              blockUndoShortcuts(e)
              if (e.key === "Enter") handleAddObject()
            }}
            className="h-8 text-xs"
            placeholder="Name..."
          />
          <Button
            size="sm"
            className="h-8 w-8 px-0"
            onClick={handleAddObject}
            title="Add object"
          >
            <Plus className="h-4 w-4" />
          </Button>
        </div>
        
        <Button
          variant="ghost"
          size="sm"
          className="w-full justify-start text-red-500 hover:bg-red-50 hover:text-red-600 h-8 text-xs"
          onClick={onDeleteObject}
          disabled={!activeObjectId}
        >
          <Trash2 className="mr-2 h-3.5 w-3.5" />
          Delete Object
        </Button>
      </div>
    </aside>
  )
}
