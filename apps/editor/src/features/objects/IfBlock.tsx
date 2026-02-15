import { Plus, Trash } from "lucide-react"
import { useState } from "react"
import { Button } from "../../components/ui/button.js"
import {
  ACTION_DISPLAY_NAMES,
  OBJECT_ACTION_TYPES,
  type IfCondition,
  type ObjectEventItem,
  type ObjectActionDraft,
  type ObjectActionType,
  type ObjectIfBlockItem
} from "../editor-state/types.js"
import { ActionBlock } from "./ActionBlock.js"
import type { ProjectV1 } from "@creadordejocs/project-format"
import { buildDefaultIfCondition, coerceIfConditionRightValue } from "./if-condition-utils.js"

type IfBlockProps = {
  item: ObjectIfBlockItem
  selectableTargetObjects: { id: string; name: string }[]
  sounds: { id: string; name: string }[]
  globalVariables: ProjectV1["variables"]["global"]
  selectedObjectVariables: ProjectV1["variables"]["global"]
  objectVariablesByObjectId: ProjectV1["variables"]["objectByObjectId"]
  roomInstances: ProjectV1["rooms"][number]["instances"]
  allObjects: ProjectV1["objects"]
  rooms: ProjectV1["rooms"]
  onUpdateIfCondition: (ifBlockId: string, condition: IfCondition) => void
  onRemoveIfBlock: (ifBlockId: string) => void
  onAddIfBlock: (condition: IfCondition, parentIfBlockId?: string, parentBranch?: "then" | "else") => void
  onAddIfAction: (ifBlockId: string, type: ObjectActionType, branch: "then" | "else") => void
  onUpdateIfAction: (ifBlockId: string, actionId: string, action: ObjectActionDraft, branch: "then" | "else") => void
  onRemoveIfAction: (ifBlockId: string, actionId: string, branch: "then" | "else") => void
}

function BranchAddButton({
  branch,
  onAdd
}: {
  branch: "then" | "else"
  onAdd: (type: ObjectActionType) => void
}) {
  const [isOpen, setIsOpen] = useState(false)
  const [selectedType, setSelectedType] = useState<ObjectActionType>(OBJECT_ACTION_TYPES[0] ?? "move")

  if (!isOpen) {
    return (
      <button
        type="button"
        className="if-block-branch-add-toggle flex items-center gap-1 mt-1 px-2 py-1.5 text-[10px] text-slate-500 rounded border border-dashed border-slate-300 hover:text-amber-600 hover:border-amber-300 hover:bg-amber-50 transition-colors"
        onClick={() => setIsOpen(true)}
      >
        <Plus className="h-3 w-3" />
        Add {branch} action
      </button>
    )
  }

  return (
    <div className="if-block-branch-add-picker flex items-center gap-2 mt-1">
      <select
        className="if-block-branch-add-select h-7 flex-1 rounded border border-amber-200 bg-white px-2 text-xs text-slate-600 focus:border-amber-400 focus:outline-none"
        value={selectedType}
        onChange={(event) => setSelectedType(event.target.value as ObjectActionType)}
        autoFocus
      >
        {OBJECT_ACTION_TYPES.map((type) => (
          <option key={`${branch}-${type}`} value={type}>
            {ACTION_DISPLAY_NAMES[type]}
          </option>
        ))}
      </select>
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="if-block-branch-add-confirm h-7 px-3 text-xs border-amber-200 text-amber-700 hover:bg-amber-50"
        onClick={() => {
          onAdd(selectedType)
          setIsOpen(false)
        }}
      >
        Add
      </Button>
      <button
        type="button"
        className="if-block-branch-add-cancel text-[10px] text-slate-400 hover:text-slate-600 px-1"
        onClick={() => setIsOpen(false)}
      >
        Cancel
      </button>
    </div>
  )
}

export function IfBlock({
  item,
  selectableTargetObjects,
  sounds,
  globalVariables,
  selectedObjectVariables,
  objectVariablesByObjectId,
  roomInstances,
  allObjects,
  rooms,
  onUpdateIfCondition,
  onRemoveIfBlock,
  onAddIfBlock,
  onAddIfAction,
  onUpdateIfAction,
  onRemoveIfAction
}: IfBlockProps) {
  const variableSource = item.condition.left.scope === "global" ? globalVariables : selectedObjectVariables
  const selectedVariable = variableSource.find((variable) => variable.id === item.condition.left.variableId)
  const selectedType = selectedVariable?.type ?? "number"
  const defaultIfCondition = buildDefaultIfCondition(globalVariables, selectedObjectVariables)

  const renderBranchItems = (branch: "then" | "else", items: ObjectEventItem[]) => {
    return items.map((branchItem, branchIndex) => {
      if (branchItem.type === "action") {
        return (
          <ActionBlock
            key={`${branch}-${branchItem.id}`}
            action={branchItem.action}
            index={branchIndex}
            isFirst={branchIndex === 0}
            isLast={branchIndex === items.length - 1}
            onUpdate={(updatedAction) => onUpdateIfAction(item.id, branchItem.action.id, updatedAction, branch)}
            onMoveUp={() => undefined}
            onMoveDown={() => undefined}
            onRemove={() => onRemoveIfAction(item.id, branchItem.action.id, branch)}
            selectableObjects={selectableTargetObjects}
            sounds={sounds}
            globalVariables={globalVariables}
            objectVariablesByObjectId={objectVariablesByObjectId}
            roomInstances={roomInstances}
            allObjects={allObjects}
            rooms={rooms}
          />
        )
      }
      return (
        <IfBlock
          key={`${branch}-${branchItem.id}`}
          item={branchItem}
          selectableTargetObjects={selectableTargetObjects}
          sounds={sounds}
          globalVariables={globalVariables}
          selectedObjectVariables={selectedObjectVariables}
          objectVariablesByObjectId={objectVariablesByObjectId}
          roomInstances={roomInstances}
          allObjects={allObjects}
          rooms={rooms}
          onUpdateIfCondition={onUpdateIfCondition}
          onRemoveIfBlock={onRemoveIfBlock}
          onAddIfBlock={onAddIfBlock}
          onAddIfAction={onAddIfAction}
          onUpdateIfAction={onUpdateIfAction}
          onRemoveIfAction={onRemoveIfAction}
        />
      )
    })
  }

  return (
    <div className="if-block-container flex flex-col rounded-lg border border-amber-200 bg-white shadow-sm overflow-hidden">
      {/* IF header with condition */}
      <div className="if-block-header flex items-center justify-between bg-amber-50 px-3 py-2 border-b border-amber-100">
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-amber-700 uppercase tracking-wider">If</span>

          <select
            className="if-block-scope-select h-6 rounded border border-amber-200 bg-white px-2 text-xs focus:border-amber-400 focus:outline-none"
            value={item.condition.left.scope}
            onChange={(event) => {
              const nextScope = event.target.value as "global" | "object"
              const nextSource = nextScope === "global" ? globalVariables : selectedObjectVariables
              const firstVariable = nextSource[0]
              if (!firstVariable) return
              onUpdateIfCondition(item.id, {
                left: { scope: nextScope, variableId: firstVariable.id },
                operator: item.condition.operator,
                right: firstVariable.initialValue
              })
            }}
          >
            <option value="global">Global</option>
            <option value="object">Objecte</option>
          </select>

          <select
            className="if-block-variable-select h-6 rounded border border-amber-200 bg-white px-2 text-xs focus:border-amber-400 focus:outline-none"
            value={item.condition.left.variableId}
            onChange={(event) => {
              const nextVariable = variableSource.find((variable) => variable.id === event.target.value)
              if (!nextVariable) return
              onUpdateIfCondition(item.id, {
                left: { scope: item.condition.left.scope, variableId: nextVariable.id },
                operator: item.condition.operator,
                right: nextVariable.initialValue
              })
            }}
          >
            {variableSource.map((variable) => (
              <option key={variable.id} value={variable.id}>
                {variable.name}
              </option>
            ))}
          </select>

          <select
            className="if-block-operator-select h-6 w-12 text-center font-mono rounded border border-amber-200 bg-white px-1 text-xs focus:border-amber-400 focus:outline-none"
            value={item.condition.operator}
            onChange={(event) =>
              onUpdateIfCondition(item.id, {
                ...item.condition,
                operator: event.target.value as IfCondition["operator"]
              })
            }
          >
            <option value="==">==</option>
            <option value="!=">!=</option>
            <option value=">">&gt;</option>
            <option value=">=">&gt;=</option>
            <option value="<">&lt;</option>
            <option value="<=">&lt;=</option>
          </select>

          {selectedType === "boolean" ? (
            <select
              className="if-block-value-bool h-6 rounded border border-amber-200 bg-white px-2 text-xs focus:border-amber-400 focus:outline-none"
              value={String(item.condition.right)}
              onChange={(event) =>
                onUpdateIfCondition(item.id, {
                  ...item.condition,
                  right: event.target.value === "true"
                })
              }
            >
              <option value="true">true</option>
              <option value="false">false</option>
            </select>
          ) : (
            <input
              className="if-block-value-input h-6 w-20 rounded border border-amber-200 bg-white px-2 text-xs focus:border-amber-400 focus:outline-none"
              type={selectedType === "number" ? "number" : "text"}
              value={String(item.condition.right)}
              onChange={(event) =>
                onUpdateIfCondition(item.id, {
                  ...item.condition,
                  right:
                    selectedType === "number"
                      ? coerceIfConditionRightValue("number", event.target.value)
                      : coerceIfConditionRightValue("string", event.target.value)
                })
              }
            />
          )}
        </div>

        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="if-block-remove h-6 w-6 text-amber-400 hover:text-red-500 hover:bg-red-50"
          onClick={() => onRemoveIfBlock(item.id)}
          title="Remove if block"
        >
          <Trash className="h-3.5 w-3.5" />
        </Button>
      </div>

      {/* THEN branch */}
      <div className="if-block-then-branch px-3 pt-2 pb-1">
        <span className="text-[10px] font-bold text-amber-600 uppercase tracking-wider">Then</span>
        <div className="flex flex-col gap-2 mt-1.5">
          {renderBranchItems("then", item.thenActions)}
          <BranchAddButton
            branch="then"
            onAdd={(type) => onAddIfAction(item.id, type, "then")}
          />
          <button
            type="button"
            className="if-block-branch-add-if-toggle flex items-center gap-1 mt-1 px-2 py-1.5 text-[10px] text-slate-500 rounded border border-dashed border-slate-300 hover:text-amber-600 hover:border-amber-300 hover:bg-amber-50 transition-colors"
            disabled={!defaultIfCondition}
            onClick={() => {
              if (defaultIfCondition) {
                onAddIfBlock(defaultIfCondition, item.id, "then")
              }
            }}
          >
            <Plus className="h-3 w-3" />
            Add then if
          </button>
        </div>
      </div>

      {/* ELSE branch */}
      <div className="if-block-else-branch px-3 pt-2 pb-2">
        <span className="text-[10px] font-bold text-amber-600 uppercase tracking-wider">Else</span>
        <div className="flex flex-col gap-2 mt-1.5">
          {renderBranchItems("else", item.elseActions)}
          <BranchAddButton
            branch="else"
            onAdd={(type) => onAddIfAction(item.id, type, "else")}
          />
          <button
            type="button"
            className="if-block-branch-add-if-toggle flex items-center gap-1 mt-1 px-2 py-1.5 text-[10px] text-slate-500 rounded border border-dashed border-slate-300 hover:text-amber-600 hover:border-amber-300 hover:bg-amber-50 transition-colors"
            disabled={!defaultIfCondition}
            onClick={() => {
              if (defaultIfCondition) {
                onAddIfBlock(defaultIfCondition, item.id, "else")
              }
            }}
          >
            <Plus className="h-3 w-3" />
            Add else if
          </button>
        </div>
      </div>
    </div>
  )
}
