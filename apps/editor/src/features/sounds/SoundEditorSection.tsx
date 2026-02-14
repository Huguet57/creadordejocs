import { useState, type ChangeEvent, type KeyboardEvent } from "react"
import type { EditorController } from "../editor-state/use-editor-controller.js"
import { Button } from "../../components/ui/button.js"
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card.js"
import { Input } from "../../components/ui/input.js"
import { Label } from "../../components/ui/label.js"

type SoundEditorSectionProps = {
  controller: EditorController
}

export function SoundEditorSection({ controller }: SoundEditorSectionProps) {
  const [soundName, setSoundName] = useState("So nou")
  const [validationMessage, setValidationMessage] = useState<string>("")

  const blockUndoShortcuts = (event: KeyboardEvent<HTMLInputElement>): void => {
    if ((event.metaKey || event.ctrlKey) && (event.key.toLowerCase() === "z" || event.key.toLowerCase() === "y")) {
      event.preventDefault()
    }
  }

  return (
    <Card className="mvp15-sound-editor-panel">
      <CardHeader>
        <CardTitle>Sound editor</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="sound-name-input">Sound name</Label>
          <div className="flex gap-2">
            <Input
              id="sound-name-input"
              value={soundName}
              onKeyDown={blockUndoShortcuts}
              onChange={(event: ChangeEvent<HTMLInputElement>) => setSoundName(event.target.value)}
            />
            <Button
              onClick={() => {
                controller.addSound(soundName)
                setSoundName("So nou")
              }}
            >
              + Sound
            </Button>
          </div>
        </div>

        <div className="rounded-md border border-slate-200 p-3">
          <p className="text-xs font-semibold text-slate-600">Upload pipeline</p>
          <p className="mt-1 text-xs text-slate-500">
            Pots importar WAV/MP3/OGG. Guardem nom/URL a `assetSource`.
          </p>
          {validationMessage && <p className="mt-2 text-xs text-rose-600">{validationMessage}</p>}
        </div>

        <ul className="space-y-2">
          {controller.project.resources.sounds.length === 0 && (
            <li className="text-sm text-slate-500">No hi ha sons encara.</li>
          )}
          {controller.project.resources.sounds.map((soundEntry) => (
            <li
              key={soundEntry.id}
              className="mvp15-sound-row flex items-center justify-between gap-2 rounded border border-slate-200 p-2"
            >
              <div>
                <p className="text-sm font-medium">{soundEntry.name}</p>
                <p className="text-xs text-slate-500">uploadStatus: {soundEntry.uploadStatus}</p>
              </div>
              <Input
                className="max-w-56"
                value={soundEntry.assetSource}
                placeholder="/assets/sound.wav"
                onChange={(event: ChangeEvent<HTMLInputElement>) =>
                  controller.updateSoundSource(soundEntry.id, event.target.value)
                }
              />
              <label className="mvp2-sound-upload-label cursor-pointer rounded border border-slate-300 px-2 py-1 text-xs">
                Import file
                <input
                  className="hidden"
                  type="file"
                  accept=".wav,.mp3,.ogg"
                  onChange={(event) => {
                    const selectedFile = event.target.files?.[0]
                    if (!selectedFile) return
                    const valid = /\.(wav|mp3|ogg)$/i.test(selectedFile.name)
                    if (!valid) {
                      setValidationMessage("Format invàlid. Usa WAV, MP3 o OGG.")
                      return
                    }
                    setValidationMessage("")
                    controller.updateSoundSource(soundEntry.id, selectedFile.name)
                  }}
                />
              </label>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  )
}
