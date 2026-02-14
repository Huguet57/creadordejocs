import { useState, type ChangeEvent, type KeyboardEvent } from "react"
import type { EditorController } from "../editor-state/use-editor-controller.js"
import { Button } from "../../components/ui/button.js"
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card.js"
import { Input } from "../../components/ui/input.js"
import { Label } from "../../components/ui/label.js"

type SpriteEditorSectionProps = {
  controller: EditorController
}

export function SpriteEditorSection({ controller }: SpriteEditorSectionProps) {
  const [spriteName, setSpriteName] = useState("Sprite nou")

  const blockUndoShortcuts = (event: KeyboardEvent<HTMLInputElement>): void => {
    if ((event.metaKey || event.ctrlKey) && (event.key.toLowerCase() === "z" || event.key.toLowerCase() === "y")) {
      event.preventDefault()
    }
  }

  return (
    <Card className="mvp15-sprite-editor-panel">
      <CardHeader>
        <CardTitle>Sprite editor</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="sprite-name-input">Sprite name</Label>
          <div className="flex gap-2">
            <Input
              id="sprite-name-input"
              data-testid="sprite-name-input"
              value={spriteName}
              onKeyDown={blockUndoShortcuts}
              onChange={(event: ChangeEvent<HTMLInputElement>) => setSpriteName(event.target.value)}
            />
            <Button
              data-testid="add-sprite-button"
              onClick={() => {
                controller.addSprite(spriteName)
                setSpriteName("Sprite nou")
              }}
            >
              + Sprite
            </Button>
          </div>
        </div>

        <div className="rounded-md border border-slate-200 p-3">
          <p className="text-xs font-semibold text-slate-600">Upload pipeline</p>
          <p className="mt-1 text-xs text-slate-500">
            Upload real es connecta a MVP 2. Ara pots preparar `assetSource` i estat.
          </p>
          <Button type="button" variant="outline" size="sm" className="mt-2" disabled>
            Upload (coming soon)
          </Button>
        </div>

        <ul className="space-y-2">
          {controller.project.resources.sprites.length === 0 && (
            <li className="text-sm text-slate-500">No hi ha sprites encara.</li>
          )}
          {controller.project.resources.sprites.map((spriteEntry) => (
            <li
              key={spriteEntry.id}
              className="mvp15-sprite-row flex items-center justify-between gap-2 rounded border border-slate-200 p-2"
            >
              <div>
                <p className="text-sm font-medium">{spriteEntry.name}</p>
                <p className="text-xs text-slate-500">uploadStatus: {spriteEntry.uploadStatus}</p>
              </div>
              <Input
                className="max-w-56"
                value={spriteEntry.assetSource}
                placeholder="/assets/player.png"
                onChange={(event: ChangeEvent<HTMLInputElement>) =>
                  controller.updateSpriteSource(spriteEntry.id, event.target.value)
                }
              />
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  )
}
