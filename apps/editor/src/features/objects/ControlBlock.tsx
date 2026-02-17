import { Plus, Trash, X, GitBranch, RotateCcw, List, Map } from "lucide-react"
import { useEffect, useRef, useState } from "react"
import { Button } from "../../components/ui/button.js"
import {
  type IfCondition,
  type ObjectEventItem,
  type ObjectActionDraft,
  type ObjectEventType
} from "../editor-state/types.js"
import { ActionBlock } from "./ActionBlock.js"
import type { ProjectV1, ValueExpression, ObjectControlBlockItem } from "@creadordejocs/project-format"
import { generateUUID } from "@creadordejocs/project-format"
import { buildDefaultIfCondition } from "./if-condition-utils.js"
import { type ObjectVariableOption } from "./VariablePicker.js"
import { RightValuePicker } from "./RightValuePicker.js"
import { CollectionVariablePicker } from "./CollectionVariablePicker.js"
import type { ActionDropTarget } from "./action-dnd.js"

type ControlBlockProps = {
  item: ObjectControlBlockItem
  selectableTargetObjects: { id: string; name: string }[]
  globalVariables: ProjectV1["variables"]["global"]
  selectedObjectVariables: ProjectV1["variables"]["global"]
  objectVariablesByObjectId: ProjectV1["variables"]["objectByObjectId"]
  roomInstances: ProjectV1["rooms"][number]["instances"]
  allObjects: ProjectV1["objects"]
  rooms: ProjectV1["rooms"]
  eventType: ObjectEventType
  collisionTargetName?: string | null | undefined
  onUpdateBlock: (blockId: string, updates: Partial<ObjectControlBlockItem>) => void
  onUpdateIfCondition: (ifBlockId: string, condition: IfCondition) => void
  onRemoveBlock: (blockId: string) => void
  onAddBlock: (block: ObjectControlBlockItem, parentBlockId?: string, parentBranch?: "then" | "else") => void
  onOpenActionPickerForBranch: (blockId: string, branch: "then" | "else") => void
  onMoveAction: (actionId: string, direction: "up" | "down") => void
  onCopyAction: (actionId: string) => void
  onPasteAfterAction: (actionId: string) => void
  canPasteAction: boolean
  onCopyBlock: (blockId: string) => void
  onPasteAfterBlock: (blockId: string) => void
  onUpdateBlockAction: (blockId: string, actionId: string, action: ObjectActionDraft, branch: "then" | "else") => void
  onRemoveBlockAction: (blockId: string, actionId: string, branch: "then" | "else") => void
  draggedActionId: string | null
  dropTarget: ActionDropTarget | null
  onDragStartAction: (actionId: string) => void
  onDragOverAction: (target: ActionDropTarget) => void
  onDropOnAction: (target: ActionDropTarget) => void
  onDragEndAction: () => void
  iterationVariables?: { name: string; type: "number" | "string" | "boolean" }[]
}

type BlockContextMenuState = { x: number; y: number } | null

type ComparisonIfCondition = Extract<IfCondition, { left: ValueExpression }>
type CompoundIfCondition = { logic: "AND" | "OR"; conditions: IfCondition[] }

function isComparisonIfCondition(condition: IfCondition): condition is ComparisonIfCondition {
  return "left" in condition
}

function isCompoundIfCondition(condition: IfCondition): condition is CompoundIfCondition {
  return "logic" in condition
}

function getFallbackComparisonCondition(defaultCondition: IfCondition | null): ComparisonIfCondition {
  if (defaultCondition && isComparisonIfCondition(defaultCondition)) return defaultCondition
  return { left: { scope: "global", variableId: "" }, operator: "==", right: 0 }
}

function ensureComparisonIfCondition(
  condition: IfCondition | undefined,
  fallback: ComparisonIfCondition
): ComparisonIfCondition {
  if (condition && isComparisonIfCondition(condition)) return condition
  return fallback
}

function getLeftValueExpectedType(
  left: ComparisonIfCondition["left"],
  globalVariables: ProjectV1["variables"]["global"],
  selectedObjectVariables: ProjectV1["variables"]["global"]
): "number" | "string" | "boolean" {
  const asScalarType = (type: ProjectV1["variables"]["global"][number]["type"] | undefined): "number" | "string" | "boolean" =>
    type === "string" || type === "boolean" || type === "number" ? type : "number"
  if (typeof left === "object" && left !== null && "scope" in left && "variableId" in left && !("source" in left)) {
    const source = left.scope === "global" ? globalVariables : selectedObjectVariables
    return asScalarType(source.find((v) => v.id === left.variableId)?.type)
  }
  if (typeof left !== "object" || left === null || !("source" in left)) return "number"
  if (left.source === "mouseAttribute") return "number"
  if (left.source === "attribute") return "number"
  if (left.source === "globalVariable") return asScalarType(globalVariables.find((v) => v.id === left.variableId)?.type)
  if (left.source === "internalVariable") return asScalarType(selectedObjectVariables.find((v) => v.id === left.variableId)?.type)
  return "number"
}

function getDefaultRightValueForType(type: "number" | "string" | "boolean"): ComparisonIfCondition["right"] {
  if (type === "boolean") return false
  if (type === "string") return ""
  return 0
}

function isFlowBlockType(type: string): type is "repeat" | "forEachList" | "forEachMap" {
  return type === "repeat" || type === "forEachList" || type === "forEachMap"
}

function getBlockColor(type: ObjectControlBlockItem["type"]): { bg: string; border: string; text: string; borderLeft: string; labelBg: string } {
  if (type === "if") {
    return { bg: "bg-blue-100", border: "border-blue-200", text: "text-blue-700", borderLeft: "border-blue-200", labelBg: "bg-blue-50" }
  }
  return { bg: "bg-purple-100", border: "border-purple-200", text: "text-purple-700", borderLeft: "border-purple-200", labelBg: "bg-purple-50" }
}

function getBlockLabel(type: ObjectControlBlockItem["type"]): string {
  if (type === "if") return "IF"
  if (type === "repeat") return "REPEAT"
  if (type === "forEachList") return "EACH LLISTA"
  if (type === "forEachMap") return "EACH MAPA"
  return type
}

function getNextLocalVariableName(baseName: string, existingNames: string[]): string {
  const escapedBaseName = baseName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
  const matcher = new RegExp(`^${escapedBaseName}(\\d+)?$`)
  let highestSuffix = 0
  for (const existingName of existingNames) {
    const match = matcher.exec(existingName)
    if (!match) continue
    const suffix = match[1] ? Number(match[1]) : 1
    highestSuffix = Math.max(highestSuffix, suffix)
  }
  return highestSuffix === 0 ? baseName : `${baseName}${highestSuffix + 1}`
}

export function ControlBlock({
  item,
  selectableTargetObjects,
  globalVariables,
  selectedObjectVariables,
  objectVariablesByObjectId,
  roomInstances,
  allObjects,
  rooms,
  eventType,
  collisionTargetName,
  onUpdateBlock,
  onUpdateIfCondition,
  onRemoveBlock,
  onAddBlock,
  onOpenActionPickerForBranch,
  onMoveAction,
  onCopyAction,
  onPasteAfterAction,
  canPasteAction,
  onCopyBlock,
  onPasteAfterBlock,
  onUpdateBlockAction,
  onRemoveBlockAction,
  draggedActionId,
  dropTarget,
  onDragStartAction,
  onDragOverAction,
  onDropOnAction,
  onDragEndAction,
  iterationVariables = []
}: ControlBlockProps) {
  const color = getBlockColor(item.type)
  const label = getBlockLabel(item.type)

  const scalarGlobalVariables = globalVariables.filter(
    (v): v is Extract<typeof globalVariables[number], { type: "number" | "string" | "boolean" }> =>
      v.type === "number" || v.type === "string" || v.type === "boolean"
  )
  const scalarSelectedObjectVariables = selectedObjectVariables.filter(
    (v): v is Extract<typeof selectedObjectVariables[number], { type: "number" | "string" | "boolean" }> =>
      v.type === "number" || v.type === "string" || v.type === "boolean"
  )
  const defaultIfCondition = buildDefaultIfCondition(scalarGlobalVariables, scalarSelectedObjectVariables)

  const objectVarOptionsForPicker: ObjectVariableOption[] = scalarSelectedObjectVariables.map((v) => ({
    id: v.id, label: v.name, type: v.type, objectName: ""
  }))

  const allowOtherTarget = eventType === "Collision"

  const listGlobalOptions = globalVariables.filter(
    (d): d is Extract<typeof globalVariables[number], { type: "list" }> => d.type === "list"
  )
  const mapGlobalOptions = globalVariables.filter(
    (d): d is Extract<typeof globalVariables[number], { type: "map" }> => d.type === "map"
  )
  const listObjectOptions = selectedObjectVariables.filter(
    (d): d is Extract<typeof selectedObjectVariables[number], { type: "list" }> => d.type === "list"
  )
  const mapObjectOptions = selectedObjectVariables.filter(
    (d): d is Extract<typeof selectedObjectVariables[number], { type: "map" }> => d.type === "map"
  )

  const flowIterationVariables = (() => {
    if (item.type === "repeat") {
      return [...iterationVariables, { name: "index", type: "number" as const }]
    }
    if (item.type === "forEachList") {
      const itemType = item.scope === "global"
        ? (listGlobalOptions.find((e) => e.id === item.variableId)?.itemType ?? "number")
        : (listObjectOptions.find((e) => e.id === item.variableId)?.itemType ?? "number")
      return [
        ...iterationVariables,
        { name: item.itemLocalVarName, type: itemType },
        ...(item.indexLocalVarName ? [{ name: item.indexLocalVarName, type: "number" as const }] : [])
      ]
    }
    if (item.type === "forEachMap") {
      const valueType = item.scope === "global"
        ? (mapGlobalOptions.find((e) => e.id === item.variableId)?.itemType ?? "number")
        : (mapObjectOptions.find((e) => e.id === item.variableId)?.itemType ?? "number")
      return [
        ...iterationVariables,
        { name: item.keyLocalVarName, type: "string" as const },
        { name: item.valueLocalVarName, type: valueType }
      ]
    }
    return iterationVariables
  })()

  const [contextMenu, setContextMenu] = useState<BlockContextMenuState>(null)
  const [showElseManually, setShowElseManually] = useState(false)
  const [blockPickerBranch, setBlockPickerBranch] = useState<"then" | "else" | null>(null)
  const blockPickerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!blockPickerBranch) return
    function handleMouseDown(event: MouseEvent) {
      if (blockPickerRef.current && !blockPickerRef.current.contains(event.target as Node)) {
        setBlockPickerBranch(null)
      }
    }
    document.addEventListener("mousedown", handleMouseDown)
    return () => document.removeEventListener("mousedown", handleMouseDown)
  }, [blockPickerBranch])

  function createAndAddBlock(blockType: "if" | "repeat" | "forEachList" | "forEachMap", branch: "then" | "else") {
    let block: ObjectControlBlockItem | null = null
    const availableLocalNames = (isFlowBlockType(item.type) ? flowIterationVariables : iterationVariables).map((variable) => variable.name)
    const defaultItemName = getNextLocalVariableName("item", availableLocalNames)
    const defaultIndexName = getNextLocalVariableName("index", availableLocalNames)
    const defaultKeyName = getNextLocalVariableName("key", availableLocalNames)
    const defaultValueName = getNextLocalVariableName("value", availableLocalNames)
    if (blockType === "if" && defaultIfCondition) {
      block = { id: `if-${generateUUID()}`, type: "if", condition: defaultIfCondition, thenActions: [], elseActions: [] }
    } else if (blockType === "repeat") {
      block = { id: `repeat-${generateUUID()}`, type: "repeat", count: 3, actions: [] }
    } else if (blockType === "forEachList") {
      const firstList = [...globalVariables, ...selectedObjectVariables].find((v) => v.type === "list")
      if (firstList) {
        const isGlobal = globalVariables.some((v) => v.id === firstList.id)
        block = {
          id: `forEach-${generateUUID()}`, type: "forEachList",
          scope: isGlobal ? "global" : "object", variableId: firstList.id,
          itemLocalVarName: defaultItemName, indexLocalVarName: defaultIndexName, actions: [],
          ...(isGlobal ? {} : { target: "self" })
        }
      }
    } else if (blockType === "forEachMap") {
      const firstMap = [...globalVariables, ...selectedObjectVariables].find((v) => v.type === "map")
      if (firstMap) {
        const isGlobal = globalVariables.some((v) => v.id === firstMap.id)
        block = {
          id: `forEachMap-${generateUUID()}`, type: "forEachMap",
          scope: isGlobal ? "global" : "object", variableId: firstMap.id,
          keyLocalVarName: defaultKeyName, valueLocalVarName: defaultValueName, actions: [],
          ...(isGlobal ? {} : { target: "self" })
        }
      }
    }
    if (block) {
      onAddBlock(block, item.id, branch)
    }
    setBlockPickerBranch(null)
  }
  const hasElseContent = item.type === "if" && item.elseActions.length > 0
  const elseVisible = item.type === "if" && (hasElseContent || showElseManually)

  useEffect(() => {
    if (!contextMenu) return
    const close = () => setContextMenu(null)
    window.addEventListener("mousedown", close)
    return () => window.removeEventListener("mousedown", close)
  }, [contextMenu])

  const getCanonicalBranchDropTarget = (
    items: ObjectEventItem[],
    hoveredActionId: string,
    hoveredPosition: "top" | "bottom"
  ): { actionId: string; position: "top" | "bottom" } => {
    const actionIds = items
      .filter((e) => e.type === "action")
      .map((e) => e.type === "action" ? e.action.id : "")
    const hoveredIndex = actionIds.findIndex((id) => id === hoveredActionId)
    if (hoveredIndex < 0) return { actionId: hoveredActionId, position: hoveredPosition }
    if (hoveredPosition === "bottom") {
      const nextActionId = actionIds[hoveredIndex + 1]
      if (nextActionId) return { actionId: nextActionId, position: "top" }
    }
    return { actionId: hoveredActionId, position: hoveredPosition }
  }

  const renderBranchItems = (branch: "then" | "else", items: ObjectEventItem[]) => {
    let hasDestroySelfBefore = false
    return items.map((branchItem, branchIndex) => {
      const isVisuallyUnreachable = hasDestroySelfBefore
      if (branchItem.type === "action" && branchItem.action.type === "destroySelf") {
        hasDestroySelfBefore = true
      }
      const branchItemClassName = isVisuallyUnreachable ? "control-block-unreachable-action opacity-40" : ""

      if (branchItem.type === "action") {
        return (
          <div key={`${branch}-${branchItem.id}`} className={branchItemClassName}>
            <ActionBlock
              action={branchItem.action}
              index={branchIndex}
              isFirst={branchIndex === 0}
              isLast={branchIndex === items.length - 1}
              onUpdate={(updatedAction) => onUpdateBlockAction(item.id, branchItem.action.id, updatedAction, branch)}
              onMoveUp={() => onMoveAction(branchItem.action.id, "up")}
              onMoveDown={() => onMoveAction(branchItem.action.id, "down")}
              onRemove={() => onRemoveBlockAction(item.id, branchItem.action.id, branch)}
              onCopy={() => onCopyAction(branchItem.action.id)}
              onPaste={() => onPasteAfterAction(branchItem.action.id)}
              canPaste={canPasteAction}
              selectableObjects={selectableTargetObjects}
              globalVariables={globalVariables}
              objectVariablesByObjectId={objectVariablesByObjectId}
              roomInstances={roomInstances}
              allObjects={allObjects}
              rooms={rooms}
              selectedObjectVariables={selectedObjectVariables}
              eventType={eventType}
              collisionTargetName={collisionTargetName}
              isDragging={draggedActionId === branchItem.action.id}
              dropIndicator={
                dropTarget?.targetIfBlockId === item.id &&
                dropTarget?.targetBranch === branch &&
                dropTarget?.targetActionId === branchItem.action.id
                  ? (dropTarget.position ?? null)
                  : null
              }
              onDragStartAction={onDragStartAction}
              onDragOverAction={(actionId, position) => {
                if (!draggedActionId || draggedActionId === actionId) return
                const canonical = getCanonicalBranchDropTarget(items, actionId, position)
                onDragOverAction({ targetIfBlockId: item.id, targetBranch: branch, targetActionId: canonical.actionId, position: canonical.position })
              }}
              onDropOnAction={(targetActionId, position) => {
                if (!draggedActionId) return
                const canonical = getCanonicalBranchDropTarget(items, targetActionId, position)
                onDropOnAction({ targetIfBlockId: item.id, targetBranch: branch, targetActionId: canonical.actionId, position: canonical.position })
              }}
              onDragEndAction={onDragEndAction}
              iterationVariables={isFlowBlockType(item.type) ? flowIterationVariables : iterationVariables}
            />
          </div>
        )
      }

      if (branchItem.type === "if" || branchItem.type === "repeat" || branchItem.type === "forEachList" || branchItem.type === "forEachMap") {
        return (
          <div key={`${branch}-${branchItem.id}`} className={branchItemClassName}>
            <ControlBlock
              item={branchItem}
              selectableTargetObjects={selectableTargetObjects}
              globalVariables={globalVariables}
              selectedObjectVariables={selectedObjectVariables}
              objectVariablesByObjectId={objectVariablesByObjectId}
              roomInstances={roomInstances}
              allObjects={allObjects}
              rooms={rooms}
              eventType={eventType}
              collisionTargetName={collisionTargetName}
              onUpdateBlock={onUpdateBlock}
              onUpdateIfCondition={onUpdateIfCondition}
              onRemoveBlock={onRemoveBlock}
              onAddBlock={onAddBlock}
              onOpenActionPickerForBranch={onOpenActionPickerForBranch}
              onMoveAction={onMoveAction}
              onCopyAction={onCopyAction}
              onPasteAfterAction={onPasteAfterAction}
              canPasteAction={canPasteAction}
              onCopyBlock={onCopyBlock}
              onPasteAfterBlock={onPasteAfterBlock}
              onUpdateBlockAction={onUpdateBlockAction}
              onRemoveBlockAction={onRemoveBlockAction}
              draggedActionId={draggedActionId}
              dropTarget={dropTarget}
              onDragStartAction={onDragStartAction}
              onDragOverAction={onDragOverAction}
              onDropOnAction={onDropOnAction}
              onDragEndAction={onDragEndAction}
              iterationVariables={isFlowBlockType(item.type) ? flowIterationVariables : iterationVariables}
            />
          </div>
        )
      }

      return null
    })
  }

  const isBranchEndDropTarget = (branch: "then" | "else"): boolean =>
    dropTarget?.targetIfBlockId === item.id &&
    dropTarget?.targetBranch === branch &&
    dropTarget?.targetActionId === undefined

  const renderIfHeader = () => {
    if (item.type !== "if") return null
    const isSingleCondition = isComparisonIfCondition(item.condition)
    const compoundCondition = isCompoundIfCondition(item.condition) ? item.condition : null
    const currentPrimaryCondition = isComparisonIfCondition(item.condition)
      ? item.condition
      : ensureComparisonIfCondition(item.condition.conditions[0], getFallbackComparisonCondition(defaultIfCondition))
    const fallbackComparisonCondition = getFallbackComparisonCondition(defaultIfCondition)

    const renderConditionEditor = (
      condition: ComparisonIfCondition,
      onChange: (next: ComparisonIfCondition) => void
    ) => {
      const selectedType = getLeftValueExpectedType(condition.left, globalVariables, selectedObjectVariables)
      return (
        <>
          <RightValuePicker
            value={condition.left}
            expectedType={selectedType}
            globalVariables={globalVariables}
            internalVariables={objectVarOptionsForPicker}
            filterByExpectedType={false}
            allowOtherTarget={allowOtherTarget}
            allowedSources={["globalVariable", "internalVariable", "attribute"]}
            variant="blue"
            onChange={(nextLeft) => {
              const nextType = getLeftValueExpectedType(nextLeft as ComparisonIfCondition["left"], globalVariables, selectedObjectVariables)
              onChange({ left: nextLeft as ComparisonIfCondition["left"], operator: condition.operator, right: getDefaultRightValueForType(nextType) })
            }}
          />
          <select
            className="control-block-if-operator h-7 w-14 text-center font-mono rounded border border-blue-200 bg-white px-2 text-xs focus:border-blue-400 focus:outline-none"
            value={condition.operator}
            onChange={(e) => onChange({ ...condition, operator: e.target.value as ComparisonIfCondition["operator"] })}
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
            expectedType={selectedType}
            globalVariables={globalVariables}
            internalVariables={objectVarOptionsForPicker}
            allowOtherTarget={allowOtherTarget}
            variant="blue"
            onChange={(nextRight) => onChange({ ...condition, right: nextRight })}
          />
        </>
      )
    }

    return (
      <>
        {renderConditionEditor(currentPrimaryCondition, (nextCondition) => {
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
            className="control-block-if-add-cond h-6 w-6 flex items-center justify-center rounded text-blue-400 hover:text-blue-600 hover:bg-blue-50 transition-colors shrink-0"
            onClick={() => {
              const secondaryCondition = defaultIfCondition
                ? ensureComparisonIfCondition(defaultIfCondition, fallbackComparisonCondition)
                : fallbackComparisonCondition
              onUpdateIfCondition(item.id, { logic: "AND", conditions: [currentPrimaryCondition, secondaryCondition] })
            }}
            title="Afegir condició AND/OR"
          >
            <Plus className="h-3.5 w-3.5" />
          </button>
        )}
        {compoundCondition && (
          <div className="control-block-if-compound basis-full flex items-center gap-2 py-2 px-3 bg-blue-100 border-b border-blue-200">
            <select
              className="control-block-if-logic h-5 rounded border border-blue-300 bg-blue-50 px-1.5 text-[11px] font-bold text-blue-700 uppercase tracking-wider focus:border-blue-400 focus:outline-none shrink-0"
              value={compoundCondition.logic}
              onChange={(e) => onUpdateIfCondition(item.id, { ...compoundCondition, logic: e.target.value as "AND" | "OR" })}
            >
              <option value="AND">AND</option>
              <option value="OR">OR</option>
            </select>
            {renderConditionEditor(
              ensureComparisonIfCondition(compoundCondition.conditions[1], fallbackComparisonCondition),
              (nextCondition) => {
                const nextConditions = [...compoundCondition.conditions]
                if (nextConditions.length < 2) nextConditions.push(fallbackComparisonCondition)
                nextConditions[1] = nextCondition
                onUpdateIfCondition(item.id, { ...compoundCondition, conditions: nextConditions })
              }
            )}
            <button
              type="button"
              className="control-block-if-remove-cond h-6 w-6 flex items-center justify-center rounded text-slate-300 hover:text-red-500 hover:bg-red-50 opacity-0 group-hover:opacity-100 transition-opacity ml-auto shrink-0"
              onClick={() => onUpdateIfCondition(item.id, currentPrimaryCondition)}
              title="Treure segona condició"
            >
              <Trash className="h-3.5 w-3.5" />
            </button>
          </div>
        )}
      </>
    )
  }

  const renderRepeatHeader = () => {
    if (item.type !== "repeat") return null
    return (
      <div className="control-block-repeat-field flex items-center gap-1">
        <label className="text-[10px] font-medium opacity-60">count</label>
        <RightValuePicker
          value={item.count}
          expectedType="number"
          globalVariables={globalVariables}
          internalVariables={objectVarOptionsForPicker}
          allowOtherTarget={allowOtherTarget}
          iterationVariables={iterationVariables}
          onChange={(nextValue) => onUpdateBlock(item.id, { count: nextValue } as Partial<ObjectControlBlockItem>)}
        />
      </div>
    )
  }

  const renderForEachListHeader = () => {
    if (item.type !== "forEachList") return null
    return (
      <>
        <CollectionVariablePicker
          scope={item.scope}
          variableId={item.variableId}
          collectionType="list"
          globalVariables={globalVariables}
          objectVariables={selectedObjectVariables}
          allowOtherTarget={allowOtherTarget}
          target={(item.target as "self" | "other" | null | undefined) ?? null}
          onTargetChange={(nextTarget) =>
            onUpdateBlock(item.id, { target: nextTarget } as Partial<ObjectControlBlockItem>)
          }
          variant="purple"
          onChange={(nextScope, nextVarId) =>
            onUpdateBlock(item.id, { scope: nextScope, variableId: nextVarId, ...(nextScope === "object" ? { target: "self" } : {}) } as Partial<ObjectControlBlockItem>)
          }
        />
        <input
          className="control-block-local-item h-7 w-20 rounded border border-purple-300 bg-white/50 px-2 text-xs"
          value={item.itemLocalVarName}
          onChange={(e) => {
            const nextValue = e.target.value
            if (nextValue !== "" && nextValue === (item.indexLocalVarName ?? "")) return
            onUpdateBlock(item.id, { itemLocalVarName: nextValue } as Partial<ObjectControlBlockItem>)
          }}
          placeholder="item"
        />
        <input
          className="control-block-local-index h-7 w-20 rounded border border-purple-300 bg-white/50 px-2 text-xs"
          value={item.indexLocalVarName ?? ""}
          onChange={(e) => {
            const nextValue = e.target.value
            if (nextValue !== "" && nextValue === item.itemLocalVarName) return
            onUpdateBlock(item.id, { indexLocalVarName: nextValue || undefined } as Partial<ObjectControlBlockItem>)
          }}
          placeholder="index"
        />
      </>
    )
  }

  const renderForEachMapHeader = () => {
    if (item.type !== "forEachMap") return null
    return (
      <>
        <CollectionVariablePicker
          scope={item.scope}
          variableId={item.variableId}
          collectionType="map"
          globalVariables={globalVariables}
          objectVariables={selectedObjectVariables}
          allowOtherTarget={allowOtherTarget}
          target={(item.target as "self" | "other" | null | undefined) ?? null}
          onTargetChange={(nextTarget) =>
            onUpdateBlock(item.id, { target: nextTarget } as Partial<ObjectControlBlockItem>)
          }
          variant="purple"
          onChange={(nextScope, nextVarId) =>
            onUpdateBlock(item.id, { scope: nextScope, variableId: nextVarId, ...(nextScope === "object" ? { target: "self" } : {}) } as Partial<ObjectControlBlockItem>)
          }
        />
        <input
          className="control-block-local-key h-7 w-20 rounded border border-purple-300 bg-white/50 px-2 text-xs"
          value={item.keyLocalVarName}
          onChange={(e) => {
            const nextValue = e.target.value
            if (nextValue !== "" && nextValue === item.valueLocalVarName) return
            onUpdateBlock(item.id, { keyLocalVarName: nextValue } as Partial<ObjectControlBlockItem>)
          }}
          placeholder="key"
        />
        <input
          className="control-block-local-value h-7 w-20 rounded border border-purple-300 bg-white/50 px-2 text-xs"
          value={item.valueLocalVarName}
          onChange={(e) => {
            const nextValue = e.target.value
            if (nextValue !== "" && nextValue === item.keyLocalVarName) return
            onUpdateBlock(item.id, { valueLocalVarName: nextValue } as Partial<ObjectControlBlockItem>)
          }}
          placeholder="value"
        />
      </>
    )
  }

  const renderBranch = (branch: "then" | "else", items: ObjectEventItem[], branchLabel?: string) => {
    return (
      <div className={`control-block-branch-${branch} border-l-2 ${color.borderLeft} ml-3 pl-3`}>
        {branchLabel && (
          <div className={`control-block-branch-label group py-2 px-3 ${color.labelBg} border-t border-b ${color.border} flex items-center justify-between`}>
            <span className={`text-[11px] font-bold ${color.text} uppercase tracking-wider`}>{branchLabel}</span>
            {branch === "else" && !hasElseContent && (
              <button
                type="button"
                className="control-block-else-close h-5 w-5 flex items-center justify-center rounded text-slate-300 hover:text-red-500 hover:bg-red-50 opacity-0 group-hover:opacity-100 transition-opacity"
                onClick={() => setShowElseManually(false)}
                title="Amagar else"
              >
                <X className="h-3 w-3" />
              </button>
            )}
          </div>
        )}
        <div className="flex flex-col gap-px bg-slate-200">
          {items.length === 0 ? (
            <div
              className={`control-block-ghost-action px-3 py-2 bg-white ${isBranchEndDropTarget(branch) ? "ring-1 ring-blue-300 bg-blue-50/40" : ""}`}
              onDragOver={(e) => {
                if (!draggedActionId) return
                e.preventDefault()
                onDragOverAction({ targetIfBlockId: item.id, targetBranch: branch })
              }}
              onDrop={(e) => {
                if (!draggedActionId) return
                e.preventDefault()
                onDropOnAction({ targetIfBlockId: item.id, targetBranch: branch })
              }}
            >
              <span className="text-[11px] italic text-slate-300">Cap acció definida</span>
            </div>
          ) : (
            renderBranchItems(branch, items)
          )}
        </div>
        <div className="control-block-branch-add-row flex items-center gap-2 px-3 py-1.5">
          <button
            type="button"
            className="control-block-branch-add-action flex items-center gap-1 px-2 py-1 text-[10px] text-slate-400 rounded hover:text-blue-600 hover:bg-blue-50 transition-colors"
            onClick={() => onOpenActionPickerForBranch(item.id, branch)}
          >
            <Plus className="h-3 w-3" />
            Add action
          </button>
          <div className="relative" ref={blockPickerBranch === branch ? blockPickerRef : undefined}>
            <button
              type="button"
              className="control-block-branch-add-block-toggle flex items-center gap-1 px-2 py-1 text-[10px] text-slate-400 hover:text-purple-600 hover:bg-purple-50 transition-colors rounded"
              onClick={() => setBlockPickerBranch(blockPickerBranch === branch ? null : branch)}
            >
              <Plus className="h-3 w-3" />
              Add block
            </button>
            {blockPickerBranch === branch && (
              <div className="control-block-inline-block-picker absolute top-full left-0 z-50 mt-1 min-w-[160px] rounded-lg border border-slate-200 bg-white shadow-lg">
                {[
                  { type: "if" as const, label: "If", icon: GitBranch },
                  { type: "repeat" as const, label: "Repeat", icon: RotateCcw },
                  { type: "forEachList" as const, label: "Each list", icon: List },
                  { type: "forEachMap" as const, label: "Each map", icon: Map }
                ].map(({ type: blockType, label, icon: Icon }) => (
                  <button
                    key={blockType}
                    type="button"
                    className="control-block-inline-block-option flex items-center gap-2 w-full px-3 py-1.5 text-xs text-left text-slate-600 hover:bg-purple-50 hover:text-purple-700 transition-colors"
                    onClick={() => createAndAddBlock(blockType, branch)}
                  >
                    <Icon className="h-3.5 w-3.5 shrink-0" />
                    <span>{label}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="control-block-container relative bg-white">
      <div
        className={`control-block-header group flex items-center gap-2 py-2 px-3 ${color.bg} border-b ${color.border}`}
        onContextMenu={(e) => {
          e.preventDefault()
          setContextMenu({ x: e.clientX, y: e.clientY })
        }}
      >
        <span className={`text-[11px] font-bold ${color.text} uppercase tracking-wider shrink-0`}>{label}</span>
        {renderIfHeader()}
        {renderRepeatHeader()}
        {renderForEachListHeader()}
        {renderForEachMapHeader()}
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="control-block-remove h-6 w-6 text-slate-300 hover:text-red-500 hover:bg-red-50 opacity-0 group-hover:opacity-100 transition-opacity ml-auto shrink-0"
          onClick={() => onRemoveBlock(item.id)}
          title="Remove block"
        >
          <Trash className="h-3.5 w-3.5" />
        </Button>
      </div>

      {contextMenu && (
        <div
          className="control-block-context-menu fixed z-30 min-w-[180px] overflow-hidden rounded-md border border-slate-200 bg-white shadow-xl"
          style={{ left: `${contextMenu.x}px`, top: `${contextMenu.y}px` }}
          onMouseDown={(e) => e.stopPropagation()}
        >
          <button
            type="button"
            className="control-block-context-copy flex w-full items-center justify-start px-3 py-2 text-xs text-slate-700 hover:bg-slate-50"
            onClick={() => { onCopyBlock(item.id); setContextMenu(null) }}
          >
            Copy block
          </button>
          <button
            type="button"
            className="control-block-context-paste flex w-full items-center justify-start border-t border-slate-100 px-3 py-2 text-xs text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:text-slate-300 disabled:hover:bg-white"
            onClick={() => { onPasteAfterBlock(item.id); setContextMenu(null) }}
            disabled={!canPasteAction}
          >
            Paste after
          </button>
          <button
            type="button"
            className="control-block-context-delete flex w-full items-center justify-start border-t border-slate-100 px-3 py-2 text-xs text-red-500 hover:bg-red-50"
            onClick={() => { onRemoveBlock(item.id); setContextMenu(null) }}
          >
            Delete block
          </button>
        </div>
      )}

      {/* THEN / main branch */}
      {item.type === "if"
        ? renderBranch("then", item.thenActions)
        : renderBranch("then", item.actions)
      }

      {/* ELSE branch (only for if blocks) */}
      {item.type === "if" && (
        elseVisible ? (
          <>
            <div className={`control-block-else-label group py-2 px-3 ${color.labelBg} border-t border-b ${color.border} flex items-center justify-between`}>
              <span className={`text-[11px] font-bold text-blue-500 uppercase tracking-wider`}>ELSE</span>
              {!hasElseContent && (
                <button
                  type="button"
                  className="control-block-else-close h-5 w-5 flex items-center justify-center rounded text-slate-300 hover:text-red-500 hover:bg-red-50 opacity-0 group-hover:opacity-100 transition-opacity"
                  onClick={() => setShowElseManually(false)}
                  title="Amagar else"
                >
                  <X className="h-3 w-3" />
                </button>
              )}
            </div>
            {renderBranch("else", item.elseActions)}
          </>
        ) : (
          <div className={`control-block-add-else-row flex items-center px-3 py-1.5 border-t ${color.border}`}>
            <button
              type="button"
              className="control-block-add-else flex items-center gap-1 px-2 py-1 text-[10px] text-slate-400 rounded hover:text-blue-600 hover:bg-blue-50 transition-colors"
              onClick={() => setShowElseManually(true)}
            >
              <Plus className="h-3 w-3" />
              Afegir else
            </button>
          </div>
        )
      )}
    </div>
  )
}
