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
import { VariablePicker, type ObjectVariableOption } from "./VariablePicker.js"

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
        className="if-block-branch-add-toggle flex items-center gap-1 px-2 py-1 text-[10px] text-slate-400 rounded hover:text-blue-600 hover:bg-blue-50 transition-colors"
        onClick={() => setIsOpen(true)}
      >
        <Plus className="h-3 w-3" />
        Add action
      </button>
    )
  }

  return (
    <div className="if-block-branch-add-picker flex items-center gap-2">
      <select
        className="if-block-branch-add-select h-6 flex-1 rounded border border-slate-200 bg-white px-2 text-xs text-slate-600 focus:border-blue-400 focus:outline-none"
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
        className="if-block-branch-add-confirm h-6 px-3 text-xs border-slate-200 text-slate-600 hover:bg-slate-50"
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

  const objectVarOptionsForPicker: ObjectVariableOption[] = selectedObjectVariables.map((v) => ({
    id: v.id,
    label: v.name,
    type: v.type,
    objectName: ""
  }))

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
    <div className="if-block-container bg-white">
      {/* IF condition row */}
      <div className="if-block-header group flex items-center gap-2 py-2 px-3 bg-blue-100 border-b border-blue-200">
        <span className="text-[11px] font-bold text-blue-700 uppercase tracking-wider shrink-0">IF</span>

        <VariablePicker
          scope={item.condition.left.scope}
          variableId={item.condition.left.variableId}
          globalVariables={globalVariables}
          objectVariables={objectVarOptionsForPicker}
          variant="blue"
          onChange={(nextScope, nextVariableId) => {
            const nextSource = nextScope === "global" ? globalVariables : selectedObjectVariables
            const nextVariable = nextSource.find((v) => v.id === nextVariableId)
            if (!nextVariable) return
            onUpdateIfCondition(item.id, {
              left: { scope: nextScope, variableId: nextVariableId },
              operator: item.condition.operator,
              right: nextVariable.initialValue
            })
          }}
        />

        <select
          className="if-block-operator-select h-6 w-12 text-center font-mono rounded border border-blue-200 bg-white px-1 text-xs focus:border-blue-400 focus:outline-none"
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
            className="if-block-value-bool h-6 rounded border border-blue-200 bg-white px-2 text-xs focus:border-blue-400 focus:outline-none"
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
            className="if-block-value-input h-6 w-20 rounded border border-blue-200 bg-white px-2 text-xs focus:border-blue-400 focus:outline-none"
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

        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="if-block-remove h-6 w-6 text-slate-300 hover:text-red-500 hover:bg-red-50 opacity-0 group-hover:opacity-100 transition-opacity ml-auto shrink-0"
          onClick={() => onRemoveIfBlock(item.id)}
          title="Remove if block"
        >
          <Trash className="h-3.5 w-3.5" />
        </Button>
      </div>

      {/* THEN content — indented with left border */}
      <div className="if-block-then-branch border-l-2 border-blue-200 ml-3 pl-3">
        <div className="flex flex-col gap-px bg-slate-200">
          {renderBranchItems("then", item.thenActions)}
        </div>
        <div className="if-block-then-add-row flex items-center gap-2 px-3 py-1.5">
          <BranchAddButton
            branch="then"
            onAdd={(type) => onAddIfAction(item.id, type, "then")}
          />
          <button
            type="button"
            className="if-block-branch-add-if-toggle flex items-center gap-1 px-2 py-1 text-[10px] text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"
            disabled={!defaultIfCondition}
            onClick={() => {
              if (defaultIfCondition) {
                onAddIfBlock(defaultIfCondition, item.id, "then")
              }
            }}
          >
            <Plus className="h-3 w-3" />
            Add if block
          </button>
        </div>
      </div>

      {/* ELSE label */}
      <div className="if-block-else-label py-2 px-3 bg-blue-50 border-t border-b border-blue-200">
        <span className="text-[11px] font-bold text-blue-500 uppercase tracking-wider">ELSE</span>
      </div>

      {/* ELSE content — indented with left border */}
      <div className="if-block-else-branch border-l-2 border-blue-200 ml-3 pl-3">
        <div className="flex flex-col gap-px bg-slate-200">
          {renderBranchItems("else", item.elseActions)}
        </div>
        <div className="if-block-else-add-row flex items-center gap-2 px-3 py-1.5">
          <BranchAddButton
            branch="else"
            onAdd={(type) => onAddIfAction(item.id, type, "else")}
          />
          <button
            type="button"
            className="if-block-branch-add-if-toggle flex items-center gap-1 px-2 py-1 text-[10px] text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"
            disabled={!defaultIfCondition}
            onClick={() => {
              if (defaultIfCondition) {
                onAddIfBlock(defaultIfCondition, item.id, "else")
              }
            }}
          >
            <Plus className="h-3 w-3" />
            Add if block
          </button>
        </div>
      </div>
    </div>
  )
}
