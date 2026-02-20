import { useEffect, useState, useRef } from "react"
import { ChevronDown, Clock3, Pin } from "lucide-react"
import type { ValueExpression } from "@creadordejocs/project-format"
import { RightValuePicker } from "./RightValuePicker.js"

type ObjectTextLifetimeMode = "temporary" | "persistent"

type ObjectTextLifetimePickerProps = {
  mode?: ObjectTextLifetimeMode | null
  durationMs?: ValueExpression | null
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
  const TriggerIcon = normalizedMode === "persistent" ? Pin : Clock3
  const triggerLabel =
    normalizedMode === "persistent" ? "persistent" : toDurationDisplay(normalizedDurationMs)

  return (
    <div ref={containerRef} className="object-text-lifetime-picker relative">
      <button
        type="button"
        className="object-text-lifetime-picker-trigger flex h-7 items-center gap-1.5 rounded border border-slate-300 bg-white/50 px-2 text-xs hover:bg-slate-50 focus:outline-none"
        onClick={() => setIsOpen((prev) => !prev)}
      >
        <TriggerIcon className="h-3 w-3 shrink-0 text-slate-400" />
        <span className="truncate text-slate-700">{triggerLabel}</span>
        <ChevronDown className="ml-auto h-3 w-3 shrink-0 text-slate-300" />
      </button>

      {isOpen && (
        <div className="object-text-lifetime-picker-popover absolute top-full z-50 mt-1 min-w-[200px] rounded-lg border border-slate-200 bg-white py-1 shadow-lg">
          <button
            type="button"
            className={`object-text-lifetime-picker-option-persistent flex w-full items-center gap-1.5 px-3 py-1.5 text-left text-xs transition-colors ${
              normalizedMode === "persistent" ? "bg-blue-50 font-medium text-blue-700" : "text-slate-700 hover:bg-slate-50"
            }`}
            onClick={() => {
              onChange({ mode: "persistent", durationMs: normalizedDurationMs })
              setIsOpen(false)
            }}
          >
            <Pin className="h-3 w-3 shrink-0" />
            Persistent
          </button>

          <button
            type="button"
            className={`object-text-lifetime-picker-option-temporary flex w-full items-center gap-1.5 px-3 py-1.5 text-left text-xs transition-colors ${
              normalizedMode === "temporary" ? "bg-blue-50 font-medium text-blue-700" : "text-slate-700 hover:bg-slate-50"
            }`}
            onClick={(event) => {
              if ((event.target as HTMLElement).closest(".object-text-lifetime-picker-duration-row")) return
              onChange({ mode: "temporary", durationMs: normalizedDurationMs })
              setIsOpen(false)
            }}
          >
            <Clock3 className="h-3 w-3 shrink-0" />
            <span className="shrink-0">Temporal</span>
            <span className="object-text-lifetime-picker-duration-row flex items-center gap-1" role="group" onClick={(event) => event.stopPropagation()} onKeyDown={(event) => event.stopPropagation()}>
              <RightValuePicker
                value={normalizedDurationMs}
                expectedType="number"
                globalVariables={[]}
                internalVariables={[]}
                allowedSources={["literal", "random"]}
                onChange={(nextValue) => onChange({ mode: "temporary", durationMs: nextValue })}
              />
              <span className="text-[10px] text-slate-400">ms</span>
            </span>
          </button>
        </div>
      )}
    </div>
  )
}
