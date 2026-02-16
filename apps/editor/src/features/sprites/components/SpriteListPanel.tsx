import { Image, Plus } from "lucide-react"
import { useState, type ChangeEvent, type KeyboardEvent } from "react"
import { Button } from "../../../components/ui/button.js"

type SpriteListEntry = {
  id: string
  name: string
  width: number
  height: number
}

type SpriteListPanelProps = {
  sprites: SpriteListEntry[]
  activeSpriteId: string | null
  onSelectSprite: (spriteId: string) => void
  onAddSprite: (name: string) => void
}

export function SpriteListPanel({ sprites, activeSpriteId, onSelectSprite, onAddSprite }: SpriteListPanelProps) {
  const [isAdding, setIsAdding] = useState(false)
  const [newName, setNewName] = useState("Sprite nou")

  const handleAdd = () => {
    if (!newName.trim()) return
    onAddSprite(newName.trim())
    setNewName("Sprite nou")
    setIsAdding(false)
  }

  return (
    <aside className="mvp16-sprite-list-panel flex w-[260px] flex-col border-r border-slate-200 bg-slate-50">
      <div className="mvp16-sprite-list-header flex items-center justify-between border-b border-slate-200 p-3">
        <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">Sprites</span>
      </div>

      <div className="mvp16-sprite-list-items flex-1 overflow-y-auto p-2">
        <div className="flex flex-col gap-1">
          {sprites.length === 0 && <p className="px-2 py-4 text-center text-xs text-slate-400">No sprites yet</p>}
          {sprites.map((spriteEntry) => {
            const isActive = spriteEntry.id === activeSpriteId
            return (
              <button
                key={spriteEntry.id}
                type="button"
                className={`mvp16-sprite-list-row flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-sm ${
                  isActive ? "bg-indigo-50 text-indigo-700" : "text-slate-700 hover:bg-slate-100"
                }`}
                onClick={() => onSelectSprite(spriteEntry.id)}
              >
                <Image className={`h-3.5 w-3.5 ${isActive ? "text-indigo-500" : "text-slate-400"}`} />
                <div className="flex min-w-0 flex-1 flex-col">
                  <span className="truncate font-medium">{spriteEntry.name}</span>
                  <span className="truncate text-[10px] text-slate-400">
                    {spriteEntry.width} x {spriteEntry.height}
                  </span>
                </div>
              </button>
            )
          })}
        </div>
      </div>

      <div className="mvp16-sprite-list-footer border-t border-slate-200 bg-white p-3">
        {isAdding ? (
          <div className="flex gap-2">
            <input
              value={newName}
              onChange={(event: ChangeEvent<HTMLInputElement>) => setNewName(event.target.value)}
              onKeyDown={(event: KeyboardEvent<HTMLInputElement>) => {
                if (event.key === "Enter") handleAdd()
                if (event.key === "Escape") setIsAdding(false)
              }}
              className="flex h-8 w-full rounded-md border border-slate-300 bg-white px-3 py-1 text-xs shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400"
            />
            <Button size="sm" className="h-8 w-8 shrink-0 px-0" onClick={handleAdd}>
              <Plus className="h-4 w-4" />
            </Button>
          </div>
        ) : (
          <Button variant="outline" size="sm" className="h-8 w-full text-xs" onClick={() => setIsAdding(true)}>
            <Plus className="mr-2 h-3.5 w-3.5" />
            Add Sprite
          </Button>
        )}
      </div>
    </aside>
  )
}
