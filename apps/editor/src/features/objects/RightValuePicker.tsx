import { useEffect, useRef, useState } from "react"
import { Globe, Box, ChevronDown, Hash } from "lucide-react"
import type { VariableOption, ObjectVariableOption } from "./VariablePicker.js"

type LiteralValue = string | number | boolean
type VariableReference = { scope: "global" | "object"; variableId: string }
type RightValue = LiteralValue | VariableReference

function isVariableReference(value: RightValue): value is VariableReference {
  return typeof value === "object" && value !== null && "scope" in value && "variableId" in value
}

type RightValuePickerProps = {
  value: RightValue
  leftVariableType: string
  globalVariables: VariableOption[]
  objectVariables: ObjectVariableOption[]
  onChange: (nextValue: RightValue) => void
  variant?: "default" | "blue" | undefined
}

function getVariableDisplayName(
  ref: VariableReference,
  globalVariables: VariableOption[],
  objectVariables: ObjectVariableOption[]
): string {
  if (ref.scope === "global") {
    return globalVariables.find((v) => v.id === ref.variableId)?.name ?? "?"
  }
  return objectVariables.find((v) => v.id === ref.variableId)?.label ?? "?"
}

export function RightValuePicker({
  value,
  leftVariableType,
  globalVariables,
  objectVariables,
  onChange,
  variant = "blue"
}: RightValuePickerProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [localLiteral, setLocalLiteral] = useState(() =>
    isVariableReference(value) ? "" : String(value)
  )
  const containerRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const isVarRef = isVariableReference(value)

  // Sync local literal state with external value
  useEffect(() => {
    if (!isVarRef) {
      setLocalLiteral(String(value))
    }
  }, [value, isVarRef])

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

  // Focus input when opening in literal mode
  useEffect(() => {
    if (isOpen && !isVarRef && inputRef.current) {
      inputRef.current.focus()
      inputRef.current.select()
    }
  }, [isOpen, isVarRef])

  const filteredGlobal = globalVariables.filter((v) => v.type === leftVariableType)
  const filteredObject = objectVariables.filter((v) => v.type === leftVariableType)
  const hasVariables = filteredGlobal.length > 0 || filteredObject.length > 0

  const borderColor = variant === "blue" ? "border-blue-200" : "border-slate-300"
  const hoverBg = variant === "blue" ? "hover:bg-blue-50" : "hover:bg-slate-50"

  // Display text for the trigger button
  const displayText = isVarRef
    ? getVariableDisplayName(value, globalVariables, objectVariables)
    : String(value)

  const ScopeIcon = isVarRef
    ? value.scope === "global"
      ? Globe
      : Box
    : Hash

  function commitLiteral(raw: string) {
    if (leftVariableType === "number") {
      const parsed = Number(raw)
      onChange(Number.isFinite(parsed) ? parsed : 0)
    } else if (leftVariableType === "boolean") {
      onChange(raw === "true")
    } else {
      onChange(raw)
    }
  }

  return (
    <div className="right-value-picker-container relative" ref={containerRef}>
      <button
        type="button"
        className={`right-value-picker-trigger flex items-center gap-1 h-6 rounded border ${borderColor} bg-white px-1.5 text-xs ${hoverBg} focus:outline-none transition-colors max-w-[140px]`}
        onClick={() => setIsOpen(!isOpen)}
      >
        <ScopeIcon className="h-3 w-3 shrink-0 text-slate-400" />
        <span className="truncate text-slate-700">{displayText}</span>
        <ChevronDown className="h-3 w-3 shrink-0 text-slate-300" />
      </button>

      {isOpen && (
        <div className="right-value-picker-popover absolute top-full left-0 z-50 mt-1 min-w-[220px] max-h-[300px] overflow-y-auto rounded-lg border border-slate-200 bg-white shadow-lg">
          {/* Literal value section */}
          <div className="right-value-picker-literal-section">
            <div className="right-value-picker-section-header px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400 bg-slate-50 border-b border-slate-100">
              Valor
            </div>
            <div className="right-value-picker-literal-row px-3 py-2">
              {leftVariableType === "boolean" ? (
                <div className="flex gap-1">
                  {(["true", "false"] as const).map((boolValue) => (
                    <button
                      key={boolValue}
                      type="button"
                      className={`right-value-picker-bool-btn flex-1 px-2 py-1 rounded text-xs transition-colors ${
                        !isVarRef && String(value) === boolValue
                          ? "bg-blue-100 text-blue-700 font-medium"
                          : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                      }`}
                      onClick={() => {
                        onChange(boolValue === "true")
                        setIsOpen(false)
                      }}
                    >
                      {boolValue}
                    </button>
                  ))}
                </div>
              ) : (
                <form
                  className="flex gap-1"
                  onSubmit={(event) => {
                    event.preventDefault()
                    commitLiteral(localLiteral)
                    setIsOpen(false)
                  }}
                >
                  <input
                    ref={inputRef}
                    className="right-value-picker-literal-input h-7 flex-1 rounded border border-slate-200 bg-white px-2 text-xs focus:border-blue-400 focus:outline-none"
                    type="text"
                    inputMode={leftVariableType === "number" ? "numeric" : "text"}
                    value={localLiteral}
                    onChange={(event) => setLocalLiteral(event.target.value)}
                    onBlur={() => {
                      commitLiteral(localLiteral)
                    }}
                  />
                  <button
                    type="submit"
                    className="right-value-picker-literal-confirm h-7 px-2 rounded bg-blue-500 text-white text-xs hover:bg-blue-600 transition-colors shrink-0"
                  >
                    OK
                  </button>
                </form>
              )}
            </div>
          </div>

          {/* Variables section */}
          {hasVariables && (
            <>
              {filteredGlobal.length > 0 && (
                <div className="right-value-picker-global-section">
                  <div className="right-value-picker-section-header px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400 bg-slate-50 border-b border-slate-100 border-t">
                    Global
                  </div>
                  {filteredGlobal.map((variable) => (
                    <button
                      key={variable.id}
                      type="button"
                      className={`right-value-picker-global-row flex items-center gap-2 w-full px-3 py-1.5 text-xs text-left hover:bg-blue-50 transition-colors ${
                        isVarRef && value.scope === "global" && value.variableId === variable.id
                          ? "bg-blue-50 font-medium"
                          : ""
                      }`}
                      onClick={() => {
                        onChange({ scope: "global", variableId: variable.id })
                        setIsOpen(false)
                      }}
                    >
                      <Globe className="h-3 w-3 text-slate-400 shrink-0" />
                      <span className="flex-1 truncate">{variable.name}</span>
                      <span className="right-value-picker-type-badge text-[9px] px-1 py-0.5 rounded bg-slate-100 text-slate-400 shrink-0">
                        {variable.type === "number" ? "num" : variable.type === "boolean" ? "bool" : "str"}
                      </span>
                    </button>
                  ))}
                </div>
              )}

              {filteredObject.length > 0 && (
                <div className="right-value-picker-object-section">
                  <div className="right-value-picker-section-header px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400 bg-slate-50 border-b border-slate-100 border-t">
                    Objecte
                  </div>
                  {filteredObject.map((variable) => (
                    <button
                      key={`${variable.objectName}-${variable.id}`}
                      type="button"
                      className={`right-value-picker-object-row flex items-center gap-2 w-full px-3 py-1.5 text-xs text-left hover:bg-blue-50 transition-colors ${
                        isVarRef && value.scope === "object" && value.variableId === variable.id
                          ? "bg-blue-50 font-medium"
                          : ""
                      }`}
                      onClick={() => {
                        onChange({ scope: "object", variableId: variable.id })
                        setIsOpen(false)
                      }}
                    >
                      <Box className="h-3 w-3 text-slate-400 shrink-0" />
                      <span className="flex-1 truncate">{variable.label}</span>
                      <span className="right-value-picker-type-badge text-[9px] px-1 py-0.5 rounded bg-slate-100 text-slate-400 shrink-0">
                        {variable.type === "number" ? "num" : variable.type === "boolean" ? "bool" : "str"}
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  )
}
