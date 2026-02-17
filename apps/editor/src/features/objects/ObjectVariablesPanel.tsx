import { Minus, Plus, X } from "lucide-react"
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

const TYPE_BADGE_CLASS = "bg-slate-100 text-slate-500"

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

type PrimitiveValue = string | number | boolean

function parseSafeList(raw: string, itemType: VariableItemType): PrimitiveValue[] {
  try {
    const parsed: unknown = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    return parsed.filter((entry): entry is PrimitiveValue => typeof entry === itemType)
  } catch {
    return []
  }
}

function parseSafeMap(raw: string, itemType: VariableItemType): Record<string, PrimitiveValue> {
  try {
    const parsed: unknown = JSON.parse(raw)
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return {}
    return Object.fromEntries(
      Object.entries(parsed as Record<string, unknown>).filter(([, v]) => typeof v === itemType)
    ) as Record<string, PrimitiveValue>
  } catch {
    return {}
  }
}

function placeholderForItemType(itemType: VariableItemType): string {
  if (itemType === "number") return "0"
  if (itemType === "boolean") return "false"
  return ""
}

function defaultForItemType(itemType: VariableItemType): PrimitiveValue {
  if (itemType === "number") return ""
  if (itemType === "boolean") return false
  return ""
}

function coerceItemValue(raw: string, itemType: VariableItemType): PrimitiveValue {
  if (itemType === "number") {
    if (raw === "" || raw === "-") return raw
    const parsed = Number(raw)
    return Number.isFinite(parsed) ? parsed : raw
  }
  if (itemType === "boolean") return raw === "true"
  return raw
}

function coerceItemOnBlur(current: PrimitiveValue, itemType: VariableItemType): PrimitiveValue {
  if (itemType === "number") {
    if (current === "" || current === "-") return 0
    const parsed = Number(current)
    return Number.isFinite(parsed) ? parsed : 0
  }
  return current
}

function ListValueEditor({
  value,
  itemType,
  onChange,
  compact = false
}: {
  value: PrimitiveValue[]
  itemType: VariableItemType
  onChange: (next: PrimitiveValue[]) => void
  compact?: boolean
}) {
  const inputClass = compact
    ? "mvpv2-list-item-input h-6 min-w-0 flex-1 rounded border border-slate-200 bg-slate-50 px-1 text-[11px] text-slate-700 transition-colors focus:border-slate-400 focus:bg-white focus:outline-none"
    : "mvpv2-list-item-input h-7 min-w-0 flex-1 rounded border border-slate-300 bg-white px-1.5 text-xs text-slate-900 transition-colors focus:outline-none focus:ring-2 focus:ring-slate-400"

  return (
    <div className="mvpv2-list-editor flex w-full flex-col gap-1">
      {value.map((item, index) => (
        <div key={index} className="mvpv2-list-item-row flex items-center gap-0.5">
          <span className="mvpv2-list-item-idx w-3 shrink-0 text-right text-[9px] text-slate-400">{index}</span>
          {itemType === "boolean" ? (
            <select
              className={inputClass}
              value={String(item)}
              onChange={(event) => {
                const next = [...value]
                next[index] = event.target.value === "true"
                onChange(next)
              }}
            >
              <option value="true">true</option>
              <option value="false">false</option>
            </select>
          ) : (
            <input
              className={inputClass}
              type="text"
              inputMode={itemType === "number" ? "numeric" : "text"}
              value={String(item)}
              placeholder={placeholderForItemType(itemType)}
              onChange={(event) => {
                const next = [...value]
                next[index] = coerceItemValue(event.target.value, itemType)
                onChange(next)
              }}
              onBlur={() => {
                const coerced = coerceItemOnBlur(item, itemType)
                if (coerced !== item) {
                  const next = [...value]
                  next[index] = coerced
                  onChange(next)
                }
              }}
            />
          )}
          <button
            type="button"
            className="mvpv2-list-item-remove shrink-0 rounded p-0.5 text-slate-300 transition-colors hover:bg-red-50 hover:text-red-500"
            onClick={() => onChange(value.filter((_, i) => i !== index))}
            title="Remove item"
          >
            <Minus className="h-3 w-3" />
          </button>
        </div>
      ))}
      <button
        type="button"
        className="mvpv2-list-add-btn mt-0.5 flex items-center gap-1 self-start rounded px-1 py-0.5 text-[10px] text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600"
        onClick={() => onChange([...value, defaultForItemType(itemType)])}
      >
        <Plus className="h-3 w-3" />
        <span>Add item</span>
      </button>
    </div>
  )
}

function MapValueEditor({
  value,
  itemType,
  onChange,
  compact = false
}: {
  value: Record<string, PrimitiveValue>
  itemType: VariableItemType
  onChange: (next: Record<string, PrimitiveValue>) => void
  compact?: boolean
}) {
  const entries = Object.entries(value)

  const inputClass = compact
    ? "mvpv2-map-entry-input h-6 min-w-0 flex-1 rounded border border-slate-200 bg-slate-50 px-1 text-[11px] text-slate-700 transition-colors focus:border-slate-400 focus:bg-white focus:outline-none"
    : "mvpv2-map-entry-input h-7 min-w-0 flex-1 rounded border border-slate-300 bg-white px-1.5 text-xs text-slate-900 transition-colors focus:outline-none focus:ring-2 focus:ring-slate-400"

  const handleKeyChange = (oldKey: string, newKey: string) => {
    const next: Record<string, PrimitiveValue> = {}
    for (const [key, val] of entries) {
      next[key === oldKey ? newKey : key] = val
    }
    onChange(next)
  }

  const handleValueChange = (key: string, newValue: PrimitiveValue) => {
    onChange({ ...value, [key]: newValue })
  }

  const handleRemove = (key: string) => {
    const next = { ...value }
    delete next[key]
    onChange(next)
  }

  const handleAdd = () => {
    let newKey = ""
    let counter = 0
    while (newKey in value) {
      counter++
      newKey = `key${counter}`
    }
    onChange({ ...value, [newKey]: defaultForItemType(itemType) })
  }

  return (
    <div className="mvpv2-map-editor flex w-full min-w-0 flex-col gap-1">
      {entries.map(([key, val], index) => (
        <div key={index} className="mvpv2-map-entry-row flex min-w-0 items-center gap-0.5">
          <input
            className={`${inputClass} w-0 font-medium`}
            value={key}
            onChange={(event) => handleKeyChange(key, event.target.value)}
            placeholder="key"
          />
          {itemType === "boolean" ? (
            <select
              className={`${inputClass} w-0`}
              value={String(val)}
              onChange={(event) => handleValueChange(key, event.target.value === "true")}
            >
              <option value="true">true</option>
              <option value="false">false</option>
            </select>
          ) : (
            <input
              className={`${inputClass} w-0`}
              type="text"
              inputMode={itemType === "number" ? "numeric" : "text"}
              value={String(val)}
              placeholder={placeholderForItemType(itemType)}
              onChange={(event) => handleValueChange(key, coerceItemValue(event.target.value, itemType))}
              onBlur={() => {
                const coerced = coerceItemOnBlur(val, itemType)
                if (coerced !== val) handleValueChange(key, coerced)
              }}
            />
          )}
          <button
            type="button"
            className="mvpv2-map-entry-remove shrink-0 rounded p-0.5 text-slate-300 transition-colors hover:bg-red-50 hover:text-red-500"
            onClick={() => handleRemove(key)}
            title="Remove entry"
          >
            <Minus className="h-3 w-3" />
          </button>
        </div>
      ))}
      <button
        type="button"
        className="mvpv2-map-add-btn mt-0.5 flex items-center gap-1 self-start rounded px-1 py-0.5 text-[10px] text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600"
        onClick={handleAdd}
      >
        <Plus className="h-3 w-3" />
        <span>Add entry</span>
      </button>
    </div>
  )
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
  const [newVariableRawValue, setNewVariableRawValue] = useState("")

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
    setNewVariableRawValue("")
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
              <div className="flex gap-1.5">
                <select
                  className="mvpv2-vars-add-type-select h-8 w-full rounded border border-slate-300 bg-white px-2 text-xs text-slate-900 transition-colors focus:outline-none focus:ring-2 focus:ring-slate-400"
                  value={newVariableType}
                  onChange={(event) => {
                    const nextType = event.target.value as VariableType
                    setNewVariableType(nextType)
                    setNewVariableRawValue(
                      nextType === "boolean"
                        ? "false"
                        : nextType === "list"
                          ? "[]"
                          : nextType === "map"
                            ? "{}"
                            : ""
                    )
                  }}
                >
                  <option value="number">number</option>
                  <option value="string">string</option>
                  <option value="boolean">boolean</option>
                  <option value="list">list</option>
                  <option value="map">map</option>
                </select>
                {(newVariableType === "list" || newVariableType === "map") && (
                  <select
                    className="mvpv2-vars-add-itemtype-select h-8 w-full rounded border border-slate-300 bg-white px-2 text-xs text-slate-900 transition-colors focus:outline-none focus:ring-2 focus:ring-slate-400"
                    value={newVariableItemType}
                    onChange={(event) => setNewVariableItemType(event.target.value as VariableItemType)}
                  >
                    <option value="number">number</option>
                    <option value="string">string</option>
                    <option value="boolean">boolean</option>
                  </select>
                )}
              </div>
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
              ) : newVariableType === "list" ? (
                <ListValueEditor
                  value={parseSafeList(newVariableRawValue, newVariableItemType)}
                  itemType={newVariableItemType}
                  onChange={(next) => setNewVariableRawValue(JSON.stringify(next))}
                />
              ) : newVariableType === "map" ? (
                <MapValueEditor
                  value={parseSafeMap(newVariableRawValue, newVariableItemType)}
                  itemType={newVariableItemType}
                  onChange={(next) => setNewVariableRawValue(JSON.stringify(next))}
                />
              ) : (
                <input
                  className="mvpv2-vars-add-field-value-input h-8 w-full rounded border border-slate-300 bg-white px-3 text-xs text-slate-900 transition-colors focus:outline-none focus:ring-2 focus:ring-slate-400"
                  type="text"
                  inputMode={newVariableType === "number" ? "numeric" : "text"}
                  value={newVariableRawValue}
                  onChange={(event) => setNewVariableRawValue(event.target.value)}
                  onBlur={() => {
                    if (newVariableType === "number" && (newVariableRawValue === "" || newVariableRawValue === "-")) {
                      setNewVariableRawValue("0")
                    }
                  }}
                  placeholder={newVariableType === "number" ? "0" : "Value"}
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
              <p className="mvpv2-vars-empty px-1 py-2 text-center text-[11px] text-slate-400">
                No variables yet
              </p>
            )}
            {variables.map((definition) => (
                <div
                  key={definition.id}
                  className="mvpv2-vars-row group rounded border border-slate-200 bg-white"
                >
                  <div className="flex items-center gap-1 px-2 pt-1.5 pb-1">
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
                      className={`mvpv2-vars-type-badge shrink-0 rounded px-1.5 py-0.5 text-[10px] font-medium leading-none ${TYPE_BADGE_CLASS}`}
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

                  <div className="flex items-start gap-1.5 px-2 pb-1.5">
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
                    ) : definition.type === "list" ? (
                      <ListValueEditor
                        compact
                        value={definition.initialValue as PrimitiveValue[]}
                        itemType={definition.itemType ?? "number"}
                        onChange={(next) => onUpdateVariable(objectId, definition.id, definition.name, next)}
                      />
                    ) : definition.type === "map" ? (
                      <MapValueEditor
                        compact
                        value={definition.initialValue as Record<string, PrimitiveValue>}
                        itemType={definition.itemType ?? "number"}
                        onChange={(next) => onUpdateVariable(objectId, definition.id, definition.name, next)}
                      />
                    ) : (
                      <input
                        className="mvpv2-vars-value-input h-7 w-full rounded border border-slate-200 bg-slate-50 px-2 text-xs text-slate-700 transition-colors focus:border-slate-400 focus:bg-white focus:outline-none"
                        type="text"
                        inputMode={definition.type === "number" ? "numeric" : "text"}
                        value={formatInputValue(definition.type, definition.initialValue)}
                        placeholder={definition.type === "number" ? "0" : ""}
                        onChange={(event) =>
                          onUpdateVariable(
                            objectId,
                            definition.id,
                            definition.name,
                            definition.type === "number"
                              ? (event.target.value === "" || event.target.value === "-" ? event.target.value : parseInitialValue(definition.type, event.target.value))
                              : parseInitialValue(definition.type, event.target.value, definition.itemType ?? "number")
                          )
                        }
                        onBlur={() => {
                          if (definition.type === "number") {
                            const raw = formatInputValue(definition.type, definition.initialValue)
                            if (raw === "" || raw === "-") {
                              onUpdateVariable(objectId, definition.id, definition.name, 0)
                            }
                          }
                        }}
                      />
                    )}
                  </div>
                </div>
            ))}
          </div>
        </div>
      )}
    </aside>
  )
}
