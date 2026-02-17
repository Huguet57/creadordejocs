import { Plus, X, Variable } from "lucide-react"
import { useCallback, useMemo, useState, type KeyboardEvent } from "react"
import type { VariableItemType, VariableType, VariableValue } from "@creadordejocs/project-format"
import { Button } from "../../components/ui/button.js"
import { ObjectCard } from "./ObjectCard.js"

type ObjectVariablesPanelProps = {
  objectId: string
  objectName: string
  spriteSrc: string | null
  width: number
  height: number
  visible: boolean
  solid: boolean
  variables: {
    id: string
    name: string
    type: VariableType
    itemType?: VariableItemType
    initialValue: VariableValue
  }[]
  onAddVariable: (
    objectId: string,
    name: string,
    type: VariableType,
    initialValue: VariableValue,
    itemType?: VariableItemType
  ) => void
  onUpdateVariable: (objectId: string, variableId: string, name: string, initialValue: VariableValue) => void
  onRemoveVariable: (objectId: string, variableId: string) => void
  onUpdateObjectNumber: (key: "width" | "height", value: number) => void
  onUpdateObjectFlag: (key: "visible" | "solid", value: boolean) => void
  onSpriteClick: () => void
}

const TYPE_STYLES: Record<VariableType, { badge: string; border: string }> = {
  number: { badge: "bg-blue-100 text-blue-700", border: "border-l-blue-400" },
  string: { badge: "bg-emerald-100 text-emerald-700", border: "border-l-emerald-400" },
  boolean: { badge: "bg-amber-100 text-amber-700", border: "border-l-amber-400" },
  list: { badge: "bg-violet-100 text-violet-700", border: "border-l-violet-400" },
  map: { badge: "bg-rose-100 text-rose-700", border: "border-l-rose-400" }
}

function typeBadgeLabel(type: VariableType, itemType?: VariableItemType): string {
  if ((type === "list" || type === "map") && itemType) {
    return `${type}<${itemType}>`
  }
  return type
}

function parseInitialValue(type: VariableType, rawValue: string, itemType: VariableItemType = "number"): VariableValue {
  if (type === "number") {
    const parsed = Number(rawValue)
    return Number.isFinite(parsed) ? parsed : 0
  }
  if (type === "boolean") {
    return rawValue === "true"
  }
  if (type === "list") {
    try {
      const parsed: unknown = JSON.parse(rawValue)
      if (!Array.isArray(parsed)) {
        return []
      }
      return parsed.filter((entry): entry is string | number | boolean => typeof entry === itemType)
    } catch {
      return []
    }
  }
  if (type === "map") {
    try {
      const parsed: unknown = JSON.parse(rawValue)
      if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
        return {}
      }
      return Object.fromEntries(
        Object.entries(parsed as Record<string, unknown>).filter(([, value]) => typeof value === itemType)
      ) as Record<string, string | number | boolean>
    } catch {
      return {}
    }
  }
  return rawValue
}

function formatInputValue(type: VariableType, value: VariableValue): string {
  if (typeof value === "number" || typeof value === "string") {
    return String(value)
  }
  if (type === "boolean") {
    return value ? "true" : "false"
  }
  if (type === "list" || type === "map") {
    return JSON.stringify(value)
  }
  return ""
}

export function ObjectVariablesPanel({
  objectId,
  objectName,
  spriteSrc,
  width,
  height,
  visible,
  solid,
  variables,
  onAddVariable,
  onUpdateVariable,
  onRemoveVariable,
  onUpdateObjectNumber,
  onUpdateObjectFlag,
  onSpriteClick
}: ObjectVariablesPanelProps) {
  const [isAdding, setIsAdding] = useState(false)
  const [newVariableName, setNewVariableName] = useState("")
  const [newVariableType, setNewVariableType] = useState<VariableType>("number")
  const [newVariableItemType, setNewVariableItemType] = useState<VariableItemType>("number")
  const [newVariableRawValue, setNewVariableRawValue] = useState("0")

  const variableNames = useMemo(
    () => new Set(variables.map((definition) => definition.name.trim().toLocaleLowerCase())),
    [variables]
  )

  const inputCallbackRef = useCallback((node: HTMLInputElement | null) => {
    if (node) node.select()
  }, [])

  const blockUndoShortcuts = (event: KeyboardEvent<HTMLInputElement>): void => {
    if ((event.metaKey || event.ctrlKey) && (event.key.toLowerCase() === "z" || event.key.toLowerCase() === "y")) {
      event.preventDefault()
    }
  }

  const canAdd = newVariableName.trim() && !variableNames.has(newVariableName.trim().toLocaleLowerCase())

  const handleAdd = () => {
    if (!canAdd) return
    onAddVariable(
      objectId,
      newVariableName,
      newVariableType,
      parseInitialValue(newVariableType, newVariableRawValue, newVariableItemType),
      newVariableType === "list" || newVariableType === "map" ? newVariableItemType : undefined
    )
    setNewVariableName("")
    setNewVariableType("number")
    setNewVariableItemType("number")
    setNewVariableRawValue("0")
    setIsAdding(false)
  }

  return (
    <aside className="mvpv1-object-vars-panel flex w-[220px] flex-col border-r border-slate-200 bg-slate-50">
      <ObjectCard
        objectName={objectName}
        spriteSrc={spriteSrc}
        visible={visible}
        solid={solid}
        onToggleVisible={(nextValue) => onUpdateObjectFlag("visible", nextValue)}
        onToggleSolid={(nextValue) => onUpdateObjectFlag("solid", nextValue)}
        onSpriteClick={onSpriteClick}
      />

      <div className="mvpv2-object-attrs-header flex items-center justify-between border-b border-slate-200 p-3">
        <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Attributes</span>
      </div>
      <div className="mvpv2-object-attrs-grid border-b border-slate-200 bg-white p-2">
        <div className="grid grid-cols-2 gap-1.5">
          {([
            { key: "width", label: "width", value: width, min: 1 },
            { key: "height", label: "height", value: height, min: 1 }
          ] as const).map((attributeEntry) => (
            <label
              key={attributeEntry.key}
              className="mvpv2-object-attr-field flex items-center gap-1 rounded border border-slate-200 bg-slate-50 px-1.5 py-1"
            >
              <span className="mvpv2-object-attr-label w-12 text-[10px] text-slate-500">{attributeEntry.label}</span>
              <input
                className="mvpv2-object-attr-input h-6 w-full appearance-none rounded border border-slate-300 bg-white px-1.5 text-[11px] text-slate-700 [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none [-moz-appearance:textfield] focus:outline-none"
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                value={attributeEntry.value}
                onWheel={(event) => event.currentTarget.blur()}
                onChange={(event) => {
                  const raw = event.target.value.replace(/[^0-9]/g, "")
                  const parsed = raw === "" ? 1 : Math.max(1, Number(raw))
                  onUpdateObjectNumber(attributeEntry.key, parsed)
                }}
              />
            </label>
          ))}
        </div>
      </div>

      <div className="mvpv2-vars-header flex items-center justify-between border-b border-slate-200 px-3 py-2">
        <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Variables</span>
        {isAdding ? (
          <button
            type="button"
            className="mvpv2-vars-header-close inline-flex h-5 w-5 items-center justify-center rounded text-slate-400 transition-colors hover:bg-slate-200 hover:text-slate-700"
            onClick={() => setIsAdding(false)}
            title="Cancel"
            aria-label="Cancel add variable"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        ) : (
          <button
            type="button"
            className="mvpv2-vars-header-add inline-flex h-5 w-5 items-center justify-center rounded text-slate-400 transition-colors hover:bg-slate-200 hover:text-slate-700"
            onClick={() => setIsAdding(true)}
            title="Add variable"
            aria-label="Add variable"
          >
            <Plus className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      {isAdding ? (
        <div className="mvpv2-vars-add-panel flex flex-1 flex-col overflow-hidden bg-slate-50/50">
          <div className="mvpv2-vars-add-panel-body flex-1 space-y-3 overflow-y-auto p-3">
            <div>
              <label className="mvpv2-vars-add-field-label mb-1.5 block text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                Name
              </label>
              <input
                ref={inputCallbackRef}
                value={newVariableName}
                onChange={(event) => setNewVariableName(event.target.value)}
                onKeyDown={(event: KeyboardEvent<HTMLInputElement>) => {
                  blockUndoShortcuts(event)
                  if (event.key === "Enter") handleAdd()
                  if (event.key === "Escape") setIsAdding(false)
                }}
                className="mvpv2-vars-add-field-name flex h-8 w-full rounded-md border border-slate-300 bg-white px-3 text-xs shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400"
                placeholder="e.g. health, speed, score"
              />
            </div>

            <div>
              <label className="mvpv2-vars-add-field-label mb-1.5 block text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                Type
              </label>
              <div className="grid grid-cols-2 gap-1.5">
                {(["number", "string", "boolean", "list", "map"] as const).map((typeOption) => {
                  const style = TYPE_STYLES[typeOption]
                  const isSelected = newVariableType === typeOption
                  return (
                    <button
                      key={typeOption}
                      type="button"
                      className={`mvpv2-vars-add-type-btn flex items-center justify-center gap-1.5 rounded-lg border px-2 py-2.5 text-xs font-medium transition-colors ${
                        isSelected
                          ? `border-slate-400 ${style.badge} ring-1 ring-slate-300`
                          : "border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50"
                      }`}
                      onClick={() => {
                        setNewVariableType(typeOption)
                        setNewVariableRawValue(
                          typeOption === "boolean"
                            ? "false"
                            : typeOption === "number"
                              ? "0"
                              : typeOption === "list"
                                ? "[]"
                                : typeOption === "map"
                                  ? "{}"
                                  : ""
                        )
                      }}
                    >
                      {typeOption}
                    </button>
                  )
                })}
              </div>
              {(newVariableType === "list" || newVariableType === "map") && (
                <div className="mt-2">
                  <label className="mvpv2-vars-add-subtype-label mb-1 block text-[10px] font-medium text-slate-500">
                    Item type
                  </label>
                  <select
                    className="mvpv2-vars-add-field-itemtype h-8 w-full rounded border border-slate-300 bg-white px-2 text-xs text-slate-900 transition-colors focus:outline-none focus:ring-2 focus:ring-slate-400"
                    value={newVariableItemType}
                    onChange={(event) => setNewVariableItemType(event.target.value as VariableItemType)}
                  >
                    <option value="number">number</option>
                    <option value="string">string</option>
                    <option value="boolean">boolean</option>
                  </select>
                </div>
              )}
            </div>

            <div>
              <label className="mvpv2-vars-add-field-label mb-1.5 block text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                Initial value
              </label>
              {newVariableType === "boolean" ? (
                <select
                  className="mvpv2-vars-add-field-value-bool h-8 w-full rounded border border-slate-300 bg-white px-2 text-xs text-slate-900 transition-colors focus:outline-none focus:ring-2 focus:ring-slate-400"
                  value={newVariableRawValue}
                  onChange={(event) => setNewVariableRawValue(event.target.value)}
                >
                  <option value="true">true</option>
                  <option value="false">false</option>
                </select>
              ) : newVariableType === "list" || newVariableType === "map" ? (
                <textarea
                  className="mvpv2-vars-add-field-value-collection min-h-[4rem] w-full rounded border border-slate-300 bg-white px-3 py-2 font-mono text-xs text-slate-900 transition-colors focus:outline-none focus:ring-2 focus:ring-slate-400"
                  value={newVariableRawValue}
                  onChange={(event) => setNewVariableRawValue(event.target.value)}
                  placeholder={newVariableType === "list" ? "[1, 2, 3]" : '{"hp": 10}'}
                />
              ) : (
                <input
                  className="mvpv2-vars-add-field-value-input h-8 w-full rounded border border-slate-300 bg-white px-3 text-xs text-slate-900 transition-colors focus:outline-none focus:ring-2 focus:ring-slate-400"
                  type={newVariableType === "number" ? "number" : "text"}
                  value={newVariableRawValue}
                  onChange={(event) => setNewVariableRawValue(event.target.value)}
                  placeholder="Value"
                />
              )}
            </div>
          </div>

          <div className="mvpv2-vars-add-panel-footer border-t border-slate-200 bg-white p-3">
            <Button
              size="sm"
              className="mvpv2-vars-add-panel-submit h-8 w-full text-xs"
              onClick={handleAdd}
              disabled={!canAdd}
            >
              <Plus className="mr-1.5 h-3.5 w-3.5" />
              Add
            </Button>
          </div>
        </div>
      ) : (
        <div className="mvpv2-vars-list flex-1 overflow-y-auto p-2">
          <div className="flex flex-col gap-1.5">
            {variables.length === 0 && (
              <button
                type="button"
                className="mvpv2-vars-empty flex flex-col items-center gap-1.5 rounded-md border border-dashed border-slate-300 px-3 py-5 text-center transition-colors hover:border-slate-400 hover:bg-white"
                onClick={() => setIsAdding(true)}
              >
                <Variable className="h-5 w-5 text-slate-300" />
                <span className="text-[11px] text-slate-400">No variables yet</span>
                <span className="text-[10px] text-slate-400">Click to add one</span>
              </button>
            )}
            {variables.map((definition) => {
              const typeStyle = TYPE_STYLES[definition.type]
              return (
                <div
                  key={definition.id}
                  className={`mvpv2-vars-row group rounded-md border border-slate-200 border-l-2 ${typeStyle.border} bg-white transition-shadow hover:shadow-sm`}
                >
                  <div className="flex items-center gap-1 px-2.5 pt-2 pb-1">
                    <input
                      className="mvpv2-vars-name-input h-6 min-w-0 flex-1 truncate rounded border border-transparent bg-transparent px-1 text-xs font-medium text-slate-800 transition-colors hover:border-slate-300 focus:border-slate-400 focus:bg-white focus:outline-none"
                      value={definition.name}
                      onChange={(event) =>
                        onUpdateVariable(
                          objectId,
                          definition.id,
                          event.target.value,
                          parseInitialValue(definition.type, formatInputValue(definition.type, definition.initialValue))
                        )
                      }
                    />
                    <span
                      className={`mvpv2-vars-type-badge shrink-0 rounded-full px-1.5 py-0.5 text-[10px] font-medium leading-none ${typeStyle.badge}`}
                    >
                      {typeBadgeLabel(definition.type, definition.itemType)}
                    </span>
                    <button
                      type="button"
                      className="mvpv2-vars-delete-btn -mr-1 ml-0.5 shrink-0 rounded p-0.5 text-slate-300 opacity-0 transition-all hover:bg-red-50 hover:text-red-500 group-hover:opacity-100"
                      onClick={() => onRemoveVariable(objectId, definition.id)}
                      title="Delete variable"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>

                  <div className="flex items-start gap-1.5 px-2.5 pb-2">
                    <span className="mvpv2-vars-equals mt-1 text-[10px] font-medium text-slate-400">=</span>
                    {definition.type === "boolean" ? (
                      <select
                        className="mvpv2-vars-value-bool h-7 w-full rounded border border-slate-200 bg-slate-50 px-2 text-xs text-slate-700 transition-colors focus:border-slate-400 focus:bg-white focus:outline-none"
                        value={definition.initialValue ? "true" : "false"}
                        onChange={(event) =>
                          onUpdateVariable(objectId, definition.id, definition.name, event.target.value === "true")
                        }
                      >
                        <option value="true">true</option>
                        <option value="false">false</option>
                      </select>
                    ) : definition.type === "list" || definition.type === "map" ? (
                      <textarea
                        className="mvpv2-vars-value-collection min-h-[3.5rem] w-full resize-y rounded border border-slate-200 bg-slate-50 px-2 py-1.5 font-mono text-xs text-slate-700 transition-colors focus:border-slate-400 focus:bg-white focus:outline-none"
                        value={formatInputValue(definition.type, definition.initialValue)}
                        placeholder={definition.type === "list" ? "[1, 2, 3]" : '{"key": "value"}'}
                        onChange={(event) =>
                          onUpdateVariable(
                            objectId,
                            definition.id,
                            definition.name,
                            parseInitialValue(definition.type, event.target.value, definition.itemType ?? "number")
                          )
                        }
                      />
                    ) : (
                      <input
                        className="mvpv2-vars-value-input h-7 w-full rounded border border-slate-200 bg-slate-50 px-2 text-xs text-slate-700 transition-colors focus:border-slate-400 focus:bg-white focus:outline-none"
                        type={definition.type === "number" ? "number" : "text"}
                        value={formatInputValue(definition.type, definition.initialValue)}
                        onChange={(event) =>
                          onUpdateVariable(
                            objectId,
                            definition.id,
                            definition.name,
                            parseInitialValue(definition.type, event.target.value, definition.itemType ?? "number")
                          )
                        }
                      />
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </aside>
  )
}
