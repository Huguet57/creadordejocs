import { useEffect, useRef, useState } from "react"
import { Globe, Box, ChevronDown } from "lucide-react"

export type VariableOption = {
  id: string
  name: string
  type: string
}

export type ObjectVariableOption = {
  id: string
  label: string
  type: string
  objectName: string
}

type VariablePickerProps = {
  scope: "global" | "object"
  variableId: string
  globalVariables: VariableOption[]
  objectVariables: ObjectVariableOption[]
  onChange: (scope: "global" | "object", variableId: string) => void
  showTarget?: boolean | undefined
  target?: "self" | "other" | "instanceId" | null | undefined
  targetInstanceId?: string | null | undefined
  roomInstances?: { id: string }[] | undefined
  onTargetChange?: ((target: "self" | "other" | "instanceId", instanceId: string | null) => void) | undefined
  filter?: ((v: { type: string }) => boolean) | undefined
  allowedScopes?: ("global" | "object")[] | undefined
  variant?: "default" | "amber" | "blue" | undefined
}

const TARGET_LABELS: Record<string, string> = {
  self: "self",
  other: "other",
  instanceId: "id"
}

function getDisplayName(
  scope: "global" | "object",
  variableId: string,
  globalVariables: VariableOption[],
  objectVariables: ObjectVariableOption[]
): string {
  if (scope === "global") {
    const found = globalVariables.find((v) => v.id === variableId)
    return found?.name ?? "?"
  }
  const found = objectVariables.find((v) => v.id === variableId)
  return found?.label ?? "?"
}

export function VariablePicker({
  scope,
  variableId,
  globalVariables,
  objectVariables,
  onChange,
  showTarget = false,
  target,
  onTargetChange,
  filter,
  allowedScopes,
  variant = "default"
}: VariablePickerProps) {
  const [isOpen, setIsOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const [localTarget, setLocalTarget] = useState<"self" | "other" | "instanceId">(target ?? "self")

  // Sync local target state with props
  useEffect(() => {
    setLocalTarget(target ?? "self")
  }, [target])

  // Close on click outside
  useEffect(() => {
    if (!isOpen) return
    function handleMouseDown(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener("mousedown", handleMouseDown)
    return () => document.removeEventListener("mousedown", handleMouseDown)
  }, [isOpen])

  const filteredGlobal = filter ? globalVariables.filter(filter) : globalVariables
  const filteredObject = filter ? objectVariables.filter(filter) : objectVariables

  const showGlobal = !allowedScopes || allowedScopes.includes("global")
  const showObject = !allowedScopes || allowedScopes.includes("object")

  const displayName = getDisplayName(scope, variableId, globalVariables, objectVariables)
  const ScopeIcon = scope === "global" ? Globe : Box

  const targetSuffix =
    showTarget && scope === "object" && target
      ? `(${TARGET_LABELS[target] ?? target})`
      : null

  const borderColor = variant === "amber" ? "border-amber-200" : variant === "blue" ? "border-blue-200" : "border-slate-300"
  const hoverBg = variant === "amber" ? "hover:bg-amber-50" : variant === "blue" ? "hover:bg-blue-50" : "hover:bg-slate-50"
  const focusBorder = variant === "amber" ? "focus:border-amber-400" : variant === "blue" ? "focus:border-blue-400" : "focus:border-slate-400"

  return (
    <div className="variable-picker-container relative" ref={containerRef}>
      <button
        type="button"
        className={`variable-picker-trigger flex items-center gap-1 h-6 rounded border ${borderColor} bg-white px-1.5 text-xs ${hoverBg} ${focusBorder} focus:outline-none transition-colors max-w-[180px]`}
        onClick={() => setIsOpen(!isOpen)}
      >
        <ScopeIcon className="h-3 w-3 shrink-0 text-slate-400" />
        <span className="truncate text-slate-700">{displayName}</span>
        {targetSuffix && (
          <span className="text-[9px] text-slate-400 shrink-0">{targetSuffix}</span>
        )}
        <ChevronDown className="h-3 w-3 shrink-0 text-slate-300" />
      </button>

      {isOpen && (
        <div className="variable-picker-popover absolute top-full left-0 z-50 mt-1 min-w-[220px] max-h-[280px] overflow-y-auto rounded-lg border border-slate-200 bg-white shadow-lg">
          {showGlobal && filteredGlobal.length > 0 && (
            <div className="variable-picker-global-section">
              <div className="variable-picker-section-header px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400 bg-slate-50 border-b border-slate-100">
                Global
              </div>
              {filteredGlobal.map((variable) => (
                <button
                  key={variable.id}
                  type="button"
                  className={`variable-picker-global-row flex items-center gap-2 w-full px-3 py-1.5 text-xs text-left hover:bg-blue-50 transition-colors ${
                    scope === "global" && variableId === variable.id ? "bg-blue-50 font-medium" : ""
                  }`}
                  onClick={() => {
                    onChange("global", variable.id)
                    setIsOpen(false)
                  }}
                >
                  <Globe className="h-3 w-3 text-slate-400 shrink-0" />
                  <span className="flex-1 truncate">{variable.name}</span>
                  <span className="variable-picker-type-badge text-[9px] px-1 py-0.5 rounded bg-slate-100 text-slate-400 shrink-0">
                    {variable.type === "number" ? "num" : variable.type === "boolean" ? "bool" : "str"}
                  </span>
                </button>
              ))}
            </div>
          )}

          {showObject && filteredObject.length > 0 && (
            <div className="variable-picker-object-section">
              <div className="variable-picker-section-header px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
                <span>Objecte</span>
                {showTarget && (
                  <div className="flex items-center gap-1">
                    {(["self", "other"] as const).map((t) => (
                      <button
                        key={t}
                        type="button"
                        className={`variable-picker-target-btn px-1.5 py-0.5 rounded text-[9px] transition-colors ${
                          localTarget === t
                            ? "bg-slate-700 text-white"
                            : "bg-slate-200 text-slate-500 hover:bg-slate-300"
                        }`}
                        onClick={(e) => {
                          e.stopPropagation()
                          setLocalTarget(t)
                          onTargetChange?.(t, null)
                        }}
                      >
                        {TARGET_LABELS[t]}
                      </button>
                    ))}
                  </div>
                )}
              </div>
              {filteredObject.map((variable) => (
                <button
                  key={`${variable.objectName}-${variable.id}`}
                  type="button"
                  className={`variable-picker-object-row flex items-center gap-2 w-full px-3 py-1.5 text-xs text-left hover:bg-blue-50 transition-colors ${
                    scope === "object" && variableId === variable.id ? "bg-blue-50 font-medium" : ""
                  }`}
                  onClick={() => {
                    onChange("object", variable.id)
                    setIsOpen(false)
                  }}
                >
                  <Box className="h-3 w-3 text-slate-400 shrink-0" />
                  <span className="flex-1 truncate">{variable.label}</span>
                  <span className="variable-picker-type-badge text-[9px] px-1 py-0.5 rounded bg-slate-100 text-slate-400 shrink-0">
                    {variable.type === "number" ? "num" : variable.type === "boolean" ? "bool" : "str"}
                  </span>
                </button>
              ))}
            </div>
          )}

          {filteredGlobal.length === 0 && filteredObject.length === 0 && (
            <div className="variable-picker-empty px-3 py-3 text-xs text-slate-400 text-center">
              Cap variable disponible
            </div>
          )}
        </div>
      )}
    </div>
  )
}
