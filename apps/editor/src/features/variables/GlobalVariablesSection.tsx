import { Plus, X } from "lucide-react"
import { useMemo, useState } from "react"
import type { VariableItemType, VariableType, VariableValue } from "@creadordejocs/project-format"
import type { EditorController } from "../editor-state/use-editor-controller.js"
import { Button } from "../../components/ui/button.js"

type GlobalVariablesSectionProps = {
  controller: EditorController
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

export function GlobalVariablesSection({ controller }: GlobalVariablesSectionProps) {
  const [newVariableName, setNewVariableName] = useState("")
  const [newVariableType, setNewVariableType] = useState<VariableType>("number")
  const [newVariableItemType, setNewVariableItemType] = useState<VariableItemType>("number")
  const [newVariableRawValue, setNewVariableRawValue] = useState("0")

  const globalVariables = controller.project.variables.global
  const globalNames = useMemo(
    () => new Set(globalVariables.map((definition) => definition.name.trim().toLocaleLowerCase())),
    [globalVariables]
  )

  return (
    <section className="mvpv1-global-vars-section flex h-[600px] w-full flex-col overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
      <header className="mvpv1-global-vars-header flex items-center justify-between border-b border-slate-200 px-4 py-3">
        <div>
          <h2 className="text-sm font-semibold text-slate-900">Global Variables</h2>
          <p className="text-xs text-slate-500">Variables shared across all object instances.</p>
        </div>
      </header>

      <div className="mvpv1-global-vars-body flex-1 overflow-y-auto p-4">
        <div className="mvpv1-global-vars-grid grid grid-cols-[minmax(0,1fr)_120px_minmax(0,1fr)_40px] gap-2 text-xs text-slate-500">
          <div className="px-2 py-1 font-semibold uppercase tracking-wider">Name</div>
          <div className="px-2 py-1 font-semibold uppercase tracking-wider">Type</div>
          <div className="px-2 py-1 font-semibold uppercase tracking-wider">Initial value</div>
          <div />

          {globalVariables.map((definition) => (
            <div key={definition.id} className="mvpv1-global-vars-row contents">
              <input
                className="h-8 rounded-md border border-slate-300 bg-white px-2 text-xs text-slate-900"
                value={definition.name}
                onChange={(event) =>
                  controller.updateGlobalVariable(
                    definition.id,
                    event.target.value,
                    parseInitialValue(definition.type, formatInputValue(definition.type, definition.initialValue))
                  )
                }
              />
              <select
                className="h-8 rounded-md border border-slate-300 bg-slate-100 px-2 text-xs text-slate-600"
                value={definition.type}
                disabled
              >
                <option value={definition.type}>
                  {definition.type}
                  {(definition.type === "list" || definition.type === "map") && "itemType" in definition && definition.itemType
                    ? `<${definition.itemType}>`
                    : ""}
                </option>
              </select>
              {definition.type === "boolean" ? (
                <select
                  className="h-8 rounded-md border border-slate-300 bg-white px-2 text-xs text-slate-900"
                  value={definition.initialValue ? "true" : "false"}
                  onChange={(event) =>
                    controller.updateGlobalVariable(definition.id, definition.name, event.target.value === "true")
                  }
                >
                  <option value="true">true</option>
                  <option value="false">false</option>
                </select>
              ) : definition.type === "list" || definition.type === "map" ? (
                <textarea
                  className="min-h-14 rounded-md border border-slate-300 bg-white px-2 py-1 text-xs text-slate-900"
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
              ) : (
                <input
                  className="h-8 rounded-md border border-slate-300 bg-white px-2 text-xs text-slate-900"
                  type={definition.type === "number" ? "number" : "text"}
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
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-red-400 hover:bg-red-50 hover:text-red-600"
                onClick={() => controller.removeGlobalVariable(definition.id)}
                title="Delete global variable"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </div>
      </div>

      <footer className="mvpv1-global-vars-footer border-t border-slate-200 bg-slate-50 p-3">
        <div className="mvpv1-global-vars-create grid grid-cols-[minmax(0,1fr)_120px_minmax(0,1fr)_auto] gap-2">
          <input
            className="h-8 rounded-md border border-slate-300 bg-white px-2 text-xs text-slate-900"
            value={newVariableName}
            onChange={(event) => setNewVariableName(event.target.value)}
            placeholder="Eg: score, lives, level, coins"
          />
          <select
            className="h-8 rounded-md border border-slate-300 bg-white px-2 text-xs text-slate-900"
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
              className="h-8 rounded-md border border-slate-300 bg-white px-2 text-xs text-slate-900"
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
              className="h-8 rounded-md border border-slate-300 bg-white px-2 text-xs text-slate-900"
              value={newVariableRawValue}
              onChange={(event) => setNewVariableRawValue(event.target.value)}
            >
              <option value="true">true</option>
              <option value="false">false</option>
            </select>
          ) : newVariableType === "list" || newVariableType === "map" ? (
            <textarea
              className="min-h-14 rounded-md border border-slate-300 bg-white px-2 py-1 text-xs text-slate-900"
              value={newVariableRawValue}
              onChange={(event) => setNewVariableRawValue(event.target.value)}
              placeholder={newVariableType === "list" ? "Initial JSON list" : "Initial JSON map"}
            />
          ) : (
            <input
              className="h-8 rounded-md border border-slate-300 bg-white px-2 text-xs text-slate-900"
              type={newVariableType === "number" ? "number" : "text"}
              value={newVariableRawValue}
              onChange={(event) => setNewVariableRawValue(event.target.value)}
              placeholder="Initial value"
            />
          )}
          <Button
            className="h-8 text-xs"
            onClick={() =>
              controller.addGlobalVariable(
                newVariableName,
                newVariableType,
                parseInitialValue(newVariableType, newVariableRawValue, newVariableItemType),
                newVariableType === "list" || newVariableType === "map" ? newVariableItemType : undefined
              )
            }
            disabled={!newVariableName.trim() || globalNames.has(newVariableName.trim().toLocaleLowerCase())}
          >
            <Plus className="mr-2 h-3.5 w-3.5" />
            Add global
          </Button>
        </div>
      </footer>
    </section>
  )
}
