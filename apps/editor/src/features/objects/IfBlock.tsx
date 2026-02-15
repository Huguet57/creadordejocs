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
import { buildDefaultIfCondition } from "./if-condition-utils.js"
import { VariablePicker, type ObjectVariableOption } from "./VariablePicker.js"
import { RightValuePicker } from "./RightValuePicker.js"

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

type ComparisonIfCondition = Extract<IfCondition, { left: { scope: "global" | "object"; variableId: string } }>
type CompoundIfCondition = { logic: "AND" | "OR"; conditions: IfCondition[] }
function isComparisonIfCondition(condition: IfCondition): condition is ComparisonIfCondition {
  return "left" in condition
}

function isCompoundIfCondition(condition: IfCondition): condition is CompoundIfCondition {
  return "logic" in condition
}

function getFallbackComparisonCondition(defaultCondition: IfCondition | null): ComparisonIfCondition {
  if (defaultCondition && isComparisonIfCondition(defaultCondition)) {
    return defaultCondition
  }
  return {
    left: { scope: "global", variableId: "" },
    operator: "==",
    right: 0
  }
}

function ensureComparisonIfCondition(
  condition: IfCondition | undefined,
  fallbackCondition: ComparisonIfCondition
): ComparisonIfCondition {
  if (condition && isComparisonIfCondition(condition)) {
    return condition
  }
  return fallbackCondition
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
        className="if-block-branch-add-select h-7 flex-1 rounded border border-slate-200 bg-white px-2 text-xs text-slate-600 focus:border-blue-400 focus:outline-none"
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
        className="if-block-branch-add-confirm h-7 px-3 text-xs border-slate-200 text-slate-600 hover:bg-slate-50"
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
  const defaultIfCondition = buildDefaultIfCondition(globalVariables, selectedObjectVariables)
  const fallbackComparisonCondition = getFallbackComparisonCondition(defaultIfCondition)
  const isSingleCondition = isComparisonIfCondition(item.condition)
  const compoundCondition = isCompoundIfCondition(item.condition) ? item.condition : null
  const currentPrimaryCondition = isComparisonIfCondition(item.condition)
    ? item.condition
    : ensureComparisonIfCondition(item.condition.conditions[0], fallbackComparisonCondition)

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

  const renderComparisonConditionEditor = (
    condition: ComparisonIfCondition,
    onChange: (nextCondition: ComparisonIfCondition) => void
  ) => {
    const variableSource = condition.left.scope === "global" ? globalVariables : selectedObjectVariables
    const selectedVariable = variableSource.find((variable) => variable.id === condition.left.variableId)
    const selectedType = selectedVariable?.type ?? "number"

    return (
      <>
        <VariablePicker
          scope={condition.left.scope}
          variableId={condition.left.variableId}
          globalVariables={globalVariables}
          objectVariables={objectVarOptionsForPicker}
          variant="blue"
          onChange={(nextScope, nextVariableId) => {
            const nextSource = nextScope === "global" ? globalVariables : selectedObjectVariables
            const nextVariable = nextSource.find((v) => v.id === nextVariableId)
            if (!nextVariable) return
            onChange({
              left: { scope: nextScope, variableId: nextVariableId },
              operator: condition.operator,
              right: nextVariable.initialValue
            })
          }}
        />

        <select
          className="if-block-operator-select h-7 w-14 text-center font-mono rounded border border-blue-200 bg-white px-2 text-xs focus:border-blue-400 focus:outline-none"
          value={condition.operator}
          onChange={(event) =>
            onChange({
              ...condition,
              operator: event.target.value as ComparisonIfCondition["operator"]
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

        <RightValuePicker
          value={condition.right}
          leftVariableType={selectedType}
          globalVariables={globalVariables}
          objectVariables={objectVarOptionsForPicker}
          variant="blue"
          onChange={(nextRight) =>
            onChange({
              ...condition,
              right: nextRight
            })
          }
        />
      </>
    )
  }

  const handleAddCondition = () => {
    const secondaryCondition = defaultIfCondition
      ? ensureComparisonIfCondition(defaultIfCondition, fallbackComparisonCondition)
      : fallbackComparisonCondition
    onUpdateIfCondition(item.id, {
      logic: "AND",
      conditions: [currentPrimaryCondition, secondaryCondition]
    })
  }

  const handleRemoveSecondCondition = () => {
    onUpdateIfCondition(item.id, currentPrimaryCondition)
  }

  return (
    <div className="if-block-container bg-white">
      {/* First condition row: IF [...condition...] [+] [trash] */}
      <div className="if-block-header group flex items-center gap-2 py-2 px-3 bg-blue-100 border-b border-blue-200">
        <span className="text-[11px] font-bold text-blue-700 uppercase tracking-wider shrink-0">IF</span>

        {renderComparisonConditionEditor(currentPrimaryCondition, (nextCondition) => {
          if (compoundCondition) {
            const nextConditions = [...compoundCondition.conditions]
            nextConditions[0] = nextCondition
            onUpdateIfCondition(item.id, { ...compoundCondition, conditions: nextConditions })
          } else {
            onUpdateIfCondition(item.id, nextCondition)
          }
        })}

        {isSingleCondition && (
          <button
            type="button"
            className="if-block-add-condition h-6 w-6 flex items-center justify-center rounded text-blue-400 hover:text-blue-600 hover:bg-blue-50 transition-colors shrink-0"
            onClick={handleAddCondition}
            title="Afegir condició AND/OR"
          >
            <Plus className="h-3.5 w-3.5" />
          </button>
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

      {/* AND/OR row + second condition (only when compound) */}
      {compoundCondition && (
        <div className="if-block-compound-second group flex items-center gap-2 py-2 px-3 bg-blue-100 border-b border-blue-200">
          <select
            className="if-block-logic-select h-5 rounded border border-blue-300 bg-blue-50 px-1.5 text-[11px] font-bold text-blue-700 uppercase tracking-wider focus:border-blue-400 focus:outline-none shrink-0"
            value={compoundCondition.logic}
            onChange={(event) =>
              onUpdateIfCondition(item.id, {
                ...compoundCondition,
                logic: event.target.value as "AND" | "OR"
              })
            }
          >
            <option value="AND">AND</option>
            <option value="OR">OR</option>
          </select>

          {renderComparisonConditionEditor(
            ensureComparisonIfCondition(compoundCondition.conditions[1], fallbackComparisonCondition),
            (nextCondition) => {
              const nextConditions = [...compoundCondition.conditions]
              if (nextConditions.length < 2) {
                nextConditions.push(fallbackComparisonCondition)
              }
              nextConditions[1] = nextCondition
              onUpdateIfCondition(item.id, { ...compoundCondition, conditions: nextConditions })
            }
          )}

          <button
            type="button"
            className="if-block-remove-second h-6 w-6 flex items-center justify-center rounded text-slate-300 hover:text-red-500 hover:bg-red-50 opacity-0 group-hover:opacity-100 transition-opacity ml-auto shrink-0"
            onClick={handleRemoveSecondCondition}
            title="Treure segona condició"
          >
            <Trash className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

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
