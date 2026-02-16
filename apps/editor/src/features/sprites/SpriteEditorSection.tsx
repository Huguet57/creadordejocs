import { useEffect } from "react"
import type { EditorController } from "../editor-state/use-editor-controller.js"
import { SpriteCanvasGrid } from "./components/SpriteCanvasGrid.js"
import { SpriteImportCropModal } from "./components/SpriteImportCropModal.js"
import { SpriteListPanel } from "./components/SpriteListPanel.js"
import { SpriteToolbar } from "./components/SpriteToolbar.js"
import { useSpriteEditorState } from "./hooks/use-sprite-editor-state.js"
import { useSpriteImport } from "./hooks/use-sprite-import.js"
import { useSpritePixelActions } from "./hooks/use-sprite-pixel-actions.js"
import { normalizePixelGrid } from "./utils/sprite-grid.js"

type SpriteEditorSectionProps = {
  controller: EditorController
}

export function SpriteEditorSection({ controller }: SpriteEditorSectionProps) {
  const sprites = controller.project.resources.sprites
  const spriteIds = sprites.map((spriteEntry) => spriteEntry.id)
  const spriteEditorState = useSpriteEditorState()
  const {
    activeTool,
    setActiveTool,
    activeColor,
    setActiveColor,
    zoom,
    setZoom
  } = spriteEditorState
  const activeSpriteId = controller.activeSpriteId

  useEffect(() => {
    if (!activeSpriteId && spriteIds[0]) {
      controller.setActiveSpriteId(spriteIds[0])
      return
    }
    if (activeSpriteId && !spriteIds.includes(activeSpriteId)) {
      controller.setActiveSpriteId(spriteIds[0] ?? null)
    }
  }, [activeSpriteId, controller, spriteIds])

  const selectedSprite =
    sprites.find((spriteEntry) => spriteEntry.id === activeSpriteId) ??
    sprites[0] ??
    null
  const selectedSpritePixels = selectedSprite
    ? normalizePixelGrid(selectedSprite.pixelsRgba, selectedSprite.width, selectedSprite.height)
    : []

  const spriteImport = useSpriteImport({
    spriteId: selectedSprite?.id ?? "",
    width: selectedSprite?.width ?? 32,
    height: selectedSprite?.height ?? 32,
    onSourceImported: (assetSource) => {
      if (!selectedSprite) return
      controller.updateSpriteSource(selectedSprite.id, assetSource)
    },
    onPixelsImported: (pixelsRgba) => {
      if (!selectedSprite) return
      controller.updateSpritePixels(selectedSprite.id, pixelsRgba)
    }
  })

  const pixelActions = useSpritePixelActions({
    width: selectedSprite?.width ?? 1,
    height: selectedSprite?.height ?? 1,
    pixelsRgba: selectedSpritePixels,
    activeColor,
    onPixelsChange: (nextPixelsRgba) => {
      if (!selectedSprite) return
      controller.updateSpritePixels(selectedSprite.id, nextPixelsRgba)
    }
  })

  return (
    <div className="mvp16-sprite-editor-shell flex h-[600px] w-full overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
      <SpriteListPanel
        sprites={sprites.map((spriteEntry) => ({
          id: spriteEntry.id,
          name: spriteEntry.name,
          width: spriteEntry.width,
          height: spriteEntry.height
        }))}
        activeSpriteId={selectedSprite?.id ?? null}
        onSelectSprite={(spriteId) => controller.setActiveSpriteId(spriteId)}
        onAddSprite={(name) => controller.addSprite(name)}
      />

      <div className="mvp16-sprite-editor-main flex flex-1 flex-col">
        <SpriteToolbar
          activeTool={activeTool}
          activeColor={activeColor}
          zoom={zoom}
          isImporting={spriteImport.isImporting}
          onToolChange={setActiveTool}
          onColorChange={setActiveColor}
          onZoomChange={setZoom}
          onImportFile={(selectedFile) => {
            if (!selectedSprite) return
            void spriteImport.openCropModal(selectedFile)
          }}
        />
        {spriteImport.message && (
          <p className="mx-4 mt-3 rounded border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-600">{spriteImport.message}</p>
        )}
        <SpriteImportCropModal
          isOpen={spriteImport.isCropOpen}
          imageElement={spriteImport.pendingImage}
          targetWidth={selectedSprite?.width ?? 32}
          targetHeight={selectedSprite?.height ?? 32}
          onConfirm={(cropRect) => void spriteImport.confirmCrop(cropRect)}
          onCancel={spriteImport.cancelCrop}
        />

        {selectedSprite ? (
          <>
            <div className="mvp16-sprite-source-row flex items-center gap-2 border-b border-slate-200 bg-slate-50 px-4 py-2">
              <span className="text-xs font-semibold text-slate-500">Source</span>
              <input
                value={selectedSprite.assetSource}
                placeholder="/assets/player.png"
                onChange={(event) => controller.updateSpriteSource(selectedSprite.id, event.target.value)}
                className="h-7 flex-1 rounded border border-slate-300 bg-white px-2 text-xs text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-300"
              />
            </div>
            <SpriteCanvasGrid
              width={selectedSprite.width}
              height={selectedSprite.height}
              pixelsRgba={selectedSpritePixels}
              zoom={zoom}
              activeTool={activeTool}
              onPaint={pixelActions.paintAt}
            />
          </>
        ) : (
          <div className="flex flex-1 items-center justify-center bg-slate-50 text-sm text-slate-400">
            Add a sprite to start painting pixels.
          </div>
        )}
      </div>
    </div>
  )
}
