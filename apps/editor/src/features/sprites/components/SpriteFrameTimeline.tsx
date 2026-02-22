import { Copy, Plus, Trash2 } from "lucide-react"
import { useEffect, useRef, useState, type DragEvent, type KeyboardEvent, type MouseEvent } from "react"
import { t } from "@/i18n/index.js"
import { resolveFramePreviewUrlsWithCache, type FramePreviewCache } from "../utils/frame-preview-cache.js"

const DND_FRAME_MIME = "application/x-sprite-frame"
const FRAME_PREVIEW_RESOLVE_DEBOUNCE_MS = 80

type WindowWithIdleCallbacks = Window & {
  requestIdleCallback?: (callback: IdleRequestCallback, options?: IdleRequestOptions) => number
  cancelIdleCallback?: (id: number) => void
}

function arePreviewMapsEqual(left: Map<string, string>, right: Map<string, string>): boolean {
  if (left === right) return true
  if (left.size !== right.size) return false
  for (const [key, value] of left.entries()) {
    if (right.get(key) !== value) {
      return false
    }
  }
  return true
}

export type SpriteFrameTimelineProps = {
  frames: { id: string; pixelsRgba: string[] }[]
  activeFrameId: string
  spriteWidth: number
  spriteHeight: number
  onSelectFrame: (frameId: string) => void
  onAddFrame: () => void
  onDuplicateFrame: (frameId: string) => void
  onDeleteFrame: (frameId: string) => void
  onReorderFrame: (frameId: string, newIndex: number) => void
}

export function SpriteFrameTimeline({
  frames,
  activeFrameId,
  spriteWidth,
  spriteHeight,
  onSelectFrame,
  onAddFrame,
  onDuplicateFrame,
  onDeleteFrame,
  onReorderFrame
}: SpriteFrameTimelineProps) {
  const draggedFrameIdRef = useRef<string | null>(null)
  const [dropTargetIndex, setDropTargetIndex] = useState<number | null>(null)
  const activeFrameRef = useRef<HTMLDivElement>(null)
  const framePreviewCacheRef = useRef<FramePreviewCache>(new Map())
  const [framePreviewUrls, setFramePreviewUrls] = useState<Map<string, string>>(new Map())

  useEffect(() => {
    let cancelled = false
    let idleCallbackId: number | null = null
    let timeoutId: ReturnType<typeof setTimeout> | null = null
    const windowWithIdleCallbacks =
      typeof window === "undefined" ? null : (window as WindowWithIdleCallbacks)

    const resolvePreviews = () => {
      if (cancelled) {
        return
      }

      const nextFramePreviewUrls = resolveFramePreviewUrlsWithCache({
        frames,
        spriteWidth,
        spriteHeight,
        cache: framePreviewCacheRef.current
      })

      setFramePreviewUrls((previous) => (arePreviewMapsEqual(previous, nextFramePreviewUrls) ? previous : nextFramePreviewUrls))
    }

    timeoutId = setTimeout(() => {
      if (windowWithIdleCallbacks?.requestIdleCallback) {
        idleCallbackId = windowWithIdleCallbacks.requestIdleCallback(() => {
          resolvePreviews()
        })
        return
      }
      resolvePreviews()
    }, FRAME_PREVIEW_RESOLVE_DEBOUNCE_MS)

    return () => {
      cancelled = true
      if (timeoutId !== null) {
        clearTimeout(timeoutId)
      }
      if (idleCallbackId !== null) {
        windowWithIdleCallbacks?.cancelIdleCallback?.(idleCallbackId)
      }
    }
  }, [frames, spriteHeight, spriteWidth])

  useEffect(() => {
    activeFrameRef.current?.scrollIntoView({ inline: "nearest", behavior: "smooth" })
  }, [activeFrameId])

  const handleFrameDragStart = (event: DragEvent<HTMLDivElement>, frameId: string) => {
    draggedFrameIdRef.current = frameId
    event.dataTransfer.effectAllowed = "move"
    event.dataTransfer.setData(DND_FRAME_MIME, frameId)
  }

  const handleFrameDragOver = (event: DragEvent<HTMLElement>, index: number) => {
    event.preventDefault()
    event.dataTransfer.dropEffect = "move"
    const rect = (event.currentTarget as HTMLElement).getBoundingClientRect()
    const midX = rect.left + rect.width / 2
    const insertIndex = event.clientX < midX ? index : index + 1
    setDropTargetIndex(insertIndex)
  }

  const handleFrameDrop = (event: DragEvent<HTMLElement>) => {
    event.preventDefault()
    const frameId = draggedFrameIdRef.current
    if (!frameId || dropTargetIndex === null) return
    const currentIndex = frames.findIndex((f) => f.id === frameId)
    const adjustedIndex = dropTargetIndex > currentIndex ? dropTargetIndex - 1 : dropTargetIndex
    if (adjustedIndex !== currentIndex) {
      onReorderFrame(frameId, adjustedIndex)
    }
    draggedFrameIdRef.current = null
    setDropTargetIndex(null)
  }

  const handleFrameDragEnd = () => {
    draggedFrameIdRef.current = null
    setDropTargetIndex(null)
  }

  const canDelete = frames.length > 1

  return (
    <div className="mvp16-sprite-frame-timeline flex items-center gap-2 overflow-x-auto border-b border-slate-200 bg-slate-50 px-3 py-2">
      {frames.map((frame, index) => {
        const isActive = frame.id === activeFrameId
        const previewUrl = framePreviewUrls.get(frame.id) ?? ""
        const showDropBefore = dropTargetIndex === index
        const showDropAfter = dropTargetIndex === index + 1 && index === frames.length - 1

        return (
          <div key={frame.id} className="relative flex-shrink-0">
            {showDropBefore && (
              <div className="mvp16-sprite-frame-drop-indicator absolute -left-1.5 bottom-0 top-0 w-0.5 rounded bg-indigo-400" />
            )}
            <div
              ref={isActive ? activeFrameRef : undefined}
              role="button"
              tabIndex={0}
              className={`mvp16-sprite-frame-thumb group relative flex flex-col items-center gap-1 rounded-md border-2 p-1 transition-colors ${
                isActive ? "border-indigo-500 bg-white shadow-sm" : "border-transparent bg-white hover:border-slate-300"
              }`}
              draggable
              onClick={() => onSelectFrame(frame.id)}
              onKeyDown={(event: KeyboardEvent) => {
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault()
                  onSelectFrame(frame.id)
                }
              }}
              onDragStart={(event) => handleFrameDragStart(event, frame.id)}
              onDragOver={(event) => handleFrameDragOver(event, index)}
              onDrop={handleFrameDrop}
              onDragEnd={handleFrameDragEnd}
              title={t("spriteFrameLabel", { index: index + 1 })}
            >
              {previewUrl ? (
                <img
                  src={previewUrl}
                  alt=""
                  className="mvp16-sprite-frame-preview h-10 w-10 rounded-sm object-contain"
                  style={{ imageRendering: "pixelated" }}
                />
              ) : (
                <div className="mvp16-sprite-frame-empty h-10 w-10 rounded-sm bg-slate-100" />
              )}
              <span className="text-[10px] leading-none text-slate-400">{index + 1}</span>
              <div className="absolute -top-1 right-0 flex gap-0.5 opacity-0 transition-opacity group-hover:opacity-100">
                <button
                  type="button"
                  className="mvp16-sprite-frame-duplicate inline-flex h-4 w-4 items-center justify-center rounded-sm bg-white/90 text-slate-400 shadow-sm transition-colors hover:text-indigo-600"
                  onClick={(event: MouseEvent) => {
                    event.stopPropagation()
                    onDuplicateFrame(frame.id)
                  }}
                  title={t("spriteFrameDuplicate")}
                >
                  <Copy className="h-2.5 w-2.5" />
                </button>
                <button
                  type="button"
                  className={`mvp16-sprite-frame-delete inline-flex h-4 w-4 items-center justify-center rounded-sm bg-white/90 text-slate-400 shadow-sm transition-colors ${
                    canDelete ? "hover:text-red-500" : "cursor-not-allowed opacity-30"
                  }`}
                  disabled={!canDelete}
                  onClick={(event: MouseEvent) => {
                    event.stopPropagation()
                    onDeleteFrame(frame.id)
                  }}
                  title={t("spriteFrameDelete")}
                >
                  <Trash2 className="h-2.5 w-2.5" />
                </button>
              </div>
            </div>
            {showDropAfter && (
              <div className="mvp16-sprite-frame-drop-indicator absolute -right-1.5 bottom-0 top-0 w-0.5 rounded bg-indigo-400" />
            )}
          </div>
        )
      })}
      <button
        type="button"
        className="mvp16-sprite-frame-add flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-md border-2 border-dashed border-slate-300 text-slate-400 transition-colors hover:border-indigo-400 hover:text-indigo-500"
        onClick={onAddFrame}
        title={t("spriteFrameAdd")}
      >
        <Plus className="h-4 w-4" />
      </button>
    </div>
  )
}
