import { useEffect, useRef, useState } from "react"
import { Globe, Box, ChevronDown } from "lucide-react"
import type { ProjectV1 } from "@creadordejocs/project-format"

type CollectionVariablePickerProps = {
  scope: "global" | "object"
  variableId: string
  collectionType: "list" | "map"
  globalVariables: ProjectV1["variables"]["global"]
  objectVariables: ProjectV1["variables"]["global"]
  onChange: (scope: "global" | "object", variableId: string) => void
  variant?: "default" | "purple" | undefined
}

export function CollectionVariablePicker({
  scope,
  variableId,
  collectionType,
  globalVariables,
  objectVariables,
  onChange,
  variant = "default"
}: CollectionVariablePickerProps) {
  const [isOpen, setIsOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

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

  const filteredGlobal = globalVariables.filter((v) => v.type === collectionType)
  const filteredObject = objectVariables.filter((v) => v.type === collectionType)

  const displayName = (() => {
    if (scope === "global") {
      return filteredGlobal.find((v) => v.id === variableId)?.name ?? "?"
    }
    return filteredObject.find((v) => v.id === variableId)?.name ?? "?"
  })()

  const ScopeIcon = scope === "global" ? Globe : Box

  const borderColor = variant === "purple" ? "border-purple-300" : "border-slate-300"
  const hoverBg = variant === "purple" ? "hover:bg-purple-50" : "hover:bg-slate-50"
  const focusBorder = variant === "purple" ? "focus:border-purple-400" : "focus:border-slate-400"
  const activeHighlight = variant === "purple" ? "bg-purple-50 font-medium" : "bg-blue-50 font-medium"
  const rowHover = variant === "purple" ? "hover:bg-purple-50" : "hover:bg-blue-50"

  const itemTypeBadge = collectionType === "list" ? "list" : "map"

  return (
    <div className="collection-variable-picker-container relative" ref={containerRef}>
      <button
        type="button"
        className={`collection-variable-picker-trigger flex items-center gap-1.5 h-7 rounded border ${borderColor} bg-white px-2 text-xs ${hoverBg} ${focusBorder} focus:outline-none transition-colors max-w-[180px]`}
        onClick={() => setIsOpen(!isOpen)}
      >
        <ScopeIcon className="h-3 w-3 shrink-0 text-slate-400" />
        <span className="truncate text-slate-700">{displayName}</span>
        <ChevronDown className="h-3 w-3 shrink-0 text-slate-300" />
      </button>

      {isOpen && (
        <div className="collection-variable-picker-popover absolute top-full left-0 z-50 mt-1 min-w-[220px] max-h-[280px] overflow-y-auto rounded-lg border border-slate-200 bg-white shadow-lg">
          {filteredGlobal.length > 0 && (
            <div className="collection-variable-picker-global-section">
              <div className="collection-variable-picker-section-header px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400 bg-slate-50 border-b border-slate-100">
                Global
              </div>
              {filteredGlobal.map((variable) => (
                <button
                  key={variable.id}
                  type="button"
                  className={`collection-variable-picker-global-row flex items-center gap-2 w-full px-3 py-1.5 text-xs text-left ${rowHover} transition-colors ${
                    scope === "global" && variableId === variable.id ? activeHighlight : ""
                  }`}
                  onClick={() => {
                    onChange("global", variable.id)
                    setIsOpen(false)
                  }}
                >
                  <Globe className="h-3 w-3 text-slate-400 shrink-0" />
                  <span className="flex-1 truncate">{variable.name}</span>
                  <span className="collection-variable-picker-type-badge text-[9px] px-1 py-0.5 rounded bg-slate-100 text-slate-400 shrink-0">
                    {itemTypeBadge}
                  </span>
                </button>
              ))}
            </div>
          )}

          {filteredObject.length > 0 && (
            <div className="collection-variable-picker-object-section">
              <div className="collection-variable-picker-section-header px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400 bg-slate-50 border-b border-slate-100">
                Objecte
              </div>
              {filteredObject.map((variable) => (
                <button
                  key={variable.id}
                  type="button"
                  className={`collection-variable-picker-object-row flex items-center gap-2 w-full px-3 py-1.5 text-xs text-left ${rowHover} transition-colors ${
                    scope === "object" && variableId === variable.id ? activeHighlight : ""
                  }`}
                  onClick={() => {
                    onChange("object", variable.id)
                    setIsOpen(false)
                  }}
                >
                  <Box className="h-3 w-3 text-slate-400 shrink-0" />
                  <span className="flex-1 truncate">{variable.name}</span>
                  <span className="collection-variable-picker-type-badge text-[9px] px-1 py-0.5 rounded bg-slate-100 text-slate-400 shrink-0">
                    {itemTypeBadge}
                  </span>
                </button>
              ))}
            </div>
          )}

          {filteredGlobal.length === 0 && filteredObject.length === 0 && (
            <div className="collection-variable-picker-empty px-3 py-3 text-xs text-slate-400 text-center">
              Cap variable {collectionType} disponible
            </div>
          )}
        </div>
      )}
    </div>
  )
}
