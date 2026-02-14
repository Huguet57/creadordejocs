import { Activity, Keyboard, MousePointerClick, Play, Zap, Plus, X } from "lucide-react"
import { useState } from "react"
import { Button } from "../../components/ui/button.js"
import { OBJECT_EVENT_TYPES, OBJECT_EVENT_KEYS, type ObjectEventType, type ObjectEventKey, type ObjectEventEntry } from "../editor-state/types.js"

type EventListPanelProps = {
  events: ObjectEventEntry[]
  activeEventId: string | null
  onSelectEvent: (id: string) => void
  onAddEvent: (type: ObjectEventType, key?: ObjectEventKey | null) => void
  onRemoveEvent: (id: string) => void
}

const EVENT_ICONS: Record<ObjectEventType, React.ElementType> = {
  Create: Play,
  Step: Activity,
  Draw: MousePointerClick, // Placeholder
  Collision: Zap,
  Keyboard: Keyboard
}

export function EventListPanel({
  events,
  activeEventId,
  onSelectEvent,
  onAddEvent,
  onRemoveEvent
}: EventListPanelProps) {
  const [eventType, setEventType] = useState<ObjectEventType>("Create")
  const [eventKey, setEventKey] = useState<ObjectEventKey>("ArrowLeft")

  const handleAddEvent = () => {
    onAddEvent(eventType, eventType === "Keyboard" ? eventKey : null)
  }

  return (
    <aside className="mvp3-event-list-panel flex w-[220px] flex-col border-r border-slate-200 bg-slate-50">
      <div className="flex items-center justify-between border-b border-slate-200 p-3">
        <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Events</span>
      </div>

      <div className="p-3 border-b border-slate-200 bg-white space-y-2">
        <div className="flex flex-col gap-2">
          <select
            className="h-8 w-full rounded border border-slate-300 bg-white px-2 text-xs text-slate-900 focus:border-blue-500 focus:outline-none"
            value={eventType}
            onChange={(e) => setEventType(e.target.value as ObjectEventType)}
          >
            {OBJECT_EVENT_TYPES.map((type) => (
              <option key={type} value={type}>{type}</option>
            ))}
          </select>
          
          {eventType === "Keyboard" && (
            <select
              className="h-8 w-full rounded border border-slate-300 bg-white px-2 text-xs text-slate-900 focus:border-blue-500 focus:outline-none"
              value={eventKey}
              onChange={(e) => setEventKey(e.target.value as ObjectEventKey)}
            >
              {OBJECT_EVENT_KEYS.map((key) => (
                <option key={key} value={key}>{key}</option>
              ))}
            </select>
          )}

          <Button 
            size="sm" 
            className="w-full h-8 text-xs"
            onClick={handleAddEvent}
          >
            <Plus className="mr-2 h-3.5 w-3.5" />
            Add Event
          </Button>
        </div>
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
                      <span className="truncate text-[10px] text-slate-400">Key: {event.key}</span>
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
    </aside>
  )
}
