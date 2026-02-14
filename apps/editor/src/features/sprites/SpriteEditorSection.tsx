import { useCallback, useEffect, useRef, useState, type ChangeEvent, type KeyboardEvent } from "react"
import { Image, Plus, Upload } from "lucide-react"
import type { EditorController } from "../editor-state/use-editor-controller.js"
import { Button } from "../../components/ui/button.js"
import { AssetUploadError, uploadAsset, validateAssetFile } from "../assets/asset-upload.js"

type SpriteEditorSectionProps = {
  controller: EditorController
}

export function SpriteEditorSection({ controller }: SpriteEditorSectionProps) {
  const [isAdding, setIsAdding] = useState(false)
  const [spriteName, setSpriteName] = useState("Sprite nou")
  const [validationMessage, setValidationMessage] = useState("")
  const [uploadingSpriteId, setUploadingSpriteId] = useState<string | null>(null)
  const idleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const resetIdleTimer = () => {
    if (idleTimerRef.current) clearTimeout(idleTimerRef.current)
    idleTimerRef.current = setTimeout(() => setIsAdding(false), 5000)
  }

  useEffect(() => {
    if (isAdding) {
      resetIdleTimer()
    }
    return () => {
      if (idleTimerRef.current) clearTimeout(idleTimerRef.current)
    }
  }, [isAdding])

  const inputCallbackRef = useCallback((node: HTMLInputElement | null) => {
    if (node) node.select()
  }, [])

  const blockUndoShortcuts = (event: KeyboardEvent<HTMLInputElement>): void => {
    if ((event.metaKey || event.ctrlKey) && (event.key.toLowerCase() === "z" || event.key.toLowerCase() === "y")) {
      event.preventDefault()
    }
  }

  const handleAddSprite = () => {
    if (!spriteName.trim()) return
    controller.addSprite(spriteName)
    setSpriteName("Sprite nou")
    setIsAdding(false)
  }

  const sprites = controller.project.resources.sprites

  return (
    <div className="mvp15-sprite-editor-container flex h-[600px] w-full overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
      {/* Left panel: Sprite list */}
      <aside className="flex w-[220px] flex-col border-r border-slate-200 bg-slate-50">
        <div className="flex items-center justify-between border-b border-slate-200 p-3">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Sprites</span>
        </div>

        <div className="flex-1 overflow-y-auto p-2">
          <div className="flex flex-col gap-1">
            {sprites.length === 0 && (
              <p className="px-2 py-4 text-center text-xs text-slate-400">No sprites yet</p>
            )}
            {sprites.map((sprite) => (
              <div
                key={sprite.id}
                className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-sm text-slate-600"
              >
                <Image className="h-3.5 w-3.5 text-slate-400" />
                <div className="flex flex-col overflow-hidden">
                  <span className="truncate font-medium text-slate-900">{sprite.name}</span>
                  <span className="truncate text-[10px] text-slate-400">
                    {sprite.assetSource || "no source"}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="border-t border-slate-200 bg-white p-3">
          {isAdding ? (
            <div className="flex gap-2">
              <input
                ref={inputCallbackRef}
                value={spriteName}
                onChange={(e: ChangeEvent<HTMLInputElement>) => {
                  setSpriteName(e.target.value)
                  resetIdleTimer()
                }}
                onKeyDown={(e: KeyboardEvent<HTMLInputElement>) => {
                  blockUndoShortcuts(e)
                  resetIdleTimer()
                  if (e.key === "Enter") handleAddSprite()
                  if (e.key === "Escape") setIsAdding(false)
                }}
                className="flex h-8 w-full rounded-md border border-slate-300 bg-white px-3 py-1 text-xs shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400"
                placeholder="Name..."
              />
              <Button
                size="sm"
                className="h-8 w-8 shrink-0 px-0"
                onClick={handleAddSprite}
                title="Add sprite"
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          ) : (
            <Button
              variant="outline"
              size="sm"
              className="w-full h-8 text-xs"
              onClick={() => setIsAdding(true)}
            >
              <Plus className="mr-2 h-3.5 w-3.5" />
              Add Sprite
            </Button>
          )}
        </div>
      </aside>

      {/* Right panel: Asset source editor */}
      <div className="flex flex-1 flex-col">
        <div className="flex h-12 items-center border-b border-slate-200 px-4">
          <h3 className="text-sm font-semibold text-slate-800">Asset Sources</h3>
        </div>

        <div className="flex-1 overflow-y-auto p-4 bg-slate-50/50">
          {validationMessage && (
            <p className="mb-3 rounded border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-600">
              {validationMessage}
            </p>
          )}

          {sprites.length === 0 ? (
            <div className="flex h-full items-center justify-center text-slate-400">
              <p>Add a sprite to configure its source</p>
            </div>
          ) : (
            <div className="space-y-2">
              {sprites.map((sprite) => (
                <div
                  key={sprite.id}
                  className="group flex items-center gap-3 rounded-md border border-slate-200 bg-white p-3 shadow-sm"
                >
                  <div className="min-w-[100px]">
                    <p className="text-sm font-medium text-slate-800">{sprite.name}</p>
                    <p className="text-[10px] text-slate-400">
                      {sprite.uploadStatus === "ready" ? "ready" : "not connected"}
                    </p>
                  </div>

                  <input
                    value={sprite.assetSource}
                    placeholder="/assets/player.png"
                    onChange={(e: ChangeEvent<HTMLInputElement>) =>
                      controller.updateSpriteSource(sprite.id, e.target.value)
                    }
                    disabled={uploadingSpriteId === sprite.id}
                    className="flex h-8 flex-1 rounded-md border border-slate-200 bg-slate-50 px-3 py-1 text-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400"
                  />

                  <label className="mvp15-sprite-upload-label flex h-8 cursor-pointer items-center gap-1.5 rounded-md border border-slate-200 bg-white px-3 text-xs text-slate-600 transition-colors hover:bg-slate-50 hover:text-slate-900">
                    <Upload className="h-3.5 w-3.5" />
                    {uploadingSpriteId === sprite.id ? "Uploading..." : "Import"}
                    <input
                      className="hidden"
                      type="file"
                      accept=".png,.jpg,.jpeg,.gif,.webp"
                      disabled={uploadingSpriteId === sprite.id}
                      onChange={(event) => {
                        const inputElement = event.currentTarget
                        const selectedFile = inputElement.files?.[0]
                        if (!selectedFile) return

                        void (async () => {
                          if (!validateAssetFile(selectedFile, "sprite")) {
                            setValidationMessage("Invalid format. Use PNG, JPG, GIF or WEBP.")
                            inputElement.value = ""
                            return
                          }

                          setValidationMessage("")
                          setUploadingSpriteId(sprite.id)
                          try {
                            const uploadResult = await uploadAsset({
                              file: selectedFile,
                              kind: "sprite",
                              resourceId: sprite.id
                            })
                            controller.updateSpriteSource(sprite.id, uploadResult.assetSource)
                          } catch (error) {
                            if (error instanceof AssetUploadError) {
                              setValidationMessage(`Upload failed: ${error.message}`)
                            } else {
                              setValidationMessage("Upload failed. Verify storage configuration and retry.")
                            }
                          } finally {
                            setUploadingSpriteId(null)
                            inputElement.value = ""
                          }
                        })()
                      }}
                    />
                  </label>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
