import { useEffect, useState, type ChangeEvent } from "react"
import type { EditorController } from "../editor-state/use-editor-controller.js"
import { spriteAssignedObjectNames } from "../editor-state/use-editor-controller.js"
import { SpriteCanvasGrid } from "./components/SpriteCanvasGrid.js"
import { SpriteImportButton } from "./components/SpriteImportButton.js"
import { SpriteImportCropModal } from "./components/SpriteImportCropModal.js"
import { SpriteListPanel } from "./components/SpriteListPanel.js"
import { SpriteToolbar } from "./components/SpriteToolbar.js"
import { useSpriteEditorState } from "./hooks/use-sprite-editor-state.js"
import { useSpriteImport } from "./hooks/use-sprite-import.js"
import { useSpritePixelActions } from "./hooks/use-sprite-pixel-actions.js"
import { normalizePixelGrid } from "./utils/sprite-grid.js"
import { hasVisibleSpritePixels } from "./utils/has-visible-pixels.js"
import { spritePixelsToDataUrl } from "./utils/sprite-preview-source.js"

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
    lastPaintTool,
    activeColor,
    setActiveColor,
    zoom,
    setZoom,
    showGrid,
    setShowGrid,
    toolOptions,
    updateToolOptions
  } = spriteEditorState
  const activeSpriteId = controller.activeSpriteId
  const [magicWandSelection, setMagicWandSelection] = useState<Set<number>>(new Set())
  const [pickerPreviewColor, setPickerPreviewColor] = useState<string | null>(null)

  useEffect(() => {
    if (!activeSpriteId && spriteIds[0]) {
      controller.setActiveSpriteId(spriteIds[0])
      return
    }
    if (activeSpriteId && !spriteIds.includes(activeSpriteId)) {
      controller.setActiveSpriteId(spriteIds[0] ?? null)
    }
  }, [activeSpriteId, controller, spriteIds])

  useEffect(() => {
    if (activeTool !== "color_picker") {
      setPickerPreviewColor(null)
    }
    if (activeTool !== "magic_wand") {
      setMagicWandSelection(new Set())
    }
  }, [activeTool])

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
    toolOptions,
    onPixelsChange: (nextPixelsRgba) => {
      if (!selectedSprite) return
      controller.updateSpritePixels(selectedSprite.id, nextPixelsRgba)
    },
    onActiveColorChange: setActiveColor,
    onSelectionChange: setMagicWandSelection
  })

  return (
    <div className="mvp16-sprite-editor-shell flex h-[600px] w-full overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
      <SpriteListPanel
        sprites={sprites.map((spriteEntry) => {
          const hasPixels = hasVisibleSpritePixels(spriteEntry.pixelsRgba)
          return {
            id: spriteEntry.id,
            name: spriteEntry.name,
            folderId: spriteEntry.folderId ?? null,
            width: spriteEntry.width,
            height: spriteEntry.height,
            isEmpty: !hasPixels,
            previewDataUrl: hasPixels
              ? spritePixelsToDataUrl(spriteEntry.pixelsRgba, spriteEntry.width, spriteEntry.height)
              : "",
            objectNames: spriteAssignedObjectNames(controller.project, spriteEntry.id)
          }
        })}
        spriteFolders={(controller.project.resources.spriteFolders ?? []).map((folderEntry) => ({
          id: folderEntry.id,
          name: folderEntry.name,
          parentId: folderEntry.parentId ?? null
        }))}
        activeSpriteId={selectedSprite?.id ?? null}
        onSelectSprite={(spriteId) => controller.setActiveSpriteId(spriteId)}
        onAddSprite={(name, width, height, folderId) => controller.addSprite(name, width, height, folderId)}
        onCreateFolder={(name, parentId) => controller.createSpriteFolder(name, parentId)}
        onRenameSprite={(spriteId, name) => controller.renameSprite(spriteId, name)}
        onDeleteSprite={(spriteId) => controller.deleteSprite(spriteId)}
        onMoveSpriteToFolder={(spriteId, folderId) => controller.moveSpriteToFolder(spriteId, folderId)}
        onRenameFolder={(folderId, name) => controller.renameSpriteFolder(folderId, name)}
        onDeleteFolder={(folderId) => controller.deleteSpriteFolder(folderId)}
        onMoveFolderToParent={(folderId, newParentId) => controller.moveSpriteFolder(folderId, newParentId)}
      />

      <SpriteToolbar
        activeTool={activeTool}
        activeColor={activeColor}
        pickerPreviewColor={pickerPreviewColor}
        spritePixels={selectedSpritePixels}
        toolOptions={toolOptions}
        onToolChange={setActiveTool}
        onColorChange={setActiveColor}
        onUpdateToolOptions={updateToolOptions}
      />

      <div className="mvp16-sprite-editor-main flex flex-1 flex-col">
        <div className="mvp16-sprite-canvas-bar flex items-center gap-3 border-b border-slate-200 bg-white px-4 py-2">
          <label className="mvp16-sprite-grid-toggle flex items-center gap-1.5 text-xs text-slate-600">
            <input
              type="checkbox"
              checked={showGrid}
              onChange={(event) => setShowGrid(event.target.checked)}
              className="h-3.5 w-3.5 rounded border-slate-300"
            />
            Grid
          </label>

          <label className="mvp16-sprite-zoom flex items-center gap-2 text-xs text-slate-600">
            Zoom
            <input
              type="range"
              min={4}
              max={24}
              value={zoom}
              onChange={(event: ChangeEvent<HTMLInputElement>) => setZoom(Number(event.target.value))}
            />
          </label>

          <div className="ml-auto">
            <SpriteImportButton
              isImporting={spriteImport.isImporting}
              onImportFile={(selectedFile) => {
                if (!selectedSprite) return
                void spriteImport.openCropModal(selectedFile)
              }}
            />
          </div>
        </div>

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
          <SpriteCanvasGrid
            width={selectedSprite.width}
            height={selectedSprite.height}
            pixelsRgba={selectedSpritePixels}
            zoom={zoom}
            showGrid={showGrid}
            activeTool={activeTool}
            eraserRadius={toolOptions.eraser.radius}
            selectedIndices={magicWandSelection}
            onPaint={(x, y, tool, phase) => {
              pixelActions.paintAt(x, y, tool, phase)
              if (tool === "color_picker" && phase === "pointerDown") {
                setActiveTool(lastPaintTool)
              }
            }}
            onHoverColorChange={(nextColor) => {
              if (activeTool === "color_picker") {
                setPickerPreviewColor(nextColor)
              }
            }}
          />
        ) : (
          <div className="flex flex-1 items-center justify-center bg-slate-50 text-sm text-slate-400">
            Add a sprite to start painting pixels.
          </div>
        )}
      </div>
    </div>
  )
}
