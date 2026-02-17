import { Plus, X } from "lucide-react"
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

      <div className="flex items-center justify-between border-b border-slate-200 p-3">
        <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Variables</span>
      </div>

      <div className="mvpv1-object-vars-list flex-1 overflow-y-auto p-2">
        <div className="flex flex-col gap-1">
          {variables.length === 0 && (
            <p className="px-2 py-4 text-center text-xs text-slate-400">No variables yet</p>
          )}
          {variables.map((definition) => (
            <div
              key={definition.id}
              className="mvpv1-object-vars-row group rounded border border-slate-200 bg-white px-2 py-1.5"
            >
              <div className="flex items-center justify-between gap-1">
                <div className="flex min-w-0 flex-1 flex-col">
                  <input
                    className="h-6 w-full truncate rounded border border-transparent bg-transparent px-1 text-sm text-slate-900 hover:border-slate-300 focus:border-slate-400 focus:outline-none"
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
                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px] text-slate-400">
                      {definition.type}
                      {(definition.type === "list" || definition.type === "map") && definition.itemType
                        ? `<${definition.itemType}>`
                        : ""}
                    </span>
                    {definition.type === "boolean" ? (
                      <select
                        className="h-5 rounded border border-slate-200 bg-slate-50 px-1 text-[10px] text-slate-600 focus:outline-none"
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
                        className="min-h-14 w-full rounded border border-slate-200 bg-slate-50 px-1 py-1 text-[10px] text-slate-600 focus:outline-none"
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
                    ) : (
                      <input
                        className="h-5 w-16 rounded border border-slate-200 bg-slate-50 px-1 text-[10px] text-slate-600 focus:outline-none"
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
                <button
                  type="button"
                  className="mvpv1-object-vars-delete opacity-0 transition-opacity hover:text-red-500 group-hover:opacity-100"
                  onClick={() => onRemoveVariable(objectId, definition.id)}
                  title="Delete variable"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="border-t border-slate-200 bg-white p-3">
        {isAdding ? (
          <div className="mvpv1-object-vars-add-panel rounded-md border border-slate-200 bg-slate-50 p-2">
            <div className="mvpv1-object-vars-add-panel-header mb-2 flex items-center justify-between">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">Add Variable</p>
              <button
                type="button"
                className="mvpv1-object-vars-add-panel-close inline-flex h-6 w-6 items-center justify-center rounded text-slate-400 transition-colors hover:bg-slate-200 hover:text-slate-700"
                onClick={() => setIsAdding(false)}
                title="Cancel"
                aria-label="Cancel add variable"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
            <div className="space-y-2">
              <input
                ref={inputCallbackRef}
                value={newVariableName}
                onChange={(event) => setNewVariableName(event.target.value)}
                onKeyDown={(event: KeyboardEvent<HTMLInputElement>) => {
                  blockUndoShortcuts(event)
                  if (event.key === "Enter") handleAdd()
                  if (event.key === "Escape") setIsAdding(false)
                }}
                className="flex h-8 w-full rounded-md border border-slate-300 bg-white px-3 py-1 text-xs shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400"
                placeholder="Eg: xSpeed, jumpForce, health, isAlive"
              />
              <div className="flex gap-2">
                <select
                  className="h-8 w-full rounded border border-slate-300 bg-white px-2 text-xs text-slate-900 focus:outline-none"
                  value={newVariableType}
                  onChange={(event) => {
                    const nextType = event.target.value as VariableType
                    setNewVariableType(nextType)
                    setNewVariableRawValue(
                      nextType === "boolean"
                        ? "false"
                        : nextType === "number"
                          ? "0"
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
                    className="h-8 w-full rounded border border-slate-300 bg-white px-2 text-xs text-slate-900 focus:outline-none"
                    value={newVariableItemType}
                    onChange={(event) => setNewVariableItemType(event.target.value as VariableItemType)}
                  >
                    <option value="number">number</option>
                    <option value="string">string</option>
                    <option value="boolean">boolean</option>
                  </select>
                )}
                {newVariableType === "boolean" ? (
                  <select
                    className="h-8 w-full rounded border border-slate-300 bg-white px-2 text-xs text-slate-900 focus:outline-none"
                    value={newVariableRawValue}
                    onChange={(event) => setNewVariableRawValue(event.target.value)}
                  >
                    <option value="true">true</option>
                    <option value="false">false</option>
                  </select>
                ) : newVariableType === "list" || newVariableType === "map" ? (
                  <textarea
                    className="min-h-14 w-full rounded border border-slate-300 bg-white px-2 py-1 text-xs text-slate-900 focus:outline-none"
                    value={newVariableRawValue}
                    onChange={(event) => setNewVariableRawValue(event.target.value)}
                    placeholder={newVariableType === "list" ? 'Example: [1,2,3]' : 'Example: {"hp":10}'}
                  />
                ) : (
                  <input
                    className="h-8 w-full rounded border border-slate-300 bg-white px-2 text-xs text-slate-900 focus:outline-none"
                    type={newVariableType === "number" ? "number" : "text"}
                    value={newVariableRawValue}
                    onChange={(event) => setNewVariableRawValue(event.target.value)}
                    placeholder="Value"
                  />
                )}
              </div>
              <Button
                size="sm"
                className="h-8 w-full text-xs"
                onClick={handleAdd}
                disabled={!canAdd}
              >
                <Plus className="mr-2 h-3.5 w-3.5" />
                Add
              </Button>
            </div>
          </div>
        ) : (
          <Button
            variant="outline"
            size="sm"
            className="w-full h-8 text-xs"
            onClick={() => setIsAdding(true)}
          >
            <Plus className="mr-2 h-3.5 w-3.5" />
            Add Variable
          </Button>
        )}
      </div>
    </aside>
  )
}
