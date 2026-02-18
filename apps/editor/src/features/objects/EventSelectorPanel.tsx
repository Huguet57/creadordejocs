import { Activity, Keyboard, Mouse, MousePointer2, Play, Plus, Radio, Scan, Swords, Timer, X } from "lucide-react"
import { useState } from "react"
import {
  EVENT_CATEGORIES,
  EVENT_DISPLAY_NAMES,
  OBJECT_EVENT_KEYS,
  type ObjectEventKey,
  type ObjectEventType,
  type ObjectKeyboardMode,
  type ObjectMouseMode
} from "../editor-state/types.js"

type EventSelectorPanelProps = {
  classNamePrefix: string
  onSelectEvent: (
    type: ObjectEventType,
    key?: ObjectEventKey | null,
    keyboardMode?: ObjectKeyboardMode | null,
    mouseMode?: ObjectMouseMode | null,
    intervalMs?: number | null,
    eventName?: string | null
  ) => void
  onClose: () => void
}

const EVENT_ICON_MAP: Partial<Record<ObjectEventType, React.ElementType>> = {
  Create: Play,
  Step: Activity,
  Collision: Swords,
  Keyboard,
  OnDestroy: X,
  OutsideRoom: Scan,
  Timer,
  MouseMove: MousePointer2,
  Mouse,
  CustomEvent: Radio
}

const EVENT_TYPES_WITH_REQUIRED_CONFIG: ObjectEventType[] = ["Keyboard", "Mouse", "Timer", "CustomEvent"]

export function EventSelectorPanel({ classNamePrefix, onSelectEvent, onClose }: EventSelectorPanelProps) {
  const [selectedType, setSelectedType] = useState<ObjectEventType | null>(null)
  const [eventKey, setEventKey] = useState<ObjectEventKey>("ArrowLeft")
  const [keyboardMode, setKeyboardMode] = useState<ObjectKeyboardMode>("down")
  const [mouseMode, setMouseMode] = useState<ObjectMouseMode>("down")
  const [timerIntervalMs, setTimerIntervalMs] = useState(1000)
  const [customEventName, setCustomEventName] = useState("event")

  const handleTypeSelection = (type: ObjectEventType) => {
    if (EVENT_TYPES_WITH_REQUIRED_CONFIG.includes(type)) {
      setSelectedType(type)
      return
    }
    onSelectEvent(type, null, null, null, null)
  }

  const handleConfirmSelectedType = () => {
    if (selectedType === "Keyboard") {
      onSelectEvent("Keyboard", eventKey, keyboardMode, null, null)
      return
    }
    if (selectedType === "Mouse") {
      onSelectEvent("Mouse", null, null, mouseMode, null)
      return
    }
    if (selectedType === "Timer") {
      onSelectEvent("Timer", null, null, null, timerIntervalMs)
      return
    }
    if (selectedType === "CustomEvent") {
      onSelectEvent("CustomEvent", null, null, null, null, customEventName.trim() || "event")
    }
  }

  return (
    <div className={`${classNamePrefix}-panel flex flex-1 flex-col overflow-hidden bg-slate-50/50`}>
      <div className={`${classNamePrefix}-panel-header flex items-center justify-between border-b border-slate-200 px-4 py-2`}>
        <p className={`${classNamePrefix}-panel-title text-[10px] font-semibold uppercase tracking-wider text-slate-500`}>
          Afegir event
        </p>
        <button
          type="button"
          className={`${classNamePrefix}-close inline-flex h-6 w-6 items-center justify-center rounded text-slate-400 transition-colors hover:bg-slate-200 hover:text-slate-700`}
          onClick={onClose}
          title="Cancel"
          aria-label="Cancel add event"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>

      <div className={`${classNamePrefix}-grid flex-1 space-y-4 overflow-y-auto p-4`}>
        {EVENT_CATEGORIES.map((category) => (
          <div key={category.id} className={`${classNamePrefix}-category`}>
            <p className={`${classNamePrefix}-category-label mb-2 text-[10px] font-semibold uppercase tracking-wider text-slate-400`}>
              {category.label}
            </p>
            <div className="grid grid-cols-4 gap-2">
              {category.types.map((type) => {
                const Icon = EVENT_ICON_MAP[type] ?? Plus
                const isSelected = selectedType === type
                return (
                  <button
                    key={type}
                    type="button"
                    className={`${classNamePrefix}-item flex flex-col items-center justify-center gap-1.5 rounded-lg border px-2 py-3 text-slate-600 transition-colors ${
                      isSelected
                        ? "border-blue-300 bg-blue-50 text-blue-700"
                        : "border-slate-200 bg-white hover:border-slate-400 hover:bg-slate-100 hover:text-slate-900"
                    }`}
                    onClick={() => handleTypeSelection(type)}
                  >
                    <Icon className="h-5 w-5" />
                    <span className="text-center text-[10px] font-medium leading-tight">{EVENT_DISPLAY_NAMES[type]}</span>
                  </button>
                )
              })}
            </div>
          </div>
        ))}
      </div>

      {selectedType && EVENT_TYPES_WITH_REQUIRED_CONFIG.includes(selectedType) && (
        <div className={`${classNamePrefix}-config-panel border-t border-slate-200 bg-white p-3`}>
          {selectedType === "Keyboard" && (
            <div className={`${classNamePrefix}-keyboard-config flex flex-col gap-2`}>
              <p className={`${classNamePrefix}-keyboard-title text-xs font-semibold uppercase tracking-wide text-slate-500`}>
                Add keyboard
              </p>
              <div className="grid grid-cols-[auto_1fr_auto_1fr_auto] items-center gap-2">
                <span className={`${classNamePrefix}-keyboard-key-label text-xs font-medium text-slate-500`}>
                  Key
                </span>
                <select
                  className={`${classNamePrefix}-keyboard-key h-8 w-full rounded border border-slate-300 bg-white px-2 text-xs text-slate-900 focus:border-blue-500 focus:outline-none`}
                  value={eventKey}
                  onChange={(event) => setEventKey(event.target.value as ObjectEventKey)}
                >
                  {OBJECT_EVENT_KEYS.map((key) => (
                    <option key={key} value={key}>{key}</option>
                  ))}
                </select>
                <span className={`${classNamePrefix}-keyboard-mode-label text-xs font-medium text-slate-500`}>
                  Mode
                </span>
                <select
                  className={`${classNamePrefix}-keyboard-mode h-8 w-full rounded border border-slate-300 bg-white px-2 text-xs text-slate-900 focus:border-blue-500 focus:outline-none`}
                  value={keyboardMode}
                  onChange={(event) => setKeyboardMode(event.target.value as ObjectKeyboardMode)}
                >
                  <option value="down">Held</option>
                  <option value="press">Pressed</option>
                </select>
                <button
                  type="button"
                  className={`${classNamePrefix}-confirm h-8 rounded bg-slate-900 px-3 text-xs font-medium text-white transition-colors hover:bg-slate-700`}
                  onClick={handleConfirmSelectedType}
                  title="Add event"
                  aria-label="Confirm add event"
                >
                  Add
                </button>
              </div>
            </div>
          )}

          {selectedType === "Timer" && (
            <div className={`${classNamePrefix}-timer-config flex flex-col gap-2`}>
              <p className={`${classNamePrefix}-timer-title text-xs font-semibold uppercase tracking-wide text-slate-500`}>
                Add timer
              </p>
              <div className="grid grid-cols-[auto_1fr_auto] items-center gap-2">
                <span className={`${classNamePrefix}-timer-label text-xs font-medium text-slate-500`}>
                  Interval (ms)
                </span>
                <input
                  type="number"
                  min={1}
                  className={`${classNamePrefix}-timer-interval h-8 w-full rounded border border-slate-300 bg-white px-2 text-xs text-slate-900 focus:border-blue-500 focus:outline-none`}
                  value={timerIntervalMs}
                  onChange={(event) => setTimerIntervalMs(Math.max(1, Number(event.target.value) || 1))}
                />
                <button
                  type="button"
                  className={`${classNamePrefix}-confirm h-8 rounded bg-slate-900 px-3 text-xs font-medium text-white transition-colors hover:bg-slate-700`}
                  onClick={handleConfirmSelectedType}
                  title="Add event"
                  aria-label="Confirm add event"
                >
                  Add
                </button>
              </div>
            </div>
          )}

          {selectedType === "Mouse" && (
            <div className={`${classNamePrefix}-mouse-config flex flex-col gap-2`}>
              <p className={`${classNamePrefix}-mouse-title text-xs font-semibold uppercase tracking-wide text-slate-500`}>
                Add mouse
              </p>
              <div className="grid grid-cols-[auto_1fr_auto] items-center gap-2">
                <span className={`${classNamePrefix}-mouse-mode-label text-xs font-medium text-slate-500`}>
                  Mode
                </span>
                <select
                  className={`${classNamePrefix}-mouse-mode h-8 w-full rounded border border-slate-300 bg-white px-2 text-xs text-slate-900 focus:border-blue-500 focus:outline-none`}
                  value={mouseMode}
                  onChange={(event) => setMouseMode(event.target.value as ObjectMouseMode)}
                >
                  <option value="down">Held</option>
                  <option value="press">Pressed</option>
                </select>
                <button
                  type="button"
                  className={`${classNamePrefix}-confirm h-8 rounded bg-slate-900 px-3 text-xs font-medium text-white transition-colors hover:bg-slate-700`}
                  onClick={handleConfirmSelectedType}
                  title="Add event"
                  aria-label="Confirm add event"
                >
                  Add
                </button>
              </div>
            </div>
          )}

          {selectedType === "CustomEvent" && (
            <div className={`${classNamePrefix}-custom-event-config flex flex-col gap-2`}>
              <p className={`${classNamePrefix}-custom-event-title text-xs font-semibold uppercase tracking-wide text-slate-500`}>
                Add custom event
              </p>
              <div className="grid grid-cols-[auto_1fr_auto] items-center gap-2">
                <span className={`${classNamePrefix}-custom-event-name-label text-xs font-medium text-slate-500`}>
                  Nom
                </span>
                <input
                  type="text"
                  className={`${classNamePrefix}-custom-event-name h-8 w-full rounded border border-slate-300 bg-white px-2 text-xs text-slate-900 focus:border-blue-500 focus:outline-none`}
                  value={customEventName}
                  onChange={(event) => setCustomEventName(event.target.value)}
                  placeholder="event"
                />
                <button
                  type="button"
                  className={`${classNamePrefix}-confirm h-8 rounded bg-slate-900 px-3 text-xs font-medium text-white transition-colors hover:bg-slate-700`}
                  onClick={handleConfirmSelectedType}
                  title="Add event"
                  aria-label="Confirm add event"
                >
                  Add
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
