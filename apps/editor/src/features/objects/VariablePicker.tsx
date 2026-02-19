import { useEffect, useRef, useState } from "react"
import { Globe, Box, ChevronDown } from "lucide-react"
import {
  formatTargetQualifiedName,
  hasAnyTargetVariables,
  normalizeTargetValue,
  selectTargetVariables
} from "./variable-selection-model.js"

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
  otherObjectVariables?: ObjectVariableOption[]
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
  otherObjectVariables = [],
  onChange,
  showTarget = false,
  target,
  targetInstanceId,
  roomInstances,
  onTargetChange,
  filter,
  allowedScopes,
  variant = "default"
}: VariablePickerProps) {
  const [isOpen, setIsOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const allowOtherTarget = showTarget
  const allowInstanceTarget = Boolean(roomInstances && roomInstances.length > 0)
  const [localTarget, setLocalTarget] = useState<"self" | "other" | "instanceId">(
    normalizeTargetValue(target, allowOtherTarget, allowInstanceTarget)
  )

  // Sync local target state with props
  useEffect(() => {
    setLocalTarget(normalizeTargetValue(target, allowOtherTarget, allowInstanceTarget))
  }, [target, allowOtherTarget, allowInstanceTarget])

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
  const activeObjectVariables = selectTargetVariables({
    selfVariables: objectVariables,
    otherVariables: otherObjectVariables,
    target: localTarget,
    allowOtherTarget
  })
  const filteredObject = filter ? activeObjectVariables.filter(filter) : activeObjectVariables
  const filteredSelfObject = filter ? objectVariables.filter(filter) : objectVariables
  const filteredOtherObject = filter ? otherObjectVariables.filter(filter) : otherObjectVariables
  const hasAnyObjectVariables = showTarget
    ? hasAnyTargetVariables({
        selfVariables: filteredSelfObject,
        otherVariables: filteredOtherObject,
        allowOtherTarget
      })
    : filteredObject.length > 0

  const showGlobal = !allowedScopes || allowedScopes.includes("global")
  const showObject = !allowedScopes || allowedScopes.includes("object")

  const allObjectVars = showTarget ? [...objectVariables, ...otherObjectVariables] : objectVariables
  const displayName = getDisplayName(scope, variableId, globalVariables, allObjectVars)
  const ScopeIcon = scope === "global" ? Globe : Box
  const triggerTarget = normalizeTargetValue(target ?? localTarget, allowOtherTarget, allowInstanceTarget)

  const targetPrefix =
    showTarget && scope === "object"
      ? `${TARGET_LABELS[triggerTarget] ?? triggerTarget}.`
      : ""
  const targetToggleOptions: ("self" | "other" | "instanceId")[] = [
    "self",
    ...(allowOtherTarget ? (["other"] as const) : []),
    ...(allowInstanceTarget ? (["instanceId"] as const) : [])
  ]

  const borderColor = variant === "amber" ? "border-amber-200" : variant === "blue" ? "border-blue-200" : "border-slate-300"
  const hoverBg = variant === "amber" ? "hover:bg-amber-50" : variant === "blue" ? "hover:bg-blue-50" : "hover:bg-slate-50"
  const focusBorder = variant === "amber" ? "focus:border-amber-400" : variant === "blue" ? "focus:border-blue-400" : "focus:border-slate-400"

  return (
    <div className="variable-picker-container relative" ref={containerRef}>
      <button
        type="button"
        className={`variable-picker-trigger flex items-center gap-1.5 h-7 rounded border ${borderColor} bg-white px-2 text-xs ${hoverBg} ${focusBorder} focus:outline-none transition-colors max-w-[180px]`}
        onClick={() => setIsOpen(!isOpen)}
      >
        <ScopeIcon className="h-3 w-3 shrink-0 text-slate-400" />
        <span className="truncate text-slate-700">{targetPrefix}{displayName}</span>
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

          {showObject && hasAnyObjectVariables && (
            <div className="variable-picker-object-section">
              <div className="variable-picker-section-header px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
                <span>Objecte</span>
                {showTarget && (
                  <div className="flex items-center gap-1">
                    {targetToggleOptions.map((t) => (
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
                          onTargetChange?.(t, t === "instanceId" ? (roomInstances?.[0]?.id ?? null) : null)
                        }}
                      >
                        {TARGET_LABELS[t]}
                      </button>
                    ))}
                  </div>
                )}
              </div>
              {showTarget && localTarget === "instanceId" && (
                <div className="px-3 py-1.5 border-b border-slate-100">
                  <select
                    className="h-6 w-full rounded border border-slate-200 bg-white px-2 text-[10px] text-slate-600"
                    value={targetInstanceId ?? roomInstances?.[0]?.id ?? ""}
                    onChange={(event) => onTargetChange?.("instanceId", event.target.value || null)}
                  >
                    {(roomInstances ?? []).map((instance) => (
                      <option key={instance.id} value={instance.id}>
                        {instance.id}
                      </option>
                    ))}
                  </select>
                </div>
              )}
              {filteredObject.length === 0 ? (
                <div className="px-3 py-1.5 text-xs text-slate-400">&mdash;</div>
              ) : filteredObject.map((variable) => (
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
                  <span className="flex-1 truncate">
                    {showTarget ? formatTargetQualifiedName(localTarget, variable.label) : variable.label}
                  </span>
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
