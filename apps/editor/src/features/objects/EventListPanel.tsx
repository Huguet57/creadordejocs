import { Activity, Keyboard, Mouse, MousePointer2, MousePointerClick, Play, Zap, Plus, X, Scan, Timer } from "lucide-react"
import { useState } from "react"
import { Button } from "../../components/ui/button.js"
import {
  OBJECT_EVENT_TYPES,
  OBJECT_EVENT_KEYS,
  type ObjectEventType,
  type ObjectEventKey,
  type ObjectEventEntry,
  type ObjectKeyboardMode
} from "../editor-state/types.js"

type EventListPanelProps = {
  events: ObjectEventEntry[]
  activeEventId: string | null
  onSelectEvent: (id: string) => void
  onAddEvent: (
    type: ObjectEventType,
    key?: ObjectEventKey | null,
    keyboardMode?: ObjectKeyboardMode | null,
    intervalMs?: number | null
  ) => void
  onRemoveEvent: (id: string) => void
}

const EVENT_ICONS: Record<ObjectEventType, React.ElementType> = {
  Create: Play,
  Step: Activity,
  Draw: MousePointerClick, // Placeholder
  Collision: Zap,
  Keyboard: Keyboard,
  OnDestroy: X,
  OutsideRoom: Scan,
  Timer: Timer,
  MouseMove: MousePointer2,
  MouseDown: Mouse,
  MouseClick: MousePointerClick
}

export function EventListPanel({
  events,
  activeEventId,
  onSelectEvent,
  onAddEvent,
  onRemoveEvent
}: EventListPanelProps) {
  const [isAdding, setIsAdding] = useState(false)
  const [eventType, setEventType] = useState<ObjectEventType>("Create")
  const [eventKey, setEventKey] = useState<ObjectEventKey>("ArrowLeft")
  const [keyboardMode, setKeyboardMode] = useState<ObjectKeyboardMode>("down")
  const [timerIntervalMs, setTimerIntervalMs] = useState(1000)

  const handleAddEvent = () => {
    onAddEvent(
      eventType,
      eventType === "Keyboard" ? eventKey : null,
      eventType === "Keyboard" ? keyboardMode : null,
      eventType === "Timer" ? timerIntervalMs : null
    )
    setIsAdding(false)
  }

  return (
    <aside className="mvp3-event-list-panel flex w-[220px] flex-col border-r border-slate-200 bg-slate-50">
      <div className="flex items-center justify-between border-b border-slate-200 p-3">
        <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Events</span>
      </div>

      <div className="flex-1 overflow-y-auto p-2">
        <div className="flex flex-col gap-1">
          {events.length === 0 && (
            <p className="px-2 py-4 text-center text-xs text-slate-400">No events defined</p>
          )}
          {events.map((event) => {
            const Icon = EVENT_ICONS[event.type] ?? Activity
            return (
              <div
                key={event.id}
                className={`group flex items-center justify-between rounded px-2 py-1.5 transition-colors ${
                  activeEventId === event.id
                    ? "bg-white shadow-sm ring-1 ring-slate-200"
                    : "hover:bg-slate-100"
                }`}
              >
                <button
                  type="button"
                  className="flex flex-1 items-center gap-2 text-left"
                  onClick={() => onSelectEvent(event.id)}
                >
                  <Icon className={`h-3.5 w-3.5 ${activeEventId === event.id ? "text-blue-500" : "text-slate-400"}`} />
                  <div className="flex flex-col overflow-hidden">
                    <span className={`truncate text-sm ${activeEventId === event.id ? "font-medium text-slate-900" : "text-slate-600"}`}>
                      {event.type}
                    </span>
                    {event.type === "Keyboard" && event.key && (
                      <span className="truncate text-[10px] text-slate-400">
                        Key: {event.key} ({event.keyboardMode ?? "down"})
                      </span>
                    )}
                    {event.type === "Timer" && (
                      <span className="truncate text-[10px] text-slate-400">Every: {event.intervalMs ?? 1000}ms</span>
                    )}
                  </div>
                </button>
                <button
                  type="button"
                  className={`opacity-0 transition-opacity hover:text-red-500 group-hover:opacity-100 ${activeEventId === event.id ? "opacity-100" : ""}`}
                  onClick={(e) => {
                    e.stopPropagation()
                    onRemoveEvent(event.id)
                  }}
                  title="Remove event"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            )
          })}
        </div>
      </div>

      <div className="p-3 border-t border-slate-200 bg-white">
        {isAdding ? (
          <div className="mvp3-event-add-panel flex flex-col gap-2 rounded-md border border-slate-200 bg-slate-50 p-2">
            <div className="mvp3-event-add-panel-header flex items-center justify-between">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">Add Event</p>
              <button
                type="button"
                className="mvp3-event-add-panel-close inline-flex h-6 w-6 items-center justify-center rounded text-slate-400 transition-colors hover:bg-slate-200 hover:text-slate-700"
                onClick={() => setIsAdding(false)}
                title="Cancel"
                aria-label="Cancel add event"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>

            <div className="flex gap-2">
              <select
                className="h-8 w-full rounded border border-slate-300 bg-white px-2 text-xs text-slate-900 focus:border-blue-500 focus:outline-none"
                value={eventType}
                onChange={(e) => {
                  setEventType(e.target.value as ObjectEventType)
                }}
              >
                {OBJECT_EVENT_TYPES.map((type) => (
                  <option key={type} value={type}>{type}</option>
                ))}
              </select>
              <Button
                size="sm"
                className="h-8 w-8 shrink-0 px-0"
                onClick={handleAddEvent}
                title="Add event"
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>

            {eventType === "Keyboard" && (
              <div className="mvp16-keyboard-config-grid grid grid-cols-2 gap-2">
                <select
                  className="h-8 w-full rounded border border-slate-300 bg-white px-2 text-xs text-slate-900 focus:border-blue-500 focus:outline-none"
                  value={eventKey}
                  onChange={(e) => {
                    setEventKey(e.target.value as ObjectEventKey)
                  }}
                >
                  {OBJECT_EVENT_KEYS.map((key) => (
                    <option key={key} value={key}>{key}</option>
                  ))}
                </select>
                <select
                  className="h-8 w-full rounded border border-slate-300 bg-white px-2 text-xs text-slate-900 focus:border-blue-500 focus:outline-none"
                  value={keyboardMode}
                  onChange={(e) => setKeyboardMode(e.target.value as ObjectKeyboardMode)}
                >
                  <option value="down">Held</option>
                  <option value="press">Pressed</option>
                </select>
              </div>
            )}

            {eventType === "Timer" && (
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-medium uppercase tracking-wide text-slate-500">Interval (ms)</span>
                <input
                  type="number"
                  min={1}
                  className="h-8 w-full rounded border border-slate-300 bg-white px-2 text-xs text-slate-900 focus:border-blue-500 focus:outline-none"
                  value={timerIntervalMs}
                  onChange={(e) => setTimerIntervalMs(Math.max(1, Number(e.target.value) || 1))}
                />
              </div>
            )}
          </div>
        ) : (
          <Button
            variant="outline"
            size="sm"
            className="w-full h-8 text-xs"
            onClick={() => setIsAdding(true)}
          >
            <Plus className="mr-2 h-3.5 w-3.5" />
            Add Event
          </Button>
        )}
      </div>
    </aside>
  )
}
