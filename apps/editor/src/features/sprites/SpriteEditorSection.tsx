import { useCallback, useEffect, useMemo, useRef, useState, type ChangeEvent } from "react"
import type { EditorController } from "../editor-state/use-editor-controller.js"
import { spriteAssignedObjectNames } from "../editor-state/use-editor-controller.js"
import { Button } from "../../components/ui/button.js"
import { SpriteCanvasGrid, type SelectDragRect } from "./components/SpriteCanvasGrid.js"
import { SpriteImportButton } from "./components/SpriteImportButton.js"
import { SpriteImportCropModal } from "./components/SpriteImportCropModal.js"
import { SpriteListPanel } from "./components/SpriteListPanel.js"
import { SpriteTabBar } from "./components/SpriteTabBar.js"
import { SpriteFrameTimeline } from "./components/SpriteFrameTimeline.js"
import { SpriteToolbar } from "./components/SpriteToolbar.js"
import { resolveActiveFramePixels, resolveNeighborFrameId, resolveNextActiveFrameId } from "./utils/frame-helpers.js"
import { useSpriteEditorState } from "./hooks/use-sprite-editor-state.js"
import { useSpriteImport } from "./hooks/use-sprite-import.js"
import { useSpriteMove } from "./hooks/use-sprite-move.js"
import { useSpritePixelActions } from "./hooks/use-sprite-pixel-actions.js"
import { normalizePixelGrid } from "./utils/sprite-grid.js"
import { flipHorizontal, flipVertical, rotateCW, rotateCCW } from "./utils/sprite-transforms.js"
import { hasVisibleSpritePixels } from "./utils/has-visible-pixels.js"
import { resolveSpritePreviewSource } from "./utils/sprite-preview-source.js"
import { indicesInRect } from "./utils/sprite-tools/rect-select.js"
import { clampZoom, computeFitZoom, MAX_SPRITE_ZOOM, MIN_SPRITE_ZOOM } from "./utils/zoom.js"

type SpriteEditorSectionProps = {
  controller: EditorController
}

export function SpriteEditorSection({ controller }: SpriteEditorSectionProps) {
  const sprites = controller.project.resources.sprites
  const spriteIds = sprites.map((spriteEntry) => spriteEntry.id)
  const [openTabs, setOpenTabs] = useState<{ id: string; pinned: boolean }[]>([])
  const spriteStateSignatureByIdRef = useRef<Record<string, string>>({})
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
  const [selection, setSelection] = useState<Set<number>>(new Set())
  const [selectDragRect, setSelectDragRect] = useState<SelectDragRect | null>(null)
  const [pickerPreviewColor, setPickerPreviewColor] = useState<string | null>(null)
  const [activeFrameId, setActiveFrameId] = useState<string | null>(null)
  const [canvasViewportElement, setCanvasViewportElement] = useState<HTMLDivElement | null>(null)

  useEffect(() => {
    if (activeSpriteId && !spriteIds.includes(activeSpriteId)) {
      controller.setActiveSpriteId(null)
    }
  }, [activeSpriteId, controller, spriteIds])

  useEffect(() => {
    if (activeTool !== "color_picker") {
      setPickerPreviewColor(null)
    }
    const selectionTools = new Set(["magic_wand", "select", "move"])
    if (!selectionTools.has(activeTool)) {
      setSelection(new Set())
    }
    setSelectDragRect(null)
  }, [activeTool])

  useEffect(() => {
    const currentSpriteIds = new Set(sprites.map((entry) => entry.id))
    setOpenTabs((previous) => {
      const cleaned = previous.filter((tabEntry) => currentSpriteIds.has(tabEntry.id))
      return cleaned.length === previous.length ? previous : cleaned
    })
  }, [sprites])

  useEffect(() => {
    if (!activeSpriteId) return
    setOpenTabs((previous) => {
      if (previous.some((tabEntry) => tabEntry.id === activeSpriteId)) {
        return previous
      }
      return [...previous.filter((tabEntry) => tabEntry.pinned), { id: activeSpriteId, pinned: false }]
    })
  }, [activeSpriteId])

  useEffect(() => {
    const currentSignatures: Record<string, string> = {}
    for (const spriteEntry of sprites) {
      currentSignatures[spriteEntry.id] = JSON.stringify({
        name: spriteEntry.name,
        width: spriteEntry.width,
        height: spriteEntry.height,
        pixelsRgba: spriteEntry.pixelsRgba,
        frames: spriteEntry.frames
      })
    }

    if (activeSpriteId) {
      const previousSignature = spriteStateSignatureByIdRef.current[activeSpriteId]
      const currentSignature = currentSignatures[activeSpriteId]
      if (previousSignature && currentSignature && previousSignature !== currentSignature) {
        setOpenTabs((previous) =>
          previous.map((tabEntry) =>
            tabEntry.id === activeSpriteId && !tabEntry.pinned ? { ...tabEntry, pinned: true } : tabEntry
          )
        )
      }
    }

    spriteStateSignatureByIdRef.current = currentSignatures
  }, [activeSpriteId, sprites])

  const handleSelectSprite = (spriteId: string) => {
    controller.setActiveSpriteId(spriteId)
    setOpenTabs((previous) => {
      const existing = previous.find((tabEntry) => tabEntry.id === spriteId)
      const pinnedTabs = previous.filter((tabEntry) => tabEntry.pinned)
      if (existing?.pinned) {
        return [...pinnedTabs]
      }
      return [...pinnedTabs, { id: spriteId, pinned: false }]
    })
  }

  const handlePinSprite = (spriteId: string) => {
    controller.setActiveSpriteId(spriteId)
    setOpenTabs((previous) => {
      const tabIndex = previous.findIndex((tabEntry) => tabEntry.id === spriteId)
      if (tabIndex === -1) {
        return [...previous, { id: spriteId, pinned: true }]
      }
      return previous.map((tabEntry, index) => (index === tabIndex ? { ...tabEntry, pinned: true } : tabEntry))
    })
  }

  const handleCloseTab = (tabId: string) => {
    const currentIndex = openTabs.findIndex((tabEntry) => tabEntry.id === tabId)
    const remainingTabs = openTabs.filter((tabEntry) => tabEntry.id !== tabId)
    setOpenTabs(remainingTabs)

    if (activeSpriteId === tabId) {
      const nextTabId =
        remainingTabs.length > 0 ? (remainingTabs[Math.min(currentIndex, remainingTabs.length - 1)]?.id ?? null) : null
      controller.setActiveSpriteId(nextTabId)
    }
  }

  const handleDeleteSprite = (spriteId: string): boolean => {
    const currentIndex = openTabs.findIndex((tabEntry) => tabEntry.id === spriteId)
    const remainingTabs = openTabs.filter((tabEntry) => tabEntry.id !== spriteId)
    const deleted = controller.deleteSprite(spriteId)
    if (!deleted) return false
    setOpenTabs(remainingTabs)
    if (activeSpriteId === spriteId && remainingTabs.length > 0) {
      const nextTabId = remainingTabs[Math.min(currentIndex, remainingTabs.length - 1)]?.id ?? null
      controller.setActiveSpriteId(nextTabId)
    }
    return true
  }

  const selectedSprite = sprites.find((spriteEntry) => spriteEntry.id === activeSpriteId) ?? null

  useEffect(() => {
    if (!selectedSprite) {
      setActiveFrameId(null)
      return
    }
    setActiveFrameId((previous) => resolveNextActiveFrameId(selectedSprite.frames, previous))
  }, [selectedSprite?.id, selectedSprite?.frames])

  const selectedSpritePixels = selectedSprite
    ? normalizePixelGrid(
        resolveActiveFramePixels(selectedSprite.frames, activeFrameId, selectedSprite.pixelsRgba),
        selectedSprite.width,
        selectedSprite.height
      )
    : []

  const [resolvedSpritePreviews, setResolvedSpritePreviews] = useState<Record<string, string>>({})

  useEffect(() => {
    let cancelled = false

    const resolvePreviews = async () => {
      const pairs = await Promise.all(
        sprites.map(async (spriteEntry) => {
          if (!hasVisibleSpritePixels(spriteEntry.pixelsRgba)) {
            return null
          }
          const resolved = await resolveSpritePreviewSource(spriteEntry)
          return [spriteEntry.id, resolved] as const
        })
      )
      if (!cancelled) {
        setResolvedSpritePreviews(Object.fromEntries(pairs.filter((entry): entry is readonly [string, string] => entry !== null)))
      }
    }

    void resolvePreviews()

    return () => {
      cancelled = true
    }
  }, [sprites])

  const spriteListEntries = useMemo(
    () =>
      sprites.map((spriteEntry) => {
        const hasPixels = hasVisibleSpritePixels(spriteEntry.pixelsRgba)
        return {
          id: spriteEntry.id,
          name: spriteEntry.name,
          folderId: spriteEntry.folderId ?? null,
          width: spriteEntry.width,
          height: spriteEntry.height,
          isEmpty: !hasPixels,
          previewDataUrl: resolvedSpritePreviews[spriteEntry.id] ?? "",
          objectNames: spriteAssignedObjectNames(controller.project, spriteEntry.id)
        }
      }),
    [controller.project, sprites, resolvedSpritePreviews]
  )

  const tabData = useMemo(
    () =>
      openTabs
        .map((tabEntry) => {
          const spriteEntry = spriteListEntries.find((entry) => entry.id === tabEntry.id)
          if (!spriteEntry) return null
          return {
            id: spriteEntry.id,
            name: spriteEntry.name,
            previewSrc: spriteEntry.previewDataUrl || null,
            pinned: tabEntry.pinned
          }
        })
        .filter((entry): entry is NonNullable<typeof entry> => entry !== null),
    [openTabs, spriteListEntries]
  )

  const spriteImport = useSpriteImport({
    spriteId: selectedSprite?.id ?? "",
    width: selectedSprite?.width ?? 32,
    height: selectedSprite?.height ?? 32,
    onSourceImported: (assetSource) => {
      if (!selectedSprite) return
      controller.updateSpriteSource(selectedSprite.id, assetSource)
    },
    onPixelsImported: (pixelsRgba) => {
      if (!selectedSprite || !activeFrameId) return
      controller.updateSpriteFramePixels(selectedSprite.id, activeFrameId, pixelsRgba)
    }
  })

  const handlePixelsChange = useCallback(
    (nextPixelsRgba: string[]) => {
      if (!selectedSprite || !activeFrameId) return
      controller.updateSpriteFramePixels(selectedSprite.id, activeFrameId, nextPixelsRgba)
    },
    [selectedSprite, activeFrameId, controller]
  )

  const pixelActions = useSpritePixelActions({
    width: selectedSprite?.width ?? 1,
    height: selectedSprite?.height ?? 1,
    pixelsRgba: selectedSpritePixels,
    activeColor,
    toolOptions,
    onPixelsChange: handlePixelsChange,
    onActiveColorChange: setActiveColor,
    onSelectionChange: setSelection
  })

  const spriteMove = useSpriteMove({
    width: selectedSprite?.width ?? 1,
    height: selectedSprite?.height ?? 1,
    pixelsRgba: selectedSpritePixels,
    selection,
    onPixelsChange: handlePixelsChange,
    onSelectionChange: setSelection
  })

  const handleCanvasPaint = useCallback(
    (x: number, y: number, tool: string, phase: string) => {
      if (tool === "select") {
        if (phase === "pointerDown") {
          setSelectDragRect({ startX: x, startY: y, endX: x, endY: y })
        } else if (phase === "pointerDrag") {
          setSelectDragRect((prev) => (prev ? { ...prev, endX: x, endY: y } : null))
        } else if (phase === "pointerUp") {
          setSelectDragRect((prev) => {
            if (!prev) return null
            if (prev.startX === x && prev.startY === y) {
              setSelection(new Set())
            } else {
              setSelection(indicesInRect(prev.startX, prev.startY, x, y, selectedSprite?.width ?? 1, selectedSprite?.height ?? 1))
            }
            return null
          })
        }
        return
      }

      if (tool === "move") {
        if (phase === "pointerDown") {
          spriteMove.onMoveStart(x, y)
        } else if (phase === "pointerDrag") {
          spriteMove.onMoveDrag(x, y)
        } else if (phase === "pointerUp") {
          spriteMove.onMoveEnd()
        }
        return
      }

      pixelActions.paintAt(x, y, tool as Parameters<typeof pixelActions.paintAt>[2], phase as Parameters<typeof pixelActions.paintAt>[3])
      if (tool === "color_picker" && phase === "pointerDown") {
        setActiveTool(lastPaintTool)
      }
    },
    [pixelActions, spriteMove, selectedSprite?.width, selectedSprite?.height, setActiveTool, lastPaintTool]
  )

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return
      if (spriteMove.isMoving) {
        spriteMove.cancelMove()
        return
      }
      if (selectDragRect) {
        setSelectDragRect(null)
        return
      }
      if (selection.size > 0) {
        setSelection(new Set())
      }
    }
    document.addEventListener("keydown", handleKeyDown)
    return () => document.removeEventListener("keydown", handleKeyDown)
  }, [spriteMove, selectDragRect, selection.size])

  const handlePointerUpOutside = useCallback(() => {
    if (activeTool === "move" && spriteMove.isMoving) {
      spriteMove.onMoveEnd()
    }
    if (activeTool === "select" && selectDragRect) {
      setSelection(
        indicesInRect(selectDragRect.startX, selectDragRect.startY, selectDragRect.endX, selectDragRect.endY, selectedSprite?.width ?? 1, selectedSprite?.height ?? 1)
      )
      setSelectDragRect(null)
    }
  }, [activeTool, spriteMove, selectDragRect, selectedSprite?.width, selectedSprite?.height])

  const handleFitZoom = useCallback(() => {
    if (!selectedSprite || !canvasViewportElement || typeof window === "undefined") return

    const viewportStyles = window.getComputedStyle(canvasViewportElement)
    const horizontalPadding = Number.parseFloat(viewportStyles.paddingLeft) + Number.parseFloat(viewportStyles.paddingRight)
    const verticalPadding = Number.parseFloat(viewportStyles.paddingTop) + Number.parseFloat(viewportStyles.paddingBottom)
    const availableWidth = Math.max(1, canvasViewportElement.clientWidth - horizontalPadding)
    const availableHeight = Math.max(1, canvasViewportElement.clientHeight - verticalPadding)

    setZoom(
      computeFitZoom({
        viewportWidth: availableWidth,
        viewportHeight: availableHeight,
        spriteWidth: selectedSprite.width,
        spriteHeight: selectedSprite.height,
        minZoom: MIN_SPRITE_ZOOM,
        maxZoom: MAX_SPRITE_ZOOM
      })
    )
  }, [canvasViewportElement, selectedSprite, setZoom])

  return (
    <div className="mvp16-sprite-editor-shell flex h-[600px] w-full overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
      <SpriteListPanel
        sprites={spriteListEntries}
        spriteFolders={(controller.project.resources.spriteFolders ?? []).map((folderEntry) => ({
          id: folderEntry.id,
          name: folderEntry.name,
          parentId: folderEntry.parentId ?? null
        }))}
        activeSpriteId={activeSpriteId}
        onSelectSprite={handleSelectSprite}
        onPinSprite={handlePinSprite}
        onOpenInNewTab={handlePinSprite}
        onAddSprite={(name, width, height, folderId) => controller.addSprite(name, width, height, folderId)}
        onCreateFolder={(name, parentId) => controller.createSpriteFolder(name, parentId)}
        onRenameSprite={(spriteId, name) => controller.renameSprite(spriteId, name)}
        onDuplicateSprite={(spriteId) => controller.duplicateSprite(spriteId)}
        onDeleteSprite={handleDeleteSprite}
        onMoveSpriteToFolder={(spriteId, folderId) => controller.moveSpriteToFolder(spriteId, folderId)}
        onRenameFolder={(folderId, name) => controller.renameSpriteFolder(folderId, name)}
        onDeleteFolder={(folderId) => controller.deleteSpriteFolder(folderId)}
        onMoveFolderToParent={(folderId, newParentId) => controller.moveSpriteFolder(folderId, newParentId)}
      />

      <div className="sprtabs-editor-area flex min-w-0 flex-1 flex-col border-l border-slate-200">
        <SpriteTabBar
          tabs={tabData}
          activeTabId={activeSpriteId}
          onSelectTab={(id) => controller.setActiveSpriteId(id)}
          onCloseTab={handleCloseTab}
          onPinTab={handlePinSprite}
        />
        {selectedSprite ? (
          <div className="sprtabs-editor-content flex min-h-0 min-w-0 flex-1 overflow-hidden">
            <SpriteToolbar
              activeTool={activeTool}
              activeColor={activeColor}
              pickerPreviewColor={pickerPreviewColor}
              spritePixels={selectedSpritePixels}
              toolOptions={toolOptions}
              onToolChange={setActiveTool}
              onColorChange={setActiveColor}
              onUpdateToolOptions={updateToolOptions}
              onFlipHorizontal={() => {
                if (!selectedSprite || !activeFrameId) return
                const result = flipHorizontal({ width: selectedSprite.width, height: selectedSprite.height, pixelsRgba: selectedSpritePixels })
                controller.updateSpriteFramePixels(selectedSprite.id, activeFrameId, result.pixelsRgba)
              }}
              onFlipVertical={() => {
                if (!selectedSprite || !activeFrameId) return
                const result = flipVertical({ width: selectedSprite.width, height: selectedSprite.height, pixelsRgba: selectedSpritePixels })
                controller.updateSpriteFramePixels(selectedSprite.id, activeFrameId, result.pixelsRgba)
              }}
              onRotateCW={() => {
                if (!selectedSprite) return
                const result = rotateCW({ width: selectedSprite.width, height: selectedSprite.height, pixelsRgba: selectedSpritePixels })
                controller.transformSpritePixels(selectedSprite.id, result.width, result.height, result.pixelsRgba)
              }}
              onRotateCCW={() => {
                if (!selectedSprite) return
                const result = rotateCCW({ width: selectedSprite.width, height: selectedSprite.height, pixelsRgba: selectedSpritePixels })
                controller.transformSpritePixels(selectedSprite.id, result.width, result.height, result.pixelsRgba)
              }}
            />
            <div className="mvp16-sprite-editor-main flex min-h-0 min-w-0 flex-1 flex-col">
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
                    data-testid="sprite-zoom-slider"
                    type="range"
                    min={MIN_SPRITE_ZOOM}
                    max={MAX_SPRITE_ZOOM}
                    step={1}
                    value={zoom}
                    onChange={(event: ChangeEvent<HTMLInputElement>) =>
                      setZoom(clampZoom(Number(event.target.value), MIN_SPRITE_ZOOM, MAX_SPRITE_ZOOM))
                    }
                  />
                </label>

                <div className="ml-auto flex shrink-0 items-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-8 px-2 text-xs"
                    data-testid="sprite-zoom-fit"
                    onClick={handleFitZoom}
                    disabled={!canvasViewportElement}
                  >
                    Fit
                  </Button>
                  <SpriteImportButton
                    isImporting={spriteImport.isImporting}
                    onImportFile={(selectedFile) => {
                      void spriteImport.openCropModal(selectedFile)
                    }}
                  />
                </div>
              </div>

              {spriteImport.message && (
                <p className="mx-4 mt-3 rounded border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-600">
                  {spriteImport.message}
                </p>
              )}
              <SpriteImportCropModal
                isOpen={spriteImport.isCropOpen}
                imageElement={spriteImport.pendingImage}
                targetWidth={selectedSprite.width}
                targetHeight={selectedSprite.height}
                onConfirm={(cropRect) => void spriteImport.confirmCrop(cropRect)}
                onCancel={spriteImport.cancelCrop}
              />

              <SpriteFrameTimeline
                frames={selectedSprite.frames}
                activeFrameId={activeFrameId ?? selectedSprite.frames[0]?.id ?? ""}
                spriteWidth={selectedSprite.width}
                spriteHeight={selectedSprite.height}
                onSelectFrame={setActiveFrameId}
                onAddFrame={() => {
                  const newId = controller.addSpriteFrame(selectedSprite.id, activeFrameId ?? undefined)
                  if (newId) setActiveFrameId(newId)
                }}
                onDuplicateFrame={(frameId) => {
                  const newId = controller.duplicateSpriteFrame(selectedSprite.id, frameId)
                  if (newId) setActiveFrameId(newId)
                }}
                onDeleteFrame={(frameId) => {
                  const neighbor = resolveNeighborFrameId(selectedSprite.frames, frameId)
                  controller.deleteSpriteFrame(selectedSprite.id, frameId)
                  if (frameId === activeFrameId) setActiveFrameId(neighbor)
                }}
                onReorderFrame={(frameId, newIndex) => {
                  controller.reorderSpriteFrame(selectedSprite.id, frameId, newIndex)
                }}
              />

              <SpriteCanvasGrid
                width={selectedSprite.width}
                height={selectedSprite.height}
                pixelsRgba={spriteMove.displayPixels}
                zoom={zoom}
                showGrid={showGrid}
                activeTool={activeTool}
                eraserRadius={toolOptions.eraser.radius}
                selectedIndices={selection}
                selectDragRect={selectDragRect}
                onPaint={handleCanvasPaint}
                onHoverColorChange={(nextColor) => {
                  if (activeTool === "color_picker") {
                    setPickerPreviewColor(nextColor)
                  }
                }}
                onPointerUpOutside={handlePointerUpOutside}
                onViewportElementChange={setCanvasViewportElement}
              />
            </div>
          </div>
        ) : (
          <div className="flex flex-1 items-center justify-center bg-slate-50 text-sm text-slate-400">
            Select a sprite to start editing.
          </div>
        )}
      </div>
    </div>
  )
}
