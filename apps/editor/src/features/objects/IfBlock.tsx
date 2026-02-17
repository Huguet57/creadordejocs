import { Plus, Trash, X } from "lucide-react"
import { useEffect, useState } from "react"
import { Button } from "../../components/ui/button.js"
import {
  type IfCondition,
  type ObjectEventItem,
  type ObjectActionDraft,
  type ObjectIfBlockItem,
  type ObjectEventType
} from "../editor-state/types.js"
import { ActionBlock } from "./ActionBlock.js"
import type { ProjectV1, ValueExpression } from "@creadordejocs/project-format"
import { buildDefaultIfCondition } from "./if-condition-utils.js"
import { type ObjectVariableOption } from "./VariablePicker.js"
import { RightValuePicker } from "./RightValuePicker.js"
import type { ActionDropTarget } from "./action-dnd.js"

type IfBlockProps = {
  item: ObjectIfBlockItem
  selectableTargetObjects: { id: string; name: string }[]
  globalVariables: ProjectV1["variables"]["global"]
  selectedObjectVariables: ProjectV1["variables"]["global"]
  objectVariablesByObjectId: ProjectV1["variables"]["objectByObjectId"]
  roomInstances: ProjectV1["rooms"][number]["instances"]
  allObjects: ProjectV1["objects"]
  rooms: ProjectV1["rooms"]
  eventType: ObjectEventType
  collisionTargetName?: string | null | undefined
  onUpdateIfCondition: (ifBlockId: string, condition: IfCondition) => void
  onRemoveIfBlock: (ifBlockId: string) => void
  onAddIfBlock: (condition: IfCondition, parentIfBlockId?: string, parentBranch?: "then" | "else") => void
  onOpenActionPickerForBranch: (ifBlockId: string, branch: "then" | "else") => void
  onMoveAction: (actionId: string, direction: "up" | "down") => void
  onCopyAction: (actionId: string) => void
  onPasteAfterAction: (actionId: string) => void
  canPasteAction: boolean
  onCopyIfBlock: (ifBlockId: string) => void
  onPasteAfterIfBlock: (ifBlockId: string) => void
  onUpdateIfAction: (ifBlockId: string, actionId: string, action: ObjectActionDraft, branch: "then" | "else") => void
  onRemoveIfAction: (ifBlockId: string, actionId: string, branch: "then" | "else") => void
  draggedActionId: string | null
  dropTarget: ActionDropTarget | null
  onDragStartAction: (actionId: string) => void
  onDragOverAction: (target: ActionDropTarget) => void
  onDropOnAction: (target: ActionDropTarget) => void
  onDragEndAction: () => void
}

type IfContextMenuState = {
  x: number
  y: number
} | null

type ComparisonIfCondition = Extract<IfCondition, { left: ValueExpression }>
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

function isLegacyConditionLeft(
  value: ComparisonIfCondition["left"]
): value is { scope: "global" | "object"; variableId: string } {
  return typeof value === "object" && value !== null && "scope" in value && "variableId" in value
}

function isSourceConditionLeft(
  value: ComparisonIfCondition["left"]
): value is Extract<ComparisonIfCondition["left"], { source: string }> {
  return typeof value === "object" && value !== null && "source" in value
}

function getLeftValueExpectedType(
  left: ComparisonIfCondition["left"],
  globalVariables: ProjectV1["variables"]["global"],
  selectedObjectVariables: ProjectV1["variables"]["global"]
): "number" | "string" | "boolean" {
  const asScalarType = (type: ProjectV1["variables"]["global"][number]["type"] | undefined): "number" | "string" | "boolean" =>
    type === "string" || type === "boolean" || type === "number" ? type : "number"
  if (isLegacyConditionLeft(left)) {
    const source = left.scope === "global" ? globalVariables : selectedObjectVariables
    return asScalarType(source.find((variable) => variable.id === left.variableId)?.type)
  }
  if (!isSourceConditionLeft(left)) {
    return "number"
  }
  if (left.source === "attribute") {
    return "number"
  }
  if (left.source === "globalVariable") {
    return asScalarType(globalVariables.find((variable) => variable.id === left.variableId)?.type)
  }
  if (left.source === "internalVariable") {
    return asScalarType(selectedObjectVariables.find((variable) => variable.id === left.variableId)?.type)
  }
  return "number"
}

function getDefaultRightValueForType(type: "number" | "string" | "boolean"): ComparisonIfCondition["right"] {
  if (type === "boolean") {
    return false
  }
  if (type === "string") {
    return ""
  }
  return 0
}

function BranchAddButton({
  onOpen
}: {
  onOpen: () => void
}) {
  return (
    <button
      type="button"
      className="if-block-branch-add-toggle flex items-center gap-1 px-2 py-1 text-[10px] text-slate-400 rounded hover:text-blue-600 hover:bg-blue-50 transition-colors"
      onClick={onOpen}
    >
      <Plus className="h-3 w-3" />
      Add action
    </button>
  )
}

export function IfBlock({
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
  onUpdateIfCondition,
  onRemoveIfBlock,
  onAddIfBlock,
  onOpenActionPickerForBranch,
  onMoveAction,
  onCopyAction,
  onPasteAfterAction,
  canPasteAction,
  onCopyIfBlock,
  onPasteAfterIfBlock,
  onUpdateIfAction,
  onRemoveIfAction,
  draggedActionId,
  dropTarget,
  onDragStartAction,
  onDragOverAction,
  onDropOnAction,
  onDragEndAction
}: IfBlockProps) {
  const scalarGlobalVariables = globalVariables.filter(
    (variableEntry): variableEntry is Extract<typeof globalVariables[number], { type: "number" | "string" | "boolean" }> =>
      variableEntry.type === "number" || variableEntry.type === "string" || variableEntry.type === "boolean"
  )
  const scalarSelectedObjectVariables = selectedObjectVariables.filter(
    (
      variableEntry
    ): variableEntry is Extract<typeof selectedObjectVariables[number], { type: "number" | "string" | "boolean" }> =>
      variableEntry.type === "number" || variableEntry.type === "string" || variableEntry.type === "boolean"
  )
  const defaultIfCondition = buildDefaultIfCondition(scalarGlobalVariables, scalarSelectedObjectVariables)
  const fallbackComparisonCondition = getFallbackComparisonCondition(defaultIfCondition)
  const isSingleCondition = isComparisonIfCondition(item.condition)
  const compoundCondition = isCompoundIfCondition(item.condition) ? item.condition : null
  const currentPrimaryCondition = isComparisonIfCondition(item.condition)
    ? item.condition
    : ensureComparisonIfCondition(item.condition.conditions[0], fallbackComparisonCondition)
  const [contextMenu, setContextMenu] = useState<IfContextMenuState>(null)
  const hasElseContent = item.elseActions.length > 0
  const [showElseManually, setShowElseManually] = useState(false)
  const elseVisible = hasElseContent || showElseManually

  useEffect(() => {
    if (!contextMenu) {
      return
    }
    const closeContextMenu = () => setContextMenu(null)
    window.addEventListener("mousedown", closeContextMenu)
    return () => window.removeEventListener("mousedown", closeContextMenu)
  }, [contextMenu])

  const objectVarOptionsForPicker: ObjectVariableOption[] = scalarSelectedObjectVariables.map((v) => ({
    id: v.id,
    label: v.name,
    type: v.type,
    objectName: ""
  }))
  const getCanonicalBranchDropTarget = (
    items: ObjectEventItem[],
    hoveredActionId: string,
    hoveredPosition: "top" | "bottom"
  ): { actionId: string; position: "top" | "bottom" } => {
    const actionIds = items
      .filter((itemEntry) => itemEntry.type === "action")
      .map((itemEntry) => itemEntry.action.id)
    const hoveredIndex = actionIds.findIndex((actionId) => actionId === hoveredActionId)
    if (hoveredIndex < 0) {
      return { actionId: hoveredActionId, position: hoveredPosition }
    }
    if (hoveredPosition === "bottom") {
      const nextActionId = actionIds[hoveredIndex + 1]
      if (nextActionId) {
        // Normalize "between two actions" to one visual target: top of the next action.
        return { actionId: nextActionId, position: "top" }
      }
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

      const branchItemClassName = isVisuallyUnreachable ? "mvp21-unreachable-action opacity-40" : ""

      if (branchItem.type === "action") {
        return (
          <div key={`${branch}-${branchItem.id}`} className={branchItemClassName}>
            <ActionBlock
              action={branchItem.action}
              index={branchIndex}
              isFirst={branchIndex === 0}
              isLast={branchIndex === items.length - 1}
              onUpdate={(updatedAction) => onUpdateIfAction(item.id, branchItem.action.id, updatedAction, branch)}
              onMoveUp={() => onMoveAction(branchItem.action.id, "up")}
              onMoveDown={() => onMoveAction(branchItem.action.id, "down")}
              onRemove={() => onRemoveIfAction(item.id, branchItem.action.id, branch)}
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
                if (!draggedActionId || draggedActionId === actionId) {
                  return
                }
                const canonicalDropTarget = getCanonicalBranchDropTarget(items, actionId, position)
                onDragOverAction({
                  targetIfBlockId: item.id,
                  targetBranch: branch,
                  targetActionId: canonicalDropTarget.actionId,
                  position: canonicalDropTarget.position
                })
              }}
              onDropOnAction={(targetActionId, position) => {
                if (!draggedActionId) {
                  return
                }
                const canonicalDropTarget = getCanonicalBranchDropTarget(items, targetActionId, position)
                onDropOnAction({
                  targetIfBlockId: item.id,
                  targetBranch: branch,
                  targetActionId: canonicalDropTarget.actionId,
                  position: canonicalDropTarget.position
                })
              }}
              onDragEndAction={onDragEndAction}
            />
          </div>
        )
      }
      return (
        <div key={`${branch}-${branchItem.id}`} className={branchItemClassName}>
          <IfBlock
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
            onUpdateIfCondition={onUpdateIfCondition}
            onRemoveIfBlock={onRemoveIfBlock}
            onAddIfBlock={onAddIfBlock}
            onOpenActionPickerForBranch={onOpenActionPickerForBranch}
            onMoveAction={onMoveAction}
            onCopyAction={onCopyAction}
            onPasteAfterAction={onPasteAfterAction}
            canPasteAction={canPasteAction}
            onCopyIfBlock={onCopyIfBlock}
            onPasteAfterIfBlock={onPasteAfterIfBlock}
            onUpdateIfAction={onUpdateIfAction}
            onRemoveIfAction={onRemoveIfAction}
            draggedActionId={draggedActionId}
            dropTarget={dropTarget}
            onDragStartAction={onDragStartAction}
            onDragOverAction={onDragOverAction}
            onDropOnAction={onDropOnAction}
            onDragEndAction={onDragEndAction}
          />
        </div>
      )
    })
  }

  const isBranchEndDropTarget = (branch: "then" | "else"): boolean =>
    dropTarget?.targetIfBlockId === item.id &&
    dropTarget?.targetBranch === branch &&
    dropTarget?.targetActionId === undefined

  const renderComparisonConditionEditor = (
    condition: ComparisonIfCondition,
    onChange: (nextCondition: ComparisonIfCondition) => void
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
          allowOtherTarget={eventType === "Collision"}
          allowedSources={["globalVariable", "internalVariable", "attribute"]}
          variant="blue"
          onChange={(nextLeft) => {
            const nextType = getLeftValueExpectedType(
              nextLeft as ComparisonIfCondition["left"],
              globalVariables,
              selectedObjectVariables
            )
            onChange({
              left: nextLeft as ComparisonIfCondition["left"],
              operator: condition.operator,
              right: getDefaultRightValueForType(nextType)
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
          expectedType={selectedType}
          globalVariables={globalVariables}
          internalVariables={objectVarOptionsForPicker}
          allowOtherTarget={eventType === "Collision"}
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
    <div className="if-block-container relative bg-white">
      {/* First condition row: IF [...condition...] [+] [trash] */}
      <div
        className="if-block-header group flex items-center gap-2 py-2 px-3 bg-blue-100 border-b border-blue-200"
        onContextMenu={(event) => {
          event.preventDefault()
          setContextMenu({
            x: event.clientX,
            y: event.clientY
          })
        }}
      >
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
      {contextMenu && (
        <div
          className="mvp17-if-context-menu fixed z-30 min-w-[180px] overflow-hidden rounded-md border border-slate-200 bg-white shadow-xl"
          style={{ left: `${contextMenu.x}px`, top: `${contextMenu.y}px` }}
          onMouseDown={(event) => event.stopPropagation()}
        >
          <button
            type="button"
            className="mvp17-if-context-menu-item-copy flex w-full items-center justify-start px-3 py-2 text-xs text-slate-700 hover:bg-slate-50"
            onClick={() => {
              onCopyIfBlock(item.id)
              setContextMenu(null)
            }}
          >
            Copy if block
          </button>
          <button
            type="button"
            className="mvp17-if-context-menu-item-paste flex w-full items-center justify-start border-t border-slate-100 px-3 py-2 text-xs text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:text-slate-300 disabled:hover:bg-white"
            onClick={() => {
              onPasteAfterIfBlock(item.id)
              setContextMenu(null)
            }}
            disabled={!canPasteAction}
          >
            Paste after
          </button>
          <button
            type="button"
            className="mvp17-if-context-menu-item-delete flex w-full items-center justify-start border-t border-slate-100 px-3 py-2 text-xs text-red-500 hover:bg-red-50"
            onClick={() => {
              onRemoveIfBlock(item.id)
              setContextMenu(null)
            }}
          >
            Delete if block
          </button>
        </div>
      )}

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
          {item.thenActions.length === 0 ? (
            <div
              className={`if-block-ghost-action mvp22-if-branch-empty-dropzone px-3 py-2 bg-white ${
                isBranchEndDropTarget("then") ? "ring-1 ring-blue-300 bg-blue-50/40" : ""
              }`}
              onDragOver={(event) => {
                if (!draggedActionId) {
                  return
                }
                event.preventDefault()
                onDragOverAction({
                  targetIfBlockId: item.id,
                  targetBranch: "then"
                })
              }}
              onDrop={(event) => {
                if (!draggedActionId) {
                  return
                }
                event.preventDefault()
                onDropOnAction({
                  targetIfBlockId: item.id,
                  targetBranch: "then"
                })
              }}
            >
              <span className="text-[11px] italic text-slate-300">Cap acció definida</span>
            </div>
          ) : (
            renderBranchItems("then", item.thenActions)
          )}
        </div>
        <div className="if-block-then-add-row flex items-center gap-2 px-3 py-1.5">
          <BranchAddButton
            onOpen={() => onOpenActionPickerForBranch(item.id, "then")}
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

      {/* ELSE — optional, shown when it has content or user explicitly opens it */}
      {elseVisible ? (
        <>
          {/* ELSE label with close button when empty */}
          <div className="if-block-else-label group py-2 px-3 bg-blue-50 border-t border-b border-blue-200 flex items-center justify-between">
            <span className="text-[11px] font-bold text-blue-500 uppercase tracking-wider">ELSE</span>
            {!hasElseContent && (
              <button
                type="button"
                className="if-block-else-close h-5 w-5 flex items-center justify-center rounded text-slate-300 hover:text-red-500 hover:bg-red-50 opacity-0 group-hover:opacity-100 transition-opacity"
                onClick={() => setShowElseManually(false)}
                title="Amagar else"
              >
                <X className="h-3 w-3" />
              </button>
            )}
          </div>

          {/* ELSE content — indented with left border */}
          <div className="if-block-else-branch border-l-2 border-blue-200 ml-3 pl-3">
            <div className="flex flex-col gap-px bg-slate-200">
              {item.elseActions.length === 0 ? (
                <div
                  className={`if-block-ghost-action mvp22-if-branch-empty-dropzone px-3 py-2 bg-white ${
                    isBranchEndDropTarget("else") ? "ring-1 ring-blue-300 bg-blue-50/40" : ""
                  }`}
                  onDragOver={(event) => {
                    if (!draggedActionId) {
                      return
                    }
                    event.preventDefault()
                    onDragOverAction({
                      targetIfBlockId: item.id,
                      targetBranch: "else"
                    })
                  }}
                  onDrop={(event) => {
                    if (!draggedActionId) {
                      return
                    }
                    event.preventDefault()
                    onDropOnAction({
                      targetIfBlockId: item.id,
                      targetBranch: "else"
                    })
                  }}
                >
                  <span className="text-[11px] italic text-slate-300">Cap acció definida</span>
                </div>
              ) : (
                renderBranchItems("else", item.elseActions)
              )}
            </div>
            <div className="if-block-else-add-row flex items-center gap-2 px-3 py-1.5">
              <BranchAddButton
                onOpen={() => onOpenActionPickerForBranch(item.id, "else")}
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
        </>
      ) : (
        /* "+ Afegir else" toggle button */
        <div className="if-block-add-else-row flex items-center px-3 py-1.5 border-t border-blue-100">
          <button
            type="button"
            className="if-block-add-else-toggle flex items-center gap-1 px-2 py-1 text-[10px] text-slate-400 rounded hover:text-blue-600 hover:bg-blue-50 transition-colors"
            onClick={() => setShowElseManually(true)}
          >
            <Plus className="h-3 w-3" />
            Afegir else
          </button>
        </div>
      )}
    </div>
  )
}
