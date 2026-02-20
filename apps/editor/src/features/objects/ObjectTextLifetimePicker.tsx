import { useEffect, useState, useRef } from "react"
import { ChevronDown, Clock3, Pin } from "lucide-react"
import type { ValueExpression } from "@creadordejocs/project-format"
import type { VariableOption, ObjectVariableOption } from "./VariablePicker.js"
import { RightValuePicker } from "./RightValuePicker.js"

type ObjectTextLifetimeMode = "temporary" | "persistent"

type ObjectTextLifetimePickerProps = {
  mode?: ObjectTextLifetimeMode | null
  durationMs?: ValueExpression | null
  globalVariables: VariableOption[]
  internalVariables: ObjectVariableOption[]
  otherInternalVariables?: ObjectVariableOption[]
  allowOtherTarget?: boolean
  onChange: (next: { mode: ObjectTextLifetimeMode; durationMs: ValueExpression }) => void
}

function asLiteralNumber(value: number): ValueExpression {
  return { source: "literal", value }
}

function toDurationDisplay(value: ValueExpression): string {
  if (typeof value === "number" && Number.isFinite(value)) {
    return `${Math.max(1, Math.round(value))} ms`
  }
  if (typeof value === "object" && value !== null && "source" in value) {
    if (value.source === "literal" && typeof value.value === "number" && Number.isFinite(value.value)) {
      return `${Math.max(1, Math.round(value.value))} ms`
    }
  }
  return "ms variable"
}

export function ObjectTextLifetimePicker({
  mode,
  durationMs,
  globalVariables,
  internalVariables,
  otherInternalVariables = [],
  allowOtherTarget = false,
  onChange
}: ObjectTextLifetimePickerProps) {
  const [isOpen, setIsOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

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

  const normalizedMode: ObjectTextLifetimeMode = mode === "persistent" ? "persistent" : "temporary"
  const normalizedDurationMs: ValueExpression = durationMs ?? asLiteralNumber(2000)
  const triggerLabel =
    normalizedMode === "persistent" ? "persistent" : toDurationDisplay(normalizedDurationMs)
  const TriggerIcon = normalizedMode === "persistent" ? Pin : Clock3

  return (
    <div ref={containerRef} className="object-text-lifetime-picker relative">
      <button
        type="button"
        className="object-text-lifetime-picker-trigger flex h-7 min-w-[120px] items-center gap-1.5 rounded border border-slate-300 bg-white px-2 text-xs hover:bg-slate-50 focus:outline-none"
        onClick={() => setIsOpen((prev) => !prev)}
      >
        <TriggerIcon className="h-3 w-3 shrink-0 text-slate-400" />
        <span className="truncate text-slate-700">{triggerLabel}</span>
        <ChevronDown className="ml-auto h-3 w-3 shrink-0 text-slate-300" />
      </button>

      {isOpen && (
        <div className="object-text-lifetime-picker-popover absolute top-full z-50 mt-1 min-w-[220px] rounded-lg border border-slate-200 bg-white shadow-lg">
          <div className="object-text-lifetime-picker-header border-b border-slate-100 bg-slate-50 px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400">
            Durada text
          </div>

          <button
            type="button"
            className={`object-text-lifetime-picker-option-persistent flex w-full items-center gap-2 px-3 py-2 text-left text-xs transition-colors ${
              normalizedMode === "persistent" ? "bg-blue-50 text-blue-700" : "text-slate-700 hover:bg-slate-50"
            }`}
            onClick={() => {
              onChange({ mode: "persistent", durationMs: normalizedDurationMs })
              setIsOpen(false)
            }}
          >
            <Pin className="h-3.5 w-3.5 shrink-0" />
            <span className="font-medium">Persistent</span>
          </button>

          <div className="border-t border-slate-100 px-3 py-2">
            <div className="mb-1.5 flex items-center justify-between">
              <button
                type="button"
                className={`object-text-lifetime-picker-option-temporary inline-flex items-center gap-2 rounded px-2 py-1 text-xs transition-colors ${
                  normalizedMode === "temporary"
                    ? "bg-blue-50 font-medium text-blue-700"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
                onClick={() => onChange({ mode: "temporary", durationMs: normalizedDurationMs })}
              >
                <Clock3 className="h-3.5 w-3.5 shrink-0" />
                Temporary
              </button>
            </div>
            <div className="object-text-lifetime-picker-duration-row flex items-center gap-1">
              <span className="text-[10px] font-medium text-slate-500">ms</span>
              <RightValuePicker
                value={normalizedDurationMs}
                expectedType="number"
                globalVariables={globalVariables}
                internalVariables={internalVariables}
                otherInternalVariables={otherInternalVariables}
                allowOtherTarget={allowOtherTarget}
                onChange={(nextValue) => onChange({ mode: "temporary", durationMs: nextValue })}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
