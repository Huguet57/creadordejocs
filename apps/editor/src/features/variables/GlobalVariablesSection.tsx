import { Minus, Plus, X } from "lucide-react"
import { useCallback, useEffect, useMemo, useState, type KeyboardEvent } from "react"
import type { VariableItemType, VariableType, VariableValue } from "@creadordejocs/project-format"
import type { EditorController } from "../editor-state/use-editor-controller.js"
import { Button } from "../../components/ui/button.js"

type GlobalVariablesSectionProps = {
  controller: EditorController
}

const GLOBAL_TYPE_BADGE_CLASS = "bg-slate-100 text-slate-500"

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
      if (!Array.isArray(parsed)) return []
      return parsed.filter((entry): entry is string | number | boolean => typeof entry === itemType)
    } catch {
      return []
    }
  }
  if (type === "map") {
    try {
      const parsed: unknown = JSON.parse(rawValue)
      if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return {}
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
  if (itemType === "number") return 0
  if (itemType === "boolean") return false
  return ""
}

function GlobalNumericDraftInput({
  value,
  onCommit,
  className,
  placeholder
}: {
  value: number | string
  onCommit: (next: number) => void
  className: string
  placeholder?: string
}) {
  const [draft, setDraft] = useState(String(value))

  useEffect(() => {
    setDraft(String(value))
  }, [value])

  return (
    <input
      className={className}
      type="text"
      inputMode="numeric"
      value={draft}
      placeholder={placeholder ?? "0"}
      onChange={(event) => {
        const raw = event.target.value
        setDraft(raw)
        const parsed = Number(raw)
        if (raw !== "" && raw !== "-" && Number.isFinite(parsed)) {
          onCommit(parsed)
        }
      }}
      onBlur={() => {
        const parsed = Number(draft)
        const final = Number.isFinite(parsed) && draft !== "" && draft !== "-" ? parsed : 0
        onCommit(final)
        setDraft(String(final))
      }}
    />
  )
}

function GlobalListValueEditor({
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
    ? "mvpv2-global-list-item-input h-6 min-w-0 flex-1 rounded border border-slate-200 bg-slate-50 px-1 text-[11px] text-slate-700 transition-colors focus:border-slate-400 focus:bg-white focus:outline-none"
    : "mvpv2-global-list-item-input h-7 min-w-0 flex-1 rounded border border-slate-300 bg-white px-1.5 text-xs text-slate-900 transition-colors focus:outline-none focus:ring-2 focus:ring-slate-400"

  return (
    <div className="mvpv2-global-list-editor flex w-full flex-col gap-1">
      {value.map((item, index) => (
        <div key={index} className="mvpv2-global-list-item-row flex items-center gap-1.5">
          <span className="mvpv2-global-list-item-idx w-3 shrink-0 text-right text-[9px] text-slate-400">{index}</span>
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
          ) : itemType === "number" ? (
            <GlobalNumericDraftInput
              className={inputClass}
              value={item as number}
              onCommit={(num) => {
                const next = [...value]
                next[index] = num
                onChange(next)
              }}
            />
          ) : (
            <input
              className={inputClass}
              type="text"
              value={String(item)}
              placeholder={placeholderForItemType(itemType)}
              onChange={(event) => {
                const next = [...value]
                next[index] = event.target.value
                onChange(next)
              }}
            />
          )}
          <button
            type="button"
            className="mvpv2-global-list-item-remove shrink-0 rounded p-0.5 text-slate-300 transition-colors hover:bg-red-50 hover:text-red-500"
            onClick={() => onChange(value.filter((_, i) => i !== index))}
            title="Remove item"
          >
            <Minus className="h-3 w-3" />
          </button>
        </div>
      ))}
      <button
        type="button"
        className="mvpv2-global-list-add-btn mt-0.5 flex items-center gap-1 self-start rounded px-1 py-0.5 text-[10px] text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600"
        onClick={() => onChange([...value, defaultForItemType(itemType)])}
      >
        <Plus className="h-3 w-3" />
        <span>Add item</span>
      </button>
    </div>
  )
}

function GlobalMapValueEditor({
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
    ? "mvpv2-global-map-entry-input h-6 min-w-0 flex-1 rounded border border-slate-200 bg-slate-50 px-1 text-[11px] text-slate-700 transition-colors focus:border-slate-400 focus:bg-white focus:outline-none"
    : "mvpv2-global-map-entry-input h-7 min-w-0 flex-1 rounded border border-slate-300 bg-white px-1.5 text-xs text-slate-900 transition-colors focus:outline-none focus:ring-2 focus:ring-slate-400"

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
    let newKey = "key"
    let counter = 1
    while (newKey in value) {
      newKey = `key${counter}`
      counter++
    }
    onChange({ ...value, [newKey]: defaultForItemType(itemType) })
  }

  return (
    <div className="mvpv2-global-map-editor flex w-full min-w-0 flex-col gap-1">
      {entries.map(([key, val], index) => (
        <div key={index} className="mvpv2-global-map-entry-row flex min-w-0 items-center gap-0.5">
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
          ) : itemType === "number" ? (
            <GlobalNumericDraftInput
              className={`${inputClass} w-0`}
              value={val as number}
              onCommit={(num) => handleValueChange(key, num)}
            />
          ) : (
            <input
              className={`${inputClass} w-0`}
              type="text"
              value={String(val)}
              placeholder={placeholderForItemType(itemType)}
              onChange={(event) => handleValueChange(key, event.target.value)}
            />
          )}
          <button
            type="button"
            className="mvpv2-global-map-entry-remove shrink-0 rounded p-0.5 text-slate-300 transition-colors hover:bg-red-50 hover:text-red-500"
            onClick={() => handleRemove(key)}
            title="Remove entry"
          >
            <Minus className="h-3 w-3" />
          </button>
        </div>
      ))}
      <button
        type="button"
        className="mvpv2-global-map-add-btn mt-0.5 flex items-center gap-1 self-start rounded px-1 py-0.5 text-[10px] text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600"
        onClick={handleAdd}
      >
        <Plus className="h-3 w-3" />
        <span>Add entry</span>
      </button>
    </div>
  )
}

export function GlobalVariablesSection({ controller }: GlobalVariablesSectionProps) {
  const [isAdding, setIsAdding] = useState(false)
  const [newVariableName, setNewVariableName] = useState("")
  const [newVariableType, setNewVariableType] = useState<VariableType>("number")
  const [newVariableItemType, setNewVariableItemType] = useState<VariableItemType>("number")
  const [newVariableRawValue, setNewVariableRawValue] = useState("")

  const globalVariables = controller.project.variables.global
  const globalNames = useMemo(
    () => new Set(globalVariables.map((definition) => definition.name.trim().toLocaleLowerCase())),
    [globalVariables]
  )

  const inputCallbackRef = useCallback((node: HTMLInputElement | null) => {
    if (node) node.select()
  }, [])

  const blockUndoShortcuts = (event: KeyboardEvent<HTMLInputElement>): void => {
    if ((event.metaKey || event.ctrlKey) && (event.key.toLowerCase() === "z" || event.key.toLowerCase() === "y")) {
      event.preventDefault()
    }
  }

  const canAdd = newVariableName.trim() && !globalNames.has(newVariableName.trim().toLocaleLowerCase())

  const handleAdd = () => {
    if (!canAdd) return
    controller.addGlobalVariable(
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
    <section className="mvpv2-global-vars-section flex h-full w-full flex-col overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
      <header className="mvpv2-global-vars-header flex items-center justify-between border-b border-slate-200 px-4 py-3">
        <div>
          <h2 className="text-sm font-semibold text-slate-900">Global Variables</h2>
          <p className="text-xs text-slate-500">Variables shared across all object instances.</p>
        </div>
        {!isAdding && (
          <button
            type="button"
            className="mvpv2-global-vars-header-add inline-flex h-6 w-6 items-center justify-center rounded text-slate-400 transition-colors hover:bg-slate-200 hover:text-slate-700"
            onClick={() => setIsAdding(true)}
            title="Add variable"
            aria-label="Add variable"
          >
            <Plus className="h-4 w-4" />
          </button>
        )}
      </header>

      <div className="mvpv2-global-vars-list flex-1 overflow-y-auto p-4">
          <div className="flex flex-col gap-2">
            {globalVariables.length === 0 && !isAdding && (
              <p className="mvpv2-global-vars-empty px-1 py-4 text-center text-xs text-slate-400">
                No variables yet
              </p>
            )}
            {globalVariables.map((definition) => (
              <div
                key={definition.id}
                className="mvpv2-global-vars-row group rounded-lg border border-slate-200 bg-white"
              >
                <div className="flex items-center gap-1.5 px-3 pt-2 pb-1">
                  <input
                    className="mvpv2-global-vars-name-input h-7 min-w-0 flex-1 truncate rounded border border-transparent bg-transparent px-1.5 text-sm font-medium text-slate-800 transition-colors hover:border-slate-300 focus:border-slate-400 focus:bg-white focus:outline-none"
                    value={definition.name}
                    onChange={(event) =>
                      controller.updateGlobalVariable(
                        definition.id,
                        event.target.value,
                        parseInitialValue(definition.type, formatInputValue(definition.type, definition.initialValue))
                      )
                    }
                  />
                  <span
                    className={`mvpv2-global-vars-type-badge shrink-0 rounded px-1.5 py-0.5 text-[10px] font-medium leading-none ${GLOBAL_TYPE_BADGE_CLASS}`}
                  >
                    {typeBadgeLabel(
                      definition.type,
                      "itemType" in definition ? (definition.itemType as VariableItemType | undefined) : undefined
                    )}
                  </span>
                  <button
                    type="button"
                    className="mvpv2-global-vars-delete-btn -mr-1 ml-0.5 shrink-0 rounded p-0.5 text-slate-300 opacity-0 transition-all hover:bg-red-50 hover:text-red-500 group-hover:opacity-100"
                    onClick={() => controller.removeGlobalVariable(definition.id)}
                    title="Delete variable"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>

                <div className="flex items-start gap-1.5 px-3 pb-2">
                  <span className="mvpv2-global-vars-equals mt-1.5 text-[10px] font-medium text-slate-400">=</span>
                  {definition.type === "boolean" ? (
                    <select
                      className="mvpv2-global-vars-value-bool h-8 w-full rounded border border-slate-200 bg-slate-50 px-2 text-xs text-slate-700 transition-colors focus:border-slate-400 focus:bg-white focus:outline-none"
                      value={definition.initialValue ? "true" : "false"}
                      onChange={(event) =>
                        controller.updateGlobalVariable(definition.id, definition.name, event.target.value === "true")
                      }
                    >
                      <option value="true">true</option>
                      <option value="false">false</option>
                    </select>
                  ) : definition.type === "list" ? (
                    <GlobalListValueEditor
                      compact
                      value={definition.initialValue as PrimitiveValue[]}
                      itemType={
                        "itemType" in definition ? (definition.itemType as VariableItemType) ?? "number" : "number"
                      }
                      onChange={(next) =>
                        controller.updateGlobalVariable(definition.id, definition.name, next)
                      }
                    />
                  ) : definition.type === "map" ? (
                    <GlobalMapValueEditor
                      compact
                      value={definition.initialValue as Record<string, PrimitiveValue>}
                      itemType={
                        "itemType" in definition ? (definition.itemType as VariableItemType) ?? "number" : "number"
                      }
                      onChange={(next) =>
                        controller.updateGlobalVariable(definition.id, definition.name, next)
                      }
                    />
                  ) : definition.type === "number" ? (
                    <GlobalNumericDraftInput
                      className="mvpv2-global-vars-value-input h-8 w-full rounded border border-slate-200 bg-slate-50 px-2 text-xs text-slate-700 transition-colors focus:border-slate-400 focus:bg-white focus:outline-none"
                      value={definition.initialValue}
                      onCommit={(num) =>
                        controller.updateGlobalVariable(definition.id, definition.name, num)
                      }
                    />
                  ) : (
                    <input
                      className="mvpv2-global-vars-value-input h-8 w-full rounded border border-slate-200 bg-slate-50 px-2 text-xs text-slate-700 transition-colors focus:border-slate-400 focus:bg-white focus:outline-none"
                      type="text"
                      value={formatInputValue(definition.type, definition.initialValue)}
                      onChange={(event) =>
                        controller.updateGlobalVariable(
                          definition.id,
                          definition.name,
                          parseInitialValue(
                            definition.type,
                            event.target.value,
                            "itemType" in definition ? (definition.itemType as VariableItemType) : "number"
                          )
                        )
                      }
                    />
                  )}
                </div>
              </div>
            ))}

          </div>
        </div>

      {isAdding && (
        <div className="mvpv2-global-vars-add-footer shrink-0 space-y-2 border-t border-slate-200 bg-slate-50 p-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-600">Afegir variable global</span>
            <button
              type="button"
              className="mvpv2-global-vars-add-close inline-flex h-5 w-5 shrink-0 items-center justify-center rounded text-slate-400 transition-colors hover:bg-slate-200 hover:text-slate-700"
              onClick={() => setIsAdding(false)}
              title="Cancel"
              aria-label="Cancel add variable"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>

          <div className="mvpv2-global-vars-add-inline flex items-end gap-2">
            <div className="mvpv2-global-vars-add-name-field min-w-[140px] flex-1">
              <label className="mvpv2-global-vars-add-field-label mb-1 block text-[10px] font-semibold uppercase tracking-wider text-slate-400">
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
                className="mvpv2-global-vars-add-field-name flex h-8 w-full rounded-md border border-slate-300 bg-white px-2.5 text-xs shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400"
                placeholder="e.g. score, lives, level"
              />
            </div>

            <div className="mvpv2-global-vars-add-type-field w-[100px] shrink-0">
              <label className="mvpv2-global-vars-add-field-label mb-1 block text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                Type
              </label>
              <select
                className="mvpv2-global-vars-add-type-select h-8 w-full rounded border border-slate-300 bg-white px-2 text-xs text-slate-900 transition-colors focus:outline-none focus:ring-2 focus:ring-slate-400"
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
            </div>

            {(newVariableType === "list" || newVariableType === "map") && (
              <div className="mvpv2-global-vars-add-itemtype-field w-[100px] shrink-0">
                <label className="mvpv2-global-vars-add-field-label mb-1 block text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                  Item type
                </label>
                <select
                  className="mvpv2-global-vars-add-itemtype-select h-8 w-full rounded border border-slate-300 bg-white px-2 text-xs text-slate-900 transition-colors focus:outline-none focus:ring-2 focus:ring-slate-400"
                  value={newVariableItemType}
                  onChange={(event) => setNewVariableItemType(event.target.value as VariableItemType)}
                >
                  <option value="number">number</option>
                  <option value="string">string</option>
                  <option value="boolean">boolean</option>
                </select>
              </div>
            )}

            {newVariableType !== "list" && newVariableType !== "map" && (
              <div className="mvpv2-global-vars-add-value-field min-w-[120px] flex-1">
                <label className="mvpv2-global-vars-add-field-label mb-1 block text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                  Initial value
                </label>
                {newVariableType === "boolean" ? (
                  <select
                    className="mvpv2-global-vars-add-field-value-bool h-8 w-full rounded border border-slate-300 bg-white px-2 text-xs text-slate-900 transition-colors focus:outline-none focus:ring-2 focus:ring-slate-400"
                    value={newVariableRawValue}
                    onChange={(event) => setNewVariableRawValue(event.target.value)}
                  >
                    <option value="true">true</option>
                    <option value="false">false</option>
                  </select>
                ) : (
                  <input
                    className="mvpv2-global-vars-add-field-value-input h-8 w-full rounded border border-slate-300 bg-white px-2.5 text-xs text-slate-900 transition-colors focus:outline-none focus:ring-2 focus:ring-slate-400"
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
            )}

            <Button
              size="sm"
              className="mvpv2-global-vars-add-panel-submit h-8 shrink-0 text-xs"
              onClick={handleAdd}
              disabled={!canAdd}
            >
              <Plus className="mr-1.5 h-3.5 w-3.5" />
              Add
            </Button>
          </div>

          {(newVariableType === "list" || newVariableType === "map") && (
            <div className="mvpv2-global-vars-add-value-block">
              <label className="mvpv2-global-vars-add-field-label mb-1 block text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                Initial value
              </label>
              {newVariableType === "list" ? (
                <GlobalListValueEditor
                  value={parseSafeList(newVariableRawValue, newVariableItemType)}
                  itemType={newVariableItemType}
                  onChange={(next) => setNewVariableRawValue(JSON.stringify(next))}
                />
              ) : (
                <GlobalMapValueEditor
                  value={parseSafeMap(newVariableRawValue, newVariableItemType)}
                  itemType={newVariableItemType}
                  onChange={(next) => setNewVariableRawValue(JSON.stringify(next))}
                />
              )}
            </div>
          )}
        </div>
      )}
    </section>
  )
}
