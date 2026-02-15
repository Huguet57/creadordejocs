import {
  CopyPlus,
  Flag,
  Maximize,
  Move,
  FastForward,
  Trash,
  Trophy,
  Volume2,
  Plus,
  Locate,
  X,
  Variable,
  ArrowLeftRight,
  DoorOpen,
  RotateCcw
} from "lucide-react"
import { useState } from "react"
import { Button } from "../../components/ui/button.js"
import { Label } from "../../components/ui/label.js"
import {
  ACTION_CATEGORIES,
  OBJECT_ACTION_TYPES,
  OBJECT_EVENT_KEYS,
  type IfCondition,
  type ObjectActionDraft,
  type ObjectActionType,
  type ObjectEventEntry,
  type ObjectEventKey,
  type ObjectKeyboardMode
} from "../editor-state/types.js"
import { ActionBlock } from "./ActionBlock.js"
import type { ProjectV1 } from "@creadordejocs/project-format"
import { buildDefaultIfCondition, coerceIfConditionRightValue } from "./if-condition-utils.js"

type ActionEditorPanelProps = {
  selectedObject: ProjectV1["objects"][0] | null
  activeEvent: ObjectEventEntry | null
  selectableTargetObjects: { id: string; name: string }[]
  sounds: { id: string; name: string }[]
  globalVariables: ProjectV1["variables"]["global"]
  selectedObjectVariables: ProjectV1["variables"]["global"]
  objectVariablesByObjectId: ProjectV1["variables"]["objectByObjectId"]
  roomInstances: ProjectV1["rooms"][number]["instances"]
  allObjects: ProjectV1["objects"]
  rooms: ProjectV1["rooms"]
  onUpdateEventConfig: (
    key: ObjectEventKey | null,
    keyboardMode: ObjectKeyboardMode | null,
    targetId: string | null,
    intervalMs: number | null
  ) => void
  onAddAction: (type: ObjectActionType) => void
  onUpdateAction: (actionId: string, action: ObjectActionDraft) => void
  onMoveAction: (actionId: string, direction: "up" | "down") => void
  onRemoveAction: (actionId: string) => void
  onAddIfBlock: (condition: IfCondition) => void
  onUpdateIfCondition: (ifBlockId: string, condition: IfCondition) => void
  onRemoveIfBlock: (ifBlockId: string) => void
  onAddIfAction: (ifBlockId: string, type: ObjectActionType, branch: "then" | "else") => void
  onUpdateIfAction: (ifBlockId: string, actionId: string, action: ObjectActionDraft, branch: "then" | "else") => void
  onRemoveIfAction: (ifBlockId: string, actionId: string, branch: "then" | "else") => void
}

const ACTION_ICONS: Record<ObjectActionType, React.ElementType> = {
  move: Move,
  setVelocity: FastForward,
  clampToRoom: Maximize,
  teleport: Locate,
  destroySelf: Trash,
  destroyOther: X,
  spawnObject: CopyPlus,
  changeScore: Trophy,
  endGame: Flag,
  playSound: Volume2,
  changeVariable: Variable,
  copyVariable: ArrowLeftRight,
  goToRoom: DoorOpen,
  restartRoom: RotateCcw,
}

const ACTION_DISPLAY_NAMES: Record<ObjectActionType, string> = {
  move: "Moure",
  setVelocity: "Velocitat",
  clampToRoom: "Limitar a sala",
  teleport: "Teleport",
  destroySelf: "Destruir-se",
  destroyOther: "Destruir altre",
  spawnObject: "Crear objecte",
  changeScore: "Canviar punts",
  endGame: "Fi del joc",
  playSound: "Reproduir so",
  changeVariable: "Variable",
  copyVariable: "Copiar variable",
  goToRoom: "Anar a sala",
  restartRoom: "Reiniciar sala",
}

export function ActionEditorPanel({
  selectedObject,
  activeEvent,
  selectableTargetObjects,
  sounds,
  globalVariables,
  selectedObjectVariables,
  objectVariablesByObjectId,
  roomInstances,
  allObjects,
  rooms,
  onUpdateEventConfig,
  onAddAction,
  onUpdateAction,
  onMoveAction,
  onRemoveAction,
  onAddIfBlock,
  onUpdateIfCondition,
  onRemoveIfBlock,
  onAddIfAction,
  onUpdateIfAction,
  onRemoveIfAction
}: ActionEditorPanelProps) {
  const [isActionPickerOpen, setIsActionPickerOpen] = useState(false)
  const [ifActionTypeByBlockId, setIfActionTypeByBlockId] = useState<Record<string, ObjectActionType>>({})

  if (!selectedObject) {
    return (
      <div className="flex flex-1 items-center justify-center bg-slate-50 text-slate-400">
        <p>Select an object to edit</p>
      </div>
    )
  }

  if (!activeEvent) {
    return (
      <div className="flex flex-1 items-center justify-center bg-slate-50 text-slate-400">
        <p>Select an event to add actions</p>
      </div>
    )
  }

  const handleAddAction = (type: ObjectActionType) => {
    onAddAction(type)
    setIsActionPickerOpen(false)
  }

  const defaultIfCondition = buildDefaultIfCondition(globalVariables, selectedObjectVariables)

  return (
    <div className="mvp3-action-editor-panel flex flex-1 flex-col bg-white">
      <div className="flex h-12 items-center justify-between border-b border-slate-200 px-4">
        <h3 className="text-sm text-slate-800">
          When <span className="font-semibold text-slate-900">{activeEvent.type}</span>
        </h3>

        {activeEvent.type === "Keyboard" && (
          <div className="mvp16-keyboard-event-config flex items-center gap-2">
            <Label className="text-xs text-slate-400">Mode</Label>
            <select
              className="h-7 rounded border border-slate-200 bg-slate-50 px-2 text-xs text-slate-700 focus:border-slate-400 focus:outline-none"
              value={activeEvent.keyboardMode ?? "down"}
              onChange={(e) =>
                onUpdateEventConfig(
                  activeEvent.key ?? "ArrowLeft",
                  e.target.value as ObjectKeyboardMode,
                  activeEvent.targetObjectId,
                  activeEvent.intervalMs
                )
              }
            >
              <option value="down">Held</option>
              <option value="press">Pressed</option>
            </select>
            <Label className="text-xs text-slate-400">Key</Label>
            <select
              className="h-7 rounded border border-slate-200 bg-slate-50 px-2 text-xs text-slate-700 focus:border-slate-400 focus:outline-none"
              value={activeEvent.key ?? "ArrowLeft"}
              onChange={(e) =>
                onUpdateEventConfig(
                  e.target.value as ObjectEventKey,
                  activeEvent.keyboardMode ?? "down",
                  activeEvent.targetObjectId,
                  activeEvent.intervalMs
                )
              }
            >
              {OBJECT_EVENT_KEYS.map((key) => (
                <option key={key} value={key}>{key}</option>
              ))}
            </select>
          </div>
        )}

        {activeEvent.type === "Collision" && (
          <div className="flex items-center gap-2">
            <Label className="text-xs text-slate-400">Target</Label>
            <select
              className="h-7 rounded border border-slate-200 bg-slate-50 px-2 text-xs text-slate-700 focus:border-slate-400 focus:outline-none"
              value={activeEvent.targetObjectId ?? "any"}
              onChange={(e) =>
                onUpdateEventConfig(
                  activeEvent.key,
                  activeEvent.keyboardMode ?? null,
                  e.target.value === "any" ? null : e.target.value,
                  activeEvent.intervalMs
                )
              }
            >
              <option value="any">Any object</option>
              {selectableTargetObjects.map((obj) => (
                <option key={obj.id} value={obj.id}>{obj.name}</option>
              ))}
            </select>
          </div>
        )}

        {activeEvent.type === "Timer" && (
          <div className="flex items-center gap-2">
            <Label className="text-xs text-slate-400">Interval (ms)</Label>
            <input
              type="number"
              min={1}
              className="h-7 w-24 rounded border border-slate-200 bg-slate-50 px-2 text-xs text-slate-700 focus:border-slate-400 focus:outline-none"
              value={activeEvent.intervalMs ?? 1000}
              onChange={(e) =>
                onUpdateEventConfig(
                  activeEvent.key,
                  activeEvent.keyboardMode ?? null,
                  activeEvent.targetObjectId,
                  Math.max(1, Number(e.target.value) || 1)
                )
              }
            />
          </div>
        )}
      </div>

      {!isActionPickerOpen ? (
        <>
          <div className="flex-1 overflow-y-auto p-4 bg-slate-50/50">
            <div className="mx-auto max-w-3xl space-y-3">
              {activeEvent.items.length === 0 && (
                <div className="rounded-lg border-2 border-dashed border-slate-200 p-8 text-center">
                  <p className="text-sm text-slate-400">No actions yet.</p>
                  <p className="text-xs text-slate-400 mt-1">Add an action below to define what happens.</p>
                </div>
              )}

              {activeEvent.items.map((item, index) => {
                if (item.type === "action") {
                  return (
                    <ActionBlock
                      key={item.id}
                      action={item.action}
                      index={index}
                      isFirst={index === 0}
                      isLast={index === activeEvent.items.length - 1}
                      onUpdate={(updatedAction) => onUpdateAction(item.action.id, updatedAction)}
                      onMoveUp={() => onMoveAction(item.action.id, "up")}
                      onMoveDown={() => onMoveAction(item.action.id, "down")}
                      onRemove={() => onRemoveAction(item.action.id)}
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

                const variableSource = item.condition.left.scope === "global" ? globalVariables : selectedObjectVariables
                const selectedVariable = variableSource.find((variable) => variable.id === item.condition.left.variableId)
                const selectedType = selectedVariable?.type ?? "number"
                const selectedAddType = ifActionTypeByBlockId[item.id] ?? OBJECT_ACTION_TYPES[0] ?? "move"

                return (
                  <div key={item.id} className="mvp16-if-block-container rounded-md border border-amber-200 bg-amber-50/70 p-3">
                    <div className="mvp16-if-block-header mb-2 flex items-center justify-between">
                      <p className="text-xs font-semibold uppercase tracking-wide text-amber-700">If</p>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="mvp16-if-block-remove h-6 text-xs text-amber-700 hover:bg-amber-100"
                        onClick={() => onRemoveIfBlock(item.id)}
                      >
                        Remove if
                      </Button>
                    </div>

                    <div className="mvp16-if-condition-row mb-3 flex flex-wrap items-center gap-2">
                      <select
                        className="mvp16-if-scope-select h-7 rounded border border-amber-300 bg-white px-2 text-xs"
                        value={item.condition.left.scope}
                        onChange={(event) => {
                          const nextScope = event.target.value as "global" | "object"
                          const nextSource = nextScope === "global" ? globalVariables : selectedObjectVariables
                          const firstVariable = nextSource[0]
                          if (!firstVariable) {
                            return
                          }
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
                        className="mvp16-if-variable-select h-7 rounded border border-amber-300 bg-white px-2 text-xs"
                        value={item.condition.left.variableId}
                        onChange={(event) => {
                          const nextVariable = variableSource.find((variable) => variable.id === event.target.value)
                          if (!nextVariable) {
                            return
                          }
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
                        className="mvp16-if-operator-select h-7 rounded border border-amber-300 bg-white px-2 text-xs"
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
                          className="mvp16-if-value-bool h-7 rounded border border-amber-300 bg-white px-2 text-xs"
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
                          className="mvp16-if-value-input h-7 w-28 rounded border border-amber-300 bg-white px-2 text-xs"
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

                    <div className="mvp16-if-actions-list space-y-3">
                      {(["then", "else"] as const).map((branch) => (
                        <div key={`${item.id}-${branch}`} className="mvp16-if-branch rounded border border-amber-200 bg-amber-50/40 p-2">
                          <p className="text-[10px] font-semibold uppercase tracking-wide text-amber-700 mb-2">
                            {branch === "then" ? "Then" : "Else"}
                          </p>
                          <div className="space-y-2">
                            {(branch === "then" ? item.thenActions : item.elseActions).map((nestedAction, nestedIndex) => (
                              <ActionBlock
                                key={`${branch}-${nestedAction.id}`}
                                action={nestedAction}
                                index={nestedIndex}
                                isFirst
                                isLast
                                onUpdate={(updatedAction) => onUpdateIfAction(item.id, nestedAction.id, updatedAction, branch)}
                                onMoveUp={() => undefined}
                                onMoveDown={() => undefined}
                                onRemove={() => onRemoveIfAction(item.id, nestedAction.id, branch)}
                                selectableObjects={selectableTargetObjects}
                                sounds={sounds}
                                globalVariables={globalVariables}
                                objectVariablesByObjectId={objectVariablesByObjectId}
                                roomInstances={roomInstances}
                                allObjects={allObjects}
                                rooms={rooms}
                              />
                            ))}
                          </div>
                          <div className="mvp16-if-add-action mt-2 flex items-center gap-2">
                            <select
                              className="mvp16-if-add-type h-7 rounded border border-amber-300 bg-white px-2 text-xs"
                              value={selectedAddType}
                              onChange={(event) =>
                                setIfActionTypeByBlockId((previous) => ({
                                  ...previous,
                                  [item.id]: event.target.value as ObjectActionType
                                }))
                              }
                            >
                              {OBJECT_ACTION_TYPES.map((type) => (
                                <option key={`${item.id}-${branch}-${type}`} value={type}>
                                  {ACTION_DISPLAY_NAMES[type]}
                                </option>
                              ))}
                            </select>
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              className="mvp16-if-add-action-button h-7 text-xs"
                              onClick={() => onAddIfAction(item.id, selectedAddType, branch)}
                            >
                              Add {branch} action
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          <div className="mvp3-action-picker border-t border-slate-200 p-3">
            <div className="mvp16-actions-footer-grid grid grid-cols-2 gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="mvp3-action-picker-toggle h-8 w-full justify-start text-xs"
                onClick={() => setIsActionPickerOpen(true)}
              >
                <Plus className="mr-2 h-3.5 w-3.5" />
                Add Action
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="mvp16-if-add-block h-8 w-full justify-start text-xs"
                disabled={!defaultIfCondition}
                onClick={() => {
                  if (defaultIfCondition) {
                    onAddIfBlock(defaultIfCondition)
                  }
                }}
              >
                <Plus className="mr-2 h-3.5 w-3.5" />
                Add if block
              </Button>
            </div>
          </div>
        </>
      ) : (
        <div className="mvp3-action-picker-panel flex flex-1 flex-col overflow-hidden bg-slate-50/50">
          <div className="mvp3-action-picker-panel-header flex items-center justify-between border-b border-slate-200 px-4 py-2">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">Afegir acció</p>
            <button
              type="button"
              className="mvp3-action-picker-close inline-flex h-6 w-6 items-center justify-center rounded text-slate-400 transition-colors hover:bg-slate-200 hover:text-slate-700"
              onClick={() => setIsActionPickerOpen(false)}
              title="Cancel"
              aria-label="Cancel add action"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>

          <div className="mvp3-action-picker-grid flex-1 overflow-y-auto p-4 space-y-4">
            {ACTION_CATEGORIES.map((category) => (
              <div key={category.id} className="mvp3-action-category">
                <p className="mvp3-action-category-label mb-2 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                  {category.label}
                </p>
                <div className="grid grid-cols-4 gap-2">
                  {category.types.map((type) => {
                    const Icon = ACTION_ICONS[type] ?? Plus
                    return (
                      <button
                        key={type}
                        type="button"
                        className="mvp3-action-picker-item flex flex-col items-center justify-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2 py-3 text-slate-600 transition-colors hover:border-slate-400 hover:bg-slate-100 hover:text-slate-900"
                        onClick={() => handleAddAction(type)}
                      >
                        <Icon className="h-5 w-5" />
                        <span className="text-[10px] font-medium leading-tight text-center">{ACTION_DISPLAY_NAMES[type]}</span>
                      </button>
                    )
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
