import { useEffect, useRef, useState } from "react"
import { Globe, Box, ChevronDown, Hash, Dices, Crosshair } from "lucide-react"
import type { ValueExpression, VariableValue } from "@creadordejocs/project-format"
import type { VariableOption, ObjectVariableOption } from "./VariablePicker.js"

type LegacyVariableReference = { scope: "global" | "object"; variableId: string }
type ValueSourceTarget = "self" | "other"
type ValueAttribute = "x" | "y" | "rotation"

function isLegacyVariableReference(value: ValueExpression): value is LegacyVariableReference {
  return typeof value === "object" && value !== null && "scope" in value && "variableId" in value
}

function isSourceValue(
  value: ValueExpression
): value is Exclude<ValueExpression, VariableValue | LegacyVariableReference> {
  return typeof value === "object" && value !== null && "source" in value
}

type RightValuePickerProps = {
  value: ValueExpression
  expectedType: "number" | "string" | "boolean"
  globalVariables: VariableOption[]
  internalVariables: ObjectVariableOption[]
  allowOtherTarget?: boolean
  onChange: (nextValue: ValueExpression) => void
  variant?: "default" | "blue" | undefined
}

function getVariableDisplayName(
  ref: LegacyVariableReference,
  globalVariables: VariableOption[],
  internalVariables: ObjectVariableOption[]
): string {
  if (ref.scope === "global") {
    return globalVariables.find((v) => v.id === ref.variableId)?.name ?? "?"
  }
  return internalVariables.find((v) => v.id === ref.variableId)?.label ?? "?"
}

export function RightValuePicker({
  value,
  expectedType,
  globalVariables,
  internalVariables,
  allowOtherTarget = false,
  onChange,
  variant = "blue"
}: RightValuePickerProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [localTarget, setLocalTarget] = useState<ValueSourceTarget>("self")
  const [localLiteral, setLocalLiteral] = useState("0")
  const [randomMin, setRandomMin] = useState("0")
  const [randomMax, setRandomMax] = useState("10")
  const [randomStep, setRandomStep] = useState("1")
  const [alignRight, setAlignRight] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const randomMinInputRef = useRef<HTMLInputElement>(null)
  const popoverRef = useRef<HTMLDivElement>(null)

  // Detect overflow and align popover to the right when it would clip
  useEffect(() => {
    if (!isOpen || !popoverRef.current) return
    const rect = popoverRef.current.getBoundingClientRect()
    setAlignRight(rect.right > window.innerWidth - 8)
  }, [isOpen])

  // Sync local literal state with external value
  useEffect(() => {
    if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
      setLocalLiteral(String(value))
      return
    }
    if (isLegacyVariableReference(value)) {
      return
    }
    if (value.source === "literal") {
      setLocalLiteral(String(value.value))
      return
    }
    if (value.source === "random") {
      setRandomMin(String(value.min))
      setRandomMax(String(value.max))
      setRandomStep(String(value.step))
      return
    }
    if (value.source === "attribute" || value.source === "internalVariable") {
      setLocalTarget(value.target)
    }
  }, [value])

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
    if (isOpen && inputRef.current) {
      inputRef.current.focus()
      inputRef.current.select()
    }
  }, [isOpen])

  const filteredGlobal = globalVariables.filter((v) => v.type === expectedType)
  const filteredInternal = internalVariables.filter((v) => v.type === expectedType)
  const hasVariables = filteredGlobal.length > 0 || filteredInternal.length > 0

  const borderColor = variant === "blue" ? "border-blue-200" : "border-slate-300"
  const hoverBg = variant === "blue" ? "hover:bg-blue-50" : "hover:bg-slate-50"

  // Display text for the trigger button
  const displayText = (() => {
    if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
      return String(value)
    }
    if (isLegacyVariableReference(value)) {
      return getVariableDisplayName(value, globalVariables, internalVariables)
    }
    if (value.source === "literal") {
      return String(value.value)
    }
    if (value.source === "random") {
      return `random(${value.min}, ${value.max}, ${value.step})`
    }
    if (value.source === "attribute") {
      return `${value.target}.${value.attribute}`
    }
    if (value.source === "internalVariable") {
      const label = internalVariables.find((item) => item.id === value.variableId)?.label ?? "?"
      return `${value.target}.${label}`
    }
    return globalVariables.find((item) => item.id === value.variableId)?.name ?? "?"
  })()

  const ScopeIcon =
    typeof value === "string" || typeof value === "number" || typeof value === "boolean"
      ? Hash
      : isLegacyVariableReference(value)
      ? value.scope === "global"
        ? Globe
        : Box
      : value.source === "random"
      ? Dices
      : value.source === "attribute"
      ? Crosshair
      : value.source === "globalVariable"
      ? Globe
      : value.source === "internalVariable"
      ? Box
      : Hash

  function commitLiteral(raw: string) {
    if (expectedType === "number") {
      const parsed = Number(raw)
      onChange({ source: "literal", value: Number.isFinite(parsed) ? parsed : 0 })
    } else if (expectedType === "boolean") {
      onChange({ source: "literal", value: raw === "true" })
    } else {
      onChange({ source: "literal", value: raw })
    }
  }

  function commitRandom() {
    const parsedMin = Number(randomMin)
    const parsedMax = Number(randomMax)
    const parsedStep = Number(randomStep)
    if (!Number.isFinite(parsedMin) || !Number.isFinite(parsedMax) || !Number.isFinite(parsedStep) || parsedStep <= 0) {
      return
    }
    onChange({
      source: "random",
      min: parsedMin,
      max: parsedMax,
      step: parsedStep
    })
    setIsOpen(false)
  }

  const targetOptions: ValueSourceTarget[] = allowOtherTarget ? ["self", "other"] : ["self"]

  return (
    <div className="right-value-picker-container relative" ref={containerRef}>
      <button
        type="button"
        className={`right-value-picker-trigger flex items-center gap-1.5 h-7 rounded border ${borderColor} bg-white px-2 text-xs ${hoverBg} focus:outline-none transition-colors max-w-[160px]`}
        onClick={() => setIsOpen(!isOpen)}
      >
        <ScopeIcon className="h-3 w-3 shrink-0 text-slate-400" />
        <span className="truncate text-slate-700">{displayText}</span>
        <ChevronDown className="h-3 w-3 shrink-0 text-slate-300" />
      </button>

      {isOpen && (
        <div
          ref={popoverRef}
          className={`right-value-picker-popover absolute top-full z-50 mt-1 min-w-[220px] max-h-[300px] overflow-y-auto rounded-lg border border-slate-200 bg-white shadow-lg ${alignRight ? "right-0" : "left-0"}`}
        >
          <div className="right-value-picker-literal-section">
            <div className="right-value-picker-section-header px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400 bg-slate-50 border-b border-slate-100">
              Valor
            </div>
            <div className="right-value-picker-literal-row px-3 py-2">
              {expectedType === "boolean" ? (
                <div className="flex gap-1">
                  {(["true", "false"] as const).map((boolValue) => (
                    <button
                      key={boolValue}
                      type="button"
                      className={`right-value-picker-bool-btn flex-1 px-2 py-1 rounded text-xs transition-colors ${
                        ((typeof value === "boolean" && String(value) === boolValue) ||
                          (isSourceValue(value) && value.source === "literal" && String(value.value) === boolValue))
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
                    inputMode={expectedType === "number" ? "numeric" : "text"}
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

          {expectedType === "number" && (
            <div className="right-value-picker-random-section">
              <div className="right-value-picker-section-header px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400 bg-slate-50 border-b border-slate-100 border-t">
                Random
              </div>
              <div className="right-value-picker-random-row px-3 py-2">
                <form
                  className="flex items-center gap-1"
                  onSubmit={(event) => {
                    event.preventDefault()
                    commitRandom()
                  }}
                >
                  <input
                    ref={randomMinInputRef}
                    className="right-value-picker-random-input-min h-7 w-16 rounded border border-slate-200 bg-white px-2 text-xs focus:border-blue-400 focus:outline-none"
                    type="text"
                    inputMode="numeric"
                    value={randomMin}
                    onChange={(event) => setRandomMin(event.target.value)}
                    placeholder="min"
                  />
                  <input
                    className="right-value-picker-random-input-max h-7 w-16 rounded border border-slate-200 bg-white px-2 text-xs focus:border-blue-400 focus:outline-none"
                    type="text"
                    inputMode="numeric"
                    value={randomMax}
                    onChange={(event) => setRandomMax(event.target.value)}
                    placeholder="max"
                  />
                  <input
                    className="right-value-picker-random-input-step h-7 w-14 rounded border border-slate-200 bg-white px-2 text-xs focus:border-blue-400 focus:outline-none"
                    type="text"
                    inputMode="numeric"
                    value={randomStep}
                    onChange={(event) => setRandomStep(event.target.value)}
                    placeholder="step"
                  />
                  <button
                    type="submit"
                    className="right-value-picker-random-confirm h-7 px-2 rounded bg-blue-500 text-white text-xs hover:bg-blue-600 transition-colors shrink-0"
                  >
                    OK
                  </button>
                </form>
              </div>
            </div>
          )}

          {expectedType === "number" && (
            <div className="right-value-picker-attributes-section">
              <div className="right-value-picker-section-header px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400 bg-slate-50 border-b border-slate-100 border-t flex items-center justify-between">
                <span>Attributes</span>
                <div className="flex items-center gap-1">
                  {targetOptions.map((targetOption) => (
                    <button
                      key={`attribute-${targetOption}`}
                      type="button"
                      className={`right-value-picker-target-btn px-1.5 py-0.5 rounded text-[9px] transition-colors ${
                        localTarget === targetOption ? "bg-slate-700 text-white" : "bg-slate-200 text-slate-500 hover:bg-slate-300"
                      }`}
                      onClick={() => setLocalTarget(targetOption)}
                    >
                      {targetOption}
                    </button>
                  ))}
                </div>
              </div>
              {(["x", "y", "rotation"] as const).map((attribute) => (
                <button
                  key={`attribute-row-${attribute}`}
                  type="button"
                  className="right-value-picker-attribute-row flex items-center gap-2 w-full px-3 py-1.5 text-xs text-left hover:bg-blue-50 transition-colors"
                  onClick={() => {
                    onChange({ source: "attribute", target: localTarget, attribute: attribute as ValueAttribute })
                    setIsOpen(false)
                  }}
                >
                  <Crosshair className="h-3 w-3 text-slate-400 shrink-0" />
                  <span className="flex-1 truncate">
                    {localTarget}.{attribute}
                  </span>
                </button>
              ))}
            </div>
          )}

          {filteredInternal.length > 0 && (
            <div className="right-value-picker-internal-section">
              <div className="right-value-picker-section-header px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400 bg-slate-50 border-b border-slate-100 border-t flex items-center justify-between">
                <span>Internal variables</span>
                <div className="flex items-center gap-1">
                  {targetOptions.map((targetOption) => (
                    <button
                      key={`internal-${targetOption}`}
                      type="button"
                      className={`right-value-picker-target-btn px-1.5 py-0.5 rounded text-[9px] transition-colors ${
                        localTarget === targetOption ? "bg-slate-700 text-white" : "bg-slate-200 text-slate-500 hover:bg-slate-300"
                      }`}
                      onClick={() => setLocalTarget(targetOption)}
                    >
                      {targetOption}
                    </button>
                  ))}
                </div>
              </div>
              {filteredInternal.map((variable) => (
                <button
                  key={`${variable.objectName}-${variable.id}`}
                  type="button"
                  className="right-value-picker-internal-row flex items-center gap-2 w-full px-3 py-1.5 text-xs text-left hover:bg-blue-50 transition-colors"
                  onClick={() => {
                    onChange({ source: "internalVariable", target: localTarget, variableId: variable.id })
                    setIsOpen(false)
                  }}
                >
                  <Box className="h-3 w-3 text-slate-400 shrink-0" />
                  <span className="flex-1 truncate">
                    {localTarget}.{variable.label}
                  </span>
                </button>
              ))}
            </div>
          )}

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
                      className="right-value-picker-global-row flex items-center gap-2 w-full px-3 py-1.5 text-xs text-left hover:bg-blue-50 transition-colors"
                      onClick={() => {
                        onChange({ source: "globalVariable", variableId: variable.id })
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
            </>
          )}
        </div>
      )}
    </div>
  )
}
