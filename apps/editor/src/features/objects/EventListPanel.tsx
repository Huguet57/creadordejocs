import { useEffect, useRef, useState } from "react"
import { Activity, Box, Copy, Keyboard, Mouse, MousePointer2, Play, Plus, Radio, Scan, Swords, Timer, Trash2, X } from "lucide-react"
import { Button } from "../../components/ui/button.js"
import {
  EVENT_DISPLAY_NAMES,
  type ObjectEventType,
  type ObjectEventEntry
} from "../editor-state/types.js"

type EventListPanelProps = {
  events: ObjectEventEntry[]
  activeEventId: string | null
  collisionTargets: { id: string; name: string; spriteSrc: string | null }[]
  isAddingEvent: boolean
  onSelectEvent: (id: string) => void
  onStartAddEvent: () => void
  onCancelAddEvent: () => void
  onRemoveEvent: (id: string) => void
  onDuplicateEvent: (id: string) => void
}

const EVENT_ICONS: Record<ObjectEventType, React.ElementType> = {
  Create: Play,
  Step: Activity,
  Collision: Swords,
  Keyboard: Keyboard,
  OnDestroy: X,
  OutsideRoom: Scan,
  Timer: Timer,
  Mouse: Mouse,
  MouseMove: MousePointer2,
  CustomEvent: Radio
}

const DUPLICATABLE_EVENT_TYPES = new Set<ObjectEventType>(["Keyboard", "Mouse", "Collision", "Timer", "CustomEvent"])

type EventContextMenuState = {
  x: number
  y: number
  eventId: string | null
} | null

export function EventListPanel({
  events,
  activeEventId,
  collisionTargets,
  isAddingEvent,
  onSelectEvent,
  onStartAddEvent,
  onCancelAddEvent,
  onRemoveEvent,
  onDuplicateEvent
}: EventListPanelProps) {
  const [contextMenu, setContextMenu] = useState<EventContextMenuState>(null)
  const contextMenuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!contextMenu) return
    const handleClick = (e: globalThis.MouseEvent) => {
      if (contextMenuRef.current && !contextMenuRef.current.contains(e.target as Node)) {
        setContextMenu(null)
      }
    }
    const handleEscape = (e: globalThis.KeyboardEvent) => {
      if (e.key === "Escape") setContextMenu(null)
    }
    document.addEventListener("mousedown", handleClick)
    document.addEventListener("keydown", handleEscape)
    return () => {
      document.removeEventListener("mousedown", handleClick)
      document.removeEventListener("keydown", handleEscape)
    }
  }, [contextMenu])

  return (
    <aside className="mvp3-event-list-panel flex w-[220px] flex-col border-r border-slate-200 bg-slate-50">
      <div className="flex items-center justify-between border-b border-slate-200 p-3">
        <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Events</span>
      </div>

      <div
        className="flex-1 overflow-y-auto p-2"
        onContextMenu={(e) => {
          e.preventDefault()
          setContextMenu({ x: e.clientX, y: e.clientY, eventId: null })
        }}
      >
        <div className="flex flex-col gap-1">
          {events.length === 0 && (
            <p className="px-2 py-4 text-center text-xs text-slate-400">No events defined</p>
          )}
          {events.map((event) => {
            const Icon = EVENT_ICONS[event.type] ?? Activity
            const collisionTarget = event.type === "Collision" && event.targetObjectId
              ? collisionTargets.find((targetObject) => targetObject.id === event.targetObjectId) ?? null
              : null
            return (
              <div
                key={event.id}
                className={`group flex cursor-pointer items-center rounded px-2 py-1.5 transition-colors ${
                  activeEventId === event.id
                    ? "bg-white shadow-sm ring-1 ring-slate-200"
                    : "hover:bg-slate-100"
                }`}
                onClick={() => onSelectEvent(event.id)}
                onContextMenu={(e) => {
                  e.preventDefault()
                  e.stopPropagation()
                  onSelectEvent(event.id)
                  setContextMenu({ x: e.clientX, y: e.clientY, eventId: event.id })
                }}
              >
                <button
                  type="button"
                  className="flex flex-1 items-center gap-2 text-left"
                  onClick={() => onSelectEvent(event.id)}
                >
                  <Icon className={`h-3.5 w-3.5 ${activeEventId === event.id ? "text-blue-500" : "text-slate-400"}`} />
                  <div className="flex flex-col overflow-hidden">
                    <span className={`truncate text-sm ${activeEventId === event.id ? "font-medium text-slate-900" : "text-slate-600"}`}>
                      {EVENT_DISPLAY_NAMES[event.type] ?? event.type}
                    </span>
                    {event.type === "Collision" && collisionTarget && (
                      <span className="mvp20-event-collision-target-row inline-flex items-center gap-1 text-[10px] text-slate-400">
                        {collisionTarget.spriteSrc ? (
                          <img
                            src={collisionTarget.spriteSrc}
                            alt=""
                            className="mvp20-event-collision-target-icon h-3.5 w-3.5 object-contain"
                            style={{ imageRendering: "pixelated" }}
                          />
                        ) : (
                          <Box className="mvp20-event-collision-target-fallback h-2.5 w-2.5 text-slate-400" />
                        )}
                        <span className="truncate">{collisionTarget.name}</span>
                      </span>
                    )}
                    {event.type === "Keyboard" && event.key && (
                      <span className="truncate text-[10px] text-slate-400">
                        {event.keyboardMode === "press" ? "KeyPress" : "KeyDown"}: {event.key}
                      </span>
                    )}
                    {event.type === "Mouse" && (
                      <span className="truncate text-[10px] text-slate-400">
                        {event.mouseMode === "press" ? "Pressed" : "Held"}
                      </span>
                    )}
                    {event.type === "Timer" && (
                      <span className="truncate text-[10px] text-slate-400">Every: {event.intervalMs ?? 1000}ms</span>
                    )}
                    {event.type === "CustomEvent" && (
                      <span className="truncate text-[10px] text-slate-400">
                        {(event as typeof event & { eventName?: string }).eventName ?? "event"}
                      </span>
                    )}
                  </div>
                </button>
              </div>
            )
          })}
          {isAddingEvent && (
            <div className="mvp26-event-ghost-row group flex cursor-default items-center justify-between rounded bg-white px-2 py-1.5 shadow-sm ring-1 ring-slate-200">
              <div className="flex flex-1 items-center gap-2 text-left">
                <Plus className="h-3.5 w-3.5 text-blue-500" />
                <div className="flex flex-col overflow-hidden">
                  <span className="truncate text-sm font-medium text-slate-900">New event</span>
                  <span className="truncate text-[10px] text-slate-400">Configuring...</span>
                </div>
              </div>
              <button
                type="button"
                className="mvp26-event-ghost-cancel opacity-100 transition-opacity hover:text-red-500"
                onClick={onCancelAddEvent}
                title="Cancel"
                aria-label="Cancel new event"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="border-t border-slate-200 bg-white p-3">
        <Button
          variant="outline"
          size="sm"
          className="w-full h-8 text-xs"
          onClick={onStartAddEvent}
        >
          <Plus className="mr-2 h-3.5 w-3.5" />
          Add Event
        </Button>
      </div>

      {contextMenu && (
        <div
          ref={contextMenuRef}
          className="event-context-menu fixed z-30 min-w-[160px] overflow-hidden rounded-md border border-slate-200 bg-white py-1 shadow-lg"
          style={{ left: `${contextMenu.x}px`, top: `${contextMenu.y}px` }}
          onMouseDown={(e) => e.stopPropagation()}
        >
          <button
            type="button"
            className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-xs text-slate-700 transition-colors hover:bg-slate-100"
            onClick={() => {
              setContextMenu(null)
              onStartAddEvent()
            }}
          >
            <Plus className="h-3.5 w-3.5" />
            Afegir event
          </button>
          {contextMenu.eventId && (() => {
            const contextEvent = events.find((e) => e.id === contextMenu.eventId)
            const canDuplicate = contextEvent != null && DUPLICATABLE_EVENT_TYPES.has(contextEvent.type)
            return (
              <>
                {canDuplicate && (
                  <button
                    type="button"
                    className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-xs text-slate-700 transition-colors hover:bg-slate-100"
                    onClick={() => {
                      const eventId = contextMenu.eventId!
                      setContextMenu(null)
                      onDuplicateEvent(eventId)
                    }}
                  >
                    <Copy className="h-3.5 w-3.5" />
                    Duplica event
                  </button>
                )}
                <div className="my-1 border-t border-slate-100" />
                <button
                  type="button"
                  className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-xs text-red-600 transition-colors hover:bg-red-50"
                  onClick={() => {
                    const eventId = contextMenu.eventId!
                    setContextMenu(null)
                    onRemoveEvent(eventId)
                  }}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  Elimina event
                </button>
              </>
            )
          })()}
        </div>
      )}
    </aside>
  )
}
