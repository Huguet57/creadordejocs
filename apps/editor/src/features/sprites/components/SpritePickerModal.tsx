import { Box, ChevronRight, Image as ImageIcon, X } from "lucide-react"
import { useEffect, useMemo, useState } from "react"
import { Button } from "../../../components/ui/button.js"
import { normalizePixelGrid } from "../utils/sprite-grid.js"

type SpriteOption = {
  id: string
  name: string
  folderId: string | null
  width: number
  height: number
  pixelsRgba: string[]
  previewSrc: string | null
  isEmpty: boolean
  objectNames: string[]
  isCompatible: boolean
  isExactSize: boolean
}

type SpriteFolderOption = {
  id: string
  name: string
  parentId: string | null
}

type SpritePickerModalProps = {
  isOpen: boolean
  objectName: string
  objectWidth: number
  objectHeight: number
  selectedObjectSpriteId: string | null
  availableSprites: SpriteOption[]
  spriteFolders: SpriteFolderOption[]
  onClose: () => void
  onSelectExisting: (spriteId: string) => void
  onEditSprite: (spriteId: string) => void
  onCreateNewSprite: () => void
}

export function SpritePickerModal({
  isOpen,
  objectName,
  objectWidth,
  objectHeight,
  selectedObjectSpriteId,
  availableSprites,
  spriteFolders,
  onClose,
  onSelectExisting,
  onEditSprite,
  onCreateNewSprite
}: SpritePickerModalProps) {
  const [highlightedSpriteId, setHighlightedSpriteId] = useState<string | null>(null)
  const [expandedFolderIds, setExpandedFolderIds] = useState<Set<string>>(new Set())

  useEffect(() => {
    if (!isOpen) return
    setExpandedFolderIds(new Set(spriteFolders.map((folderEntry) => folderEntry.id)))
    setHighlightedSpriteId((previous) => {
      const stillValid = previous && availableSprites.some((spriteEntry) => spriteEntry.id === previous)
      if (stillValid) return previous
      if (selectedObjectSpriteId && availableSprites.some((spriteEntry) => spriteEntry.id === selectedObjectSpriteId)) {
        return selectedObjectSpriteId
      }
      const firstCompatible = availableSprites.find((spriteEntry) => spriteEntry.isCompatible)
      return firstCompatible?.id ?? availableSprites[0]?.id ?? null
    })
  }, [availableSprites, isOpen, selectedObjectSpriteId, spriteFolders])

  useEffect(() => {
    if (!isOpen) return
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose()
      }
    }
    window.addEventListener("keydown", handleKeyDown)
    return () => {
      window.removeEventListener("keydown", handleKeyDown)
    }
  }, [isOpen, onClose])

  const folderChildrenByParent = useMemo(() => {
    const map = new Map<string | null, SpriteFolderOption[]>()
    for (const folderEntry of spriteFolders) {
      const parentId = folderEntry.parentId ?? null
      const current = map.get(parentId) ?? []
      current.push(folderEntry)
      map.set(parentId, current)
    }
    for (const [parentId, children] of map.entries()) {
      map.set(parentId, [...children].sort((left, right) => left.name.localeCompare(right.name, "ca")))
    }
    return map
  }, [spriteFolders])

  const spritesByFolder = useMemo(() => {
    const map = new Map<string | null, SpriteOption[]>()
    for (const spriteEntry of availableSprites) {
      const folderId = spriteEntry.folderId ?? null
      const current = map.get(folderId) ?? []
      current.push(spriteEntry)
      map.set(folderId, current)
    }
    for (const [folderId, spritesInFolder] of map.entries()) {
      map.set(folderId, [...spritesInFolder].sort((left, right) => left.name.localeCompare(right.name, "ca")))
    }
    return map
  }, [availableSprites])

  const selectedSpriteEntry = useMemo(() => {
    if (highlightedSpriteId) {
      return availableSprites.find((spriteEntry) => spriteEntry.id === highlightedSpriteId) ?? null
    }
    if (!selectedObjectSpriteId) return null
    return availableSprites.find((spriteEntry) => spriteEntry.id === selectedObjectSpriteId) ?? null
  }, [availableSprites, highlightedSpriteId, selectedObjectSpriteId])

  const selectedPreviewSrc = useMemo(() => {
    if (!selectedSpriteEntry) return null
    if (selectedSpriteEntry.previewSrc) return selectedSpriteEntry.previewSrc

    const normalizedPixels = normalizePixelGrid(
      selectedSpriteEntry.pixelsRgba,
      selectedSpriteEntry.width,
      selectedSpriteEntry.height
    )
    const canvas = document.createElement("canvas")
    canvas.width = selectedSpriteEntry.width
    canvas.height = selectedSpriteEntry.height
    const ctx = canvas.getContext("2d")
    if (!ctx) return null
    const imageData = ctx.createImageData(selectedSpriteEntry.width, selectedSpriteEntry.height)
    for (let index = 0; index < normalizedPixels.length; index += 1) {
      const color = normalizedPixels[index] ?? "#00000000"
      const pixelOffset = index * 4
      imageData.data[pixelOffset] = parseInt(color.slice(1, 3), 16)
      imageData.data[pixelOffset + 1] = parseInt(color.slice(3, 5), 16)
      imageData.data[pixelOffset + 2] = parseInt(color.slice(5, 7), 16)
      imageData.data[pixelOffset + 3] = parseInt(color.slice(7, 9), 16)
    }
    ctx.putImageData(imageData, 0, 0)
    return canvas.toDataURL("image/png")
  }, [selectedSpriteEntry])

  const backgroundCheckerStyle = {
    backgroundImage:
      "linear-gradient(45deg, #e2e8f0 25%, transparent 25%), linear-gradient(-45deg, #e2e8f0 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #e2e8f0 75%), linear-gradient(-45deg, transparent 75%, #e2e8f0 75%)",
    backgroundSize: "12px 12px",
    backgroundPosition: "0 0, 0 6px, 6px -6px, -6px 0"
  }

  const canSelectSprite = selectedSpriteEntry?.isCompatible === true
  const canEditSprite = selectedSpriteEntry !== null

  if (!isOpen) {
    return null
  }

  const toggleFolder = (folderId: string) => {
    setExpandedFolderIds((previous) => {
      const next = new Set(previous)
      if (next.has(folderId)) next.delete(folderId)
      else next.add(folderId)
      return next
    })
  }

  const renderSpriteRow = (spriteEntry: SpriteOption, depth: number) => {
    const isSelected = selectedSpriteEntry?.id === spriteEntry.id
    const rowIsDisabled = !spriteEntry.isCompatible
    return (
      <button
        key={spriteEntry.id}
        type="button"
        className={`mvp16-sprite-picker-tree-sprite-row flex w-full items-center gap-2 border px-2 py-1.5 text-left text-xs ${
          rowIsDisabled
            ? "cursor-not-allowed border-slate-200 bg-slate-50 text-slate-400"
            : isSelected
              ? "border-indigo-300 bg-indigo-50 text-indigo-700"
              : "border-transparent bg-white text-slate-700 hover:border-slate-200 hover:bg-slate-50"
        }`}
        style={{ paddingLeft: `${depth * 14 + 10}px` }}
        onClick={() => setHighlightedSpriteId(spriteEntry.id)}
      >
        {spriteEntry.previewSrc ? (
          <img
            src={spriteEntry.previewSrc}
            alt=""
            className="mvp16-sprite-picker-tree-sprite-thumb h-5 w-5 shrink-0 object-contain"
            style={{ imageRendering: "pixelated" }}
          />
        ) : (
          <ImageIcon className={`h-3.5 w-3.5 shrink-0 ${isSelected ? "text-indigo-500" : "text-slate-400"}`} />
        )}
        <div className="min-w-0 flex-1 leading-tight">
          <p className="truncate text-[12px] font-medium">{spriteEntry.name}</p>
          <p className={`truncate text-[9px] ${rowIsDisabled ? "text-slate-400" : "text-slate-400"}`}>
            {spriteEntry.width} x {spriteEntry.height}
            {spriteEntry.isEmpty && <span className="ml-1 text-amber-500">· buit</span>}
            {spriteEntry.objectNames.length > 0 && (
              <span className="ml-1 text-slate-400">
                · {spriteEntry.objectNames[0]}
                {spriteEntry.objectNames.length > 1 && ` +${spriteEntry.objectNames.length - 1} més`}
              </span>
            )}
            {rowIsDisabled && <span className="ml-1 text-amber-500">· no compatible</span>}
          </p>
        </div>
      </button>
    )
  }

  const renderFolderNode = (folderEntry: SpriteFolderOption, depth: number) => {
    const isExpanded = expandedFolderIds.has(folderEntry.id)
    const childFolders = folderChildrenByParent.get(folderEntry.id) ?? []
    const childSprites = spritesByFolder.get(folderEntry.id) ?? []

    return (
      <div key={folderEntry.id} className="mvp16-sprite-picker-tree-folder">
        <button
          type="button"
          className="mvp16-sprite-picker-tree-folder-row flex min-h-[38px] w-full items-center gap-1 border border-transparent px-2 py-1.5 text-left text-xs text-slate-700 hover:border-slate-200 hover:bg-slate-50"
          style={{ paddingLeft: `${depth * 14 + 8}px` }}
          onClick={() => toggleFolder(folderEntry.id)}
        >
          <ChevronRight className={`h-3.5 w-3.5 shrink-0 transition-transform ${isExpanded ? "rotate-90" : ""}`} />
          <div className="min-w-0 flex-1">
            <p className="truncate text-[12px]">{folderEntry.name}</p>
          </div>
        </button>
        {isExpanded && (
          <div className="mvp16-sprite-picker-tree-folder-children">
            {childFolders.map((childFolder) => renderFolderNode(childFolder, depth + 1))}
            {childSprites.map((spriteEntry) => renderSpriteRow(spriteEntry, depth + 1))}
          </div>
        )}
      </div>
    )
  }

  const rootFolders = folderChildrenByParent.get(null) ?? []
  const rootSprites = spritesByFolder.get(null) ?? []

  return (
    <div
      className="mvp16-sprite-picker-overlay fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4"
      onClick={onClose}
    >
      <div
        className="mvp16-sprite-picker-modal w-full max-w-4xl rounded-lg border border-slate-200 bg-white shadow-xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="mvp16-sprite-picker-header relative border-b border-slate-200 px-4 py-3">
          <button
            type="button"
            aria-label="Tancar modal de sprites"
            className="mvp16-sprite-picker-close-button absolute right-3 top-3 inline-flex h-7 w-7 items-center justify-center rounded-md border border-transparent text-slate-500 hover:border-slate-200 hover:bg-slate-50 hover:text-slate-700"
            onClick={onClose}
          >
            <X className="h-4 w-4" />
          </button>
          <h2 className="text-sm font-semibold text-slate-900">Sprite per {objectName}</h2>
          <p className="text-xs text-slate-500">
            Selecciona un sprite ({objectWidth} x {objectHeight}) o un de ratio compatible per escalar-lo.
          </p>
        </div>

        <div className="mvp16-sprite-picker-body flex h-[460px] overflow-hidden">
          <aside className="mvp16-sprite-picker-tree-sidebar flex w-[320px] flex-col border-r border-slate-200 bg-slate-50">
            <div className="border-b border-slate-200 bg-white px-3 py-2">
              <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">Sprites i carpetes</p>
            </div>
            <div className="mvp16-sprite-picker-tree-content flex-1 overflow-y-auto p-2">
              {availableSprites.length === 0 && spriteFolders.length === 0 ? (
                <p className="px-2 py-4 text-center text-xs text-slate-400">No hi ha sprites encara</p>
              ) : (
                <div className="flex flex-col gap-1">
                  {rootFolders.map((folderEntry) => renderFolderNode(folderEntry, 0))}
                  {rootSprites.map((spriteEntry) => renderSpriteRow(spriteEntry, 0))}
                </div>
              )}
            </div>
          </aside>

          <section className="mvp16-sprite-picker-preview-panel flex flex-1 flex-col">
            <div className="border-b border-slate-200 px-4 py-2">
              <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">Preview</p>
            </div>
            <div className="flex flex-1 flex-col gap-4 p-4">
              <div
                className="mvp16-sprite-picker-preview-box flex items-center justify-center self-center border border-slate-200"
                style={{ ...backgroundCheckerStyle, width: 240, height: 240 }}
              >
                {selectedPreviewSrc && selectedSpriteEntry ? (
                  <img
                    src={selectedPreviewSrc}
                    alt={selectedSpriteEntry.name}
                    className="mvp16-sprite-picker-preview-img"
                    style={{
                      imageRendering: "pixelated",
                      width: `${Math.min(240, 240 * (selectedSpriteEntry.width / Math.max(selectedSpriteEntry.width, selectedSpriteEntry.height)))}px`,
                      height: `${Math.min(240, 240 * (selectedSpriteEntry.height / Math.max(selectedSpriteEntry.width, selectedSpriteEntry.height)))}px`
                    }}
                  />
                ) : (
                  <Box className="h-7 w-7 text-slate-400" />
                )}
              </div>
              {selectedSpriteEntry ? (
                <div className="space-y-1 border border-slate-200 bg-slate-50 p-3 text-xs">
                  <p className="font-semibold text-slate-800">{selectedSpriteEntry.name}</p>
                  <p className="text-slate-500">
                    {selectedSpriteEntry.width} x {selectedSpriteEntry.height} px
                  </p>
                </div>
              ) : (
                <p className="text-xs text-slate-500">Selecciona un sprite per veure'n el preview.</p>
              )}

            </div>
          </section>
        </div>

        <div className="mvp16-sprite-picker-footer flex items-center justify-end gap-2 border-t border-slate-200 px-4 py-3">
          <div className="mvp16-sprite-picker-footer-actions flex items-center gap-2">
            <Button variant="outline" size="sm" className="mvp16-sprite-picker-new-button h-8" onClick={onCreateNewSprite}>
              + Nou Sprite
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="h-8"
              disabled={!canEditSprite}
              onClick={() => selectedSpriteEntry && onEditSprite(selectedSpriteEntry.id)}
            >
              Editar Sprite
            </Button>
            <Button
              size="sm"
              className="h-8"
              disabled={!canSelectSprite}
              onClick={() => selectedSpriteEntry && onSelectExisting(selectedSpriteEntry.id)}
            >
              Seleccionar
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
