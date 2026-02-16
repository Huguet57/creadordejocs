import { useMemo, useState } from "react"
import { Button } from "../../../components/ui/button.js"

type SpriteOption = {
  id: string
  name: string
  width: number
  height: number
}

type SpritePickerModalProps = {
  isOpen: boolean
  objectName: string
  objectWidth: number
  objectHeight: number
  selectedObjectSpriteId: string | null
  availableSprites: SpriteOption[]
  onClose: () => void
  onSelectExisting: (spriteId: string) => void
  onCreateNew: (name: string) => void
  onEditSprite: (spriteId: string) => void
}

export function SpritePickerModal({
  isOpen,
  objectName,
  objectWidth,
  objectHeight,
  selectedObjectSpriteId,
  availableSprites,
  onClose,
  onSelectExisting,
  onCreateNew,
  onEditSprite
}: SpritePickerModalProps) {
  const [newSpriteName, setNewSpriteName] = useState("Sprite objecte")
  const selectedSpriteEntry = useMemo(
    () => availableSprites.find((spriteEntry) => spriteEntry.id === selectedObjectSpriteId) ?? null,
    [availableSprites, selectedObjectSpriteId]
  )

  if (!isOpen) {
    return null
  }

  return (
    <div className="mvp16-sprite-picker-overlay fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4">
      <div className="mvp16-sprite-picker-modal w-full max-w-xl rounded-lg border border-slate-200 bg-white shadow-xl">
        <div className="mvp16-sprite-picker-header border-b border-slate-200 px-4 py-3">
          <h2 className="text-sm font-semibold text-slate-900">Sprite per {objectName}</h2>
          <p className="text-xs text-slate-500">
            Només sprites de mida {objectWidth} x {objectHeight}
          </p>
        </div>

        <div className="mvp16-sprite-picker-body space-y-4 p-4">
          <section className="space-y-2">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500">Seleccionar existent</h3>
            {availableSprites.length === 0 ? (
              <p className="rounded border border-dashed border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-500">
                No hi ha sprites compatibles encara.
              </p>
            ) : (
              <div className="max-h-44 space-y-1 overflow-y-auto rounded border border-slate-200 bg-slate-50 p-2">
                {availableSprites.map((spriteEntry) => (
                  <button
                    key={spriteEntry.id}
                    type="button"
                    className="mvp16-sprite-picker-row flex w-full items-center justify-between rounded border border-slate-200 bg-white px-2 py-1.5 text-left text-xs text-slate-700 hover:border-indigo-300 hover:bg-indigo-50"
                    onClick={() => onSelectExisting(spriteEntry.id)}
                  >
                    <span className="truncate font-medium">{spriteEntry.name}</span>
                    <span className="text-slate-400">
                      {spriteEntry.width}x{spriteEntry.height}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </section>

          <section className="space-y-2">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500">Crear nou</h3>
            <div className="flex gap-2">
              <input
                value={newSpriteName}
                onChange={(event) => setNewSpriteName(event.target.value)}
                className="h-8 flex-1 rounded border border-slate-300 bg-white px-3 text-xs text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-300"
              />
              <Button size="sm" className="h-8" onClick={() => onCreateNew(newSpriteName.trim())} disabled={!newSpriteName.trim()}>
                Crear i editar
              </Button>
            </div>
          </section>

          <section className="space-y-2">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500">Editar assignat</h3>
            <Button
              variant="outline"
              size="sm"
              className="h-8"
              disabled={!selectedSpriteEntry}
              onClick={() => selectedSpriteEntry && onEditSprite(selectedSpriteEntry.id)}
            >
              {selectedSpriteEntry ? `Editar ${selectedSpriteEntry.name}` : "Cap sprite assignat compatible"}
            </Button>
          </section>
        </div>

        <div className="mvp16-sprite-picker-footer flex justify-end border-t border-slate-200 px-4 py-3">
          <Button variant="outline" size="sm" className="h-8" onClick={onClose}>
            Tancar
          </Button>
        </div>
      </div>
    </div>
  )
}
