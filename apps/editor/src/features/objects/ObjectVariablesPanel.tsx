import { Plus, X } from "lucide-react"
import { useMemo, useState } from "react"
import type { VariableType, VariableValue } from "@creadordejocs/project-format"
import { Button } from "../../components/ui/button.js"

type ObjectVariablesPanelProps = {
  objectId: string
  variables: {
    id: string
    name: string
    type: VariableType
    initialValue: VariableValue
  }[]
  onAddVariable: (objectId: string, name: string, type: VariableType, initialValue: VariableValue) => void
  onUpdateVariable: (objectId: string, variableId: string, name: string, initialValue: VariableValue) => void
  onRemoveVariable: (objectId: string, variableId: string) => void
}

function parseInitialValue(type: VariableType, rawValue: string): VariableValue {
  if (type === "number") {
    const parsed = Number(rawValue)
    return Number.isFinite(parsed) ? parsed : 0
  }
  if (type === "boolean") {
    return rawValue === "true"
  }
  return rawValue
}

function formatInputValue(type: VariableType, value: VariableValue): string {
  if (type === "boolean") {
    return value ? "true" : "false"
  }
  return String(value)
}

export function ObjectVariablesPanel({
  objectId,
  variables,
  onAddVariable,
  onUpdateVariable,
  onRemoveVariable
}: ObjectVariablesPanelProps) {
  const [newVariableName, setNewVariableName] = useState("local_value")
  const [newVariableType, setNewVariableType] = useState<VariableType>("number")
  const [newVariableRawValue, setNewVariableRawValue] = useState("0")
  const variableNames = useMemo(
    () => new Set(variables.map((definition) => definition.name.trim().toLocaleLowerCase())),
    [variables]
  )

  return (
    <aside className="mvpv1-object-vars-panel flex w-[260px] flex-col border-r border-slate-200 bg-slate-50">
      <div className="mvpv1-object-vars-header border-b border-slate-200 p-3">
        <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Object Variables</p>
      </div>

      <div className="mvpv1-object-vars-list flex-1 space-y-2 overflow-y-auto p-3">
        {variables.length === 0 ? (
          <p className="rounded border border-dashed border-slate-300 bg-white p-2 text-[11px] text-slate-500">
            No variables defined for this object.
          </p>
        ) : (
          variables.map((definition) => (
            <div key={definition.id} className="mvpv1-object-vars-row rounded border border-slate-200 bg-white p-2">
              <div className="mb-2 flex items-center justify-between">
                <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">{definition.type}</span>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 text-red-400 hover:bg-red-50 hover:text-red-600"
                  onClick={() => onRemoveVariable(objectId, definition.id)}
                  title="Delete object variable"
                >
                  <X className="h-3.5 w-3.5" />
                </Button>
              </div>
              <div className="space-y-2">
                <input
                  className="h-7 w-full rounded border border-slate-300 px-2 text-xs"
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
                {definition.type === "boolean" ? (
                  <select
                    className="h-7 w-full rounded border border-slate-300 px-2 text-xs"
                    value={String(definition.initialValue)}
                    onChange={(event) =>
                      onUpdateVariable(objectId, definition.id, definition.name, event.target.value === "true")
                    }
                  >
                    <option value="true">true</option>
                    <option value="false">false</option>
                  </select>
                ) : (
                  <input
                    className="h-7 w-full rounded border border-slate-300 px-2 text-xs"
                    type={definition.type === "number" ? "number" : "text"}
                    value={formatInputValue(definition.type, definition.initialValue)}
                    onChange={(event) =>
                      onUpdateVariable(
                        objectId,
                        definition.id,
                        definition.name,
                        parseInitialValue(definition.type, event.target.value)
                      )
                    }
                  />
                )}
              </div>
            </div>
          ))
        )}
      </div>

      <div className="mvpv1-object-vars-create border-t border-slate-200 bg-white p-3">
        <div className="space-y-2">
          <input
            className="h-7 w-full rounded border border-slate-300 px-2 text-xs"
            value={newVariableName}
            onChange={(event) => setNewVariableName(event.target.value)}
            placeholder="Variable name"
          />
          <div className="grid grid-cols-2 gap-2">
            <select
              className="h-7 rounded border border-slate-300 px-2 text-xs"
              value={newVariableType}
              onChange={(event) => {
                const nextType = event.target.value as VariableType
                setNewVariableType(nextType)
                setNewVariableRawValue(nextType === "boolean" ? "false" : nextType === "number" ? "0" : "")
              }}
            >
              <option value="number">number</option>
              <option value="string">string</option>
              <option value="boolean">boolean</option>
            </select>
            {newVariableType === "boolean" ? (
              <select
                className="h-7 rounded border border-slate-300 px-2 text-xs"
                value={newVariableRawValue}
                onChange={(event) => setNewVariableRawValue(event.target.value)}
              >
                <option value="true">true</option>
                <option value="false">false</option>
              </select>
            ) : (
              <input
                className="h-7 rounded border border-slate-300 px-2 text-xs"
                type={newVariableType === "number" ? "number" : "text"}
                value={newVariableRawValue}
                onChange={(event) => setNewVariableRawValue(event.target.value)}
              />
            )}
          </div>
          <Button
            className="h-7 w-full text-xs"
            onClick={() =>
              onAddVariable(objectId, newVariableName, newVariableType, parseInitialValue(newVariableType, newVariableRawValue))
            }
            disabled={!newVariableName.trim() || variableNames.has(newVariableName.trim().toLocaleLowerCase())}
          >
            <Plus className="mr-2 h-3.5 w-3.5" />
            Add object variable
          </Button>
        </div>
      </div>
    </aside>
  )
}
