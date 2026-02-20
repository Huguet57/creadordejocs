import { ChevronDown, ChevronRight, Image as ImageIcon } from "lucide-react"
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react"
import {
  buildFolderChildrenByParent,
  buildEntriesByFolder
} from "../shared/editor-sidebar/tree-utils.js"

type SelectableSprite = {
  id: string
  name: string
  folderId: string | null
  previewSrc: string | null
}

type SelectableSpriteFolder = {
  id: string
  name: string
  parentId: string | null
}

type SpriteDropdownPickerProps = {
  selectedSpriteId: string
  sprites: SelectableSprite[]
  folders: SelectableSpriteFolder[]
  onSelect: (spriteId: string) => void
}

export function SpriteDropdownPicker({
  selectedSpriteId,
  sprites,
  folders,
  onSelect
}: SpriteDropdownPickerProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [expandedFolderIds, setExpandedFolderIds] = useState<Set<string>>(new Set())
  const containerRef = useRef<HTMLDivElement>(null)
  const popoverRef = useRef<HTMLDivElement>(null)

  const selectedSprite = useMemo(
    () => sprites.find((s) => s.id === selectedSpriteId) ?? null,
    [sprites, selectedSpriteId]
  )

  const folderChildrenByParent = useMemo(
    () => buildFolderChildrenByParent(folders),
    [folders]
  )

  const spritesByFolder = useMemo(
    () => buildEntriesByFolder(sprites),
    [sprites]
  )

  // Expand all folders when opening
  useEffect(() => {
    if (isOpen) {
      setExpandedFolderIds(new Set(folders.map((f) => f.id)))
    }
  }, [isOpen, folders])

  // Click-outside to close
  useEffect(() => {
    if (!isOpen) return
    const handleMouseDown = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener("mousedown", handleMouseDown)
    return () => document.removeEventListener("mousedown", handleMouseDown)
  }, [isOpen])

  // Close on Escape
  useEffect(() => {
    if (!isOpen) return
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsOpen(false)
      }
    }
    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [isOpen])

  // Viewport-aware positioning
  useLayoutEffect(() => {
    const popover = popoverRef.current
    const container = containerRef.current
    if (!isOpen || !popover || !container) return

    // Reset to measure natural width (keep maxHeight removed so we get true content width)
    popover.style.left = "0px"
    popover.style.top = ""
    popover.style.bottom = ""
    popover.style.maxWidth = "none"
    popover.style.maxHeight = "none"
    popover.style.width = "max-content"
    popover.style.overflowX = "visible"
    popover.style.overflowY = "visible"

    const naturalWidth = popover.getBoundingClientRect().width

    // Restore scroll constraints
    popover.style.width = ""
    popover.style.maxHeight = "260px"
    popover.style.overflowX = ""
    popover.style.overflowY = "auto"

    const containerRect = container.getBoundingClientRect()
    const viewportWidth = document.documentElement.clientWidth
    const viewportHeight = document.documentElement.clientHeight
    const margin = 8

    // Horizontal positioning (same as RightValuePicker)
    let leftOffset = 0
    const absRight = containerRect.left + naturalWidth

    if (absRight > viewportWidth - margin) {
      const alignRightOffset = containerRect.width - naturalWidth
      const absLeftAlignRight = containerRect.left + alignRightOffset

      if (absLeftAlignRight >= margin) {
        leftOffset = alignRightOffset
      } else {
        leftOffset = viewportWidth - margin - naturalWidth - containerRect.left
        if (containerRect.left + leftOffset < margin) {
          leftOffset = margin - containerRect.left
        }
      }
    }

    popover.style.left = `${leftOffset}px`

    const absoluteLeft = containerRect.left + leftOffset
    const availableWidth = viewportWidth - margin - absoluteLeft
    popover.style.maxWidth = `${availableWidth}px`

    // Vertical positioning: flip above if not enough space below
    const spaceBelow = viewportHeight - containerRect.bottom - margin
    const spaceAbove = containerRect.top - margin

    if (spaceBelow < 260 && spaceAbove > spaceBelow) {
      popover.style.top = "auto"
      popover.style.bottom = `${containerRect.height + 4}px`
      popover.style.maxHeight = `${Math.min(260, spaceAbove)}px`
    } else {
      popover.style.top = `${containerRect.height + 4}px`
      popover.style.bottom = "auto"
      popover.style.maxHeight = `${Math.min(260, spaceBelow)}px`
    }
  }, [isOpen])

  const toggleFolder = (folderId: string) => {
    setExpandedFolderIds((prev) => {
      const next = new Set(prev)
      if (next.has(folderId)) next.delete(folderId)
      else next.add(folderId)
      return next
    })
  }

  const renderSpriteRow = (sprite: SelectableSprite, depth: number) => {
    const isSelected = sprite.id === selectedSpriteId
    return (
      <button
        key={sprite.id}
        type="button"
        className={`sprite-dropdown-picker-sprite-row flex w-full items-center gap-2 rounded px-2 py-1 text-left text-xs ${
          isSelected
            ? "bg-indigo-50 font-medium text-indigo-700"
            : "text-slate-700 hover:bg-slate-100"
        }`}
        style={{ paddingLeft: `${depth * 12 + 8}px` }}
        onClick={() => {
          onSelect(sprite.id)
          setIsOpen(false)
        }}
      >
        {sprite.previewSrc ? (
          <img
            src={sprite.previewSrc}
            alt=""
            className="h-4 w-4 shrink-0 object-contain"
            style={{ imageRendering: "pixelated" }}
          />
        ) : (
          <ImageIcon className="h-3.5 w-3.5 shrink-0 text-slate-400" />
        )}
        <span className="truncate">{sprite.name}</span>
      </button>
    )
  }

  const renderFolderNode = (folder: SelectableSpriteFolder, depth: number) => {
    const isExpanded = expandedFolderIds.has(folder.id)
    const childFolders = folderChildrenByParent.get(folder.id) ?? []
    const childSprites = spritesByFolder.get(folder.id) ?? []
    return (
      <div key={folder.id}>
        <button
          type="button"
          className="sprite-dropdown-picker-folder-row flex w-full items-center gap-1.5 rounded px-2 py-1 text-left text-xs text-slate-600 hover:bg-slate-100"
          style={{ paddingLeft: `${depth * 12 + 8}px` }}
          onClick={() => toggleFolder(folder.id)}
        >
          <ChevronRight
            className={`h-3 w-3 shrink-0 transition-transform ${isExpanded ? "rotate-90" : ""}`}
          />
          <span className="truncate font-medium">{folder.name}</span>
        </button>
        {isExpanded && (
          <div>
            {childFolders.map((child) => renderFolderNode(child, depth + 1))}
            {childSprites.map((sprite) => renderSpriteRow(sprite, depth + 1))}
          </div>
        )}
      </div>
    )
  }

  const rootFolders = folderChildrenByParent.get(null) ?? []
  const rootSprites = spritesByFolder.get(null) ?? []

  return (
    <div className="sprite-dropdown-picker-container relative" ref={containerRef}>
      <button
        type="button"
        className="sprite-dropdown-picker-trigger flex h-7 max-w-[180px] items-center gap-1.5 rounded border border-slate-300 bg-white/50 px-2 text-xs hover:bg-white focus:outline-none"
        onClick={() => setIsOpen(!isOpen)}
      >
        {selectedSprite?.previewSrc ? (
          <img
            src={selectedSprite.previewSrc}
            alt=""
            className="h-4 w-4 shrink-0 object-contain"
            style={{ imageRendering: "pixelated" }}
          />
        ) : (
          <ImageIcon className="h-3.5 w-3.5 shrink-0 text-slate-400" />
        )}
        <span className="min-w-0 truncate">{selectedSprite?.name ?? "—"}</span>
        <ChevronDown className="ml-auto h-3 w-3 shrink-0 text-slate-400" />
      </button>
      {isOpen && (
        <div
          ref={popoverRef}
          className="sprite-dropdown-picker-popover absolute z-50 min-w-[220px] overflow-y-auto rounded-lg border border-slate-200 bg-white py-1 shadow-lg"
          style={{ maxHeight: "260px" }}
        >
          {sprites.length === 0 ? (
            <p className="px-3 py-2 text-center text-xs text-slate-400">Cap sprite disponible</p>
          ) : (
            <>
              {rootFolders.map((folder) => renderFolderNode(folder, 0))}
              {rootSprites.map((sprite) => renderSpriteRow(sprite, 0))}
            </>
          )}
        </div>
      )}
    </div>
  )
}
