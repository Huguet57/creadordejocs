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
  Dices,
  ArrowLeftRight,
  DoorOpen,
  RotateCcw,
  Hourglass,
  MessageSquare
} from "lucide-react"
import { useState } from "react"
import { Button } from "../../components/ui/button.js"
import { Label } from "../../components/ui/label.js"
import {
  ACTION_CATEGORIES,
  ACTION_DISPLAY_NAMES,
  OBJECT_EVENT_KEYS,
  type IfCondition,
  type ObjectActionDraft,
  type ObjectActionType,
  type ObjectEventEntry,
  type ObjectEventKey,
  type ObjectKeyboardMode
} from "../editor-state/types.js"
import { ActionBlock } from "./ActionBlock.js"
import { IfBlock } from "./IfBlock.js"
import type { ProjectV1 } from "@creadordejocs/project-format"
import { buildDefaultIfCondition } from "./if-condition-utils.js"

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
  onAddIfBlock: (condition: IfCondition, parentIfBlockId?: string, parentBranch?: "then" | "else") => void
  onUpdateIfCondition: (ifBlockId: string, condition: IfCondition) => void
  onRemoveIfBlock: (ifBlockId: string) => void
  onAddIfAction: (ifBlockId: string, type: ObjectActionType, branch: "then" | "else") => void
  onUpdateIfAction: (ifBlockId: string, actionId: string, action: ObjectActionDraft, branch: "then" | "else") => void
  onRemoveIfAction: (ifBlockId: string, actionId: string, branch: "then" | "else") => void
}

const ACTION_ICONS: Record<ObjectActionType, React.ElementType> = {
  move: Move,
  setVelocity: FastForward,
  rotate: RotateCcw,
  moveToward: Move,
  clampToRoom: Maximize,
  teleport: Locate,
  destroySelf: Trash,
  destroyOther: X,
  spawnObject: CopyPlus,
  changeScore: Trophy,
  endGame: Flag,
  message: MessageSquare,
  playSound: Volume2,
  changeVariable: Variable,
  randomizeVariable: Dices,
  copyVariable: ArrowLeftRight,
  goToRoom: DoorOpen,
  restartRoom: RotateCcw,
  wait: Hourglass
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
              type="text"
              inputMode="numeric"
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
          <div className="flex-1 overflow-y-auto p-4">
            <div className={`mx-auto max-w-3xl flex flex-col ${activeEvent.items.length > 0 ? "gap-px bg-slate-200" : ""}`}>
              {activeEvent.items.length === 0 && (
                <div className="py-6 text-center">
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

                return (
                  <IfBlock
                    key={item.id}
                    item={item}
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
                    onMoveAction={onMoveAction}
                    onUpdateIfAction={onUpdateIfAction}
                    onRemoveIfAction={onRemoveIfAction}
                  />
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
