import {
  Plus,
} from "lucide-react"
import { useState } from "react"
import { Button } from "../../components/ui/button.js"
import { Label } from "../../components/ui/label.js"
import {
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
import { ActionSelectorPanel } from "./ActionSelectorPanel.js"
import type { ProjectV1 } from "@creadordejocs/project-format"
import { buildDefaultIfCondition } from "./if-condition-utils.js"

type ActionEditorPanelProps = {
  selectedObject: ProjectV1["objects"][0] | null
  activeEvent: ObjectEventEntry | null
  selectableTargetObjects: { id: string; name: string }[]
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

export function ActionEditorPanel({
  selectedObject,
  activeEvent,
  selectableTargetObjects,
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
  const collisionTargetName = activeEvent?.type === "Collision" && activeEvent.targetObjectId
    ? selectableTargetObjects.find((obj) => obj.id === activeEvent.targetObjectId)?.name ?? null
    : null

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
                      globalVariables={globalVariables}
                      objectVariablesByObjectId={objectVariablesByObjectId}
                      roomInstances={roomInstances}
                      allObjects={allObjects}
                      rooms={rooms}
                      selectedObjectVariables={selectedObjectVariables}
                      eventType={activeEvent.type}
                      collisionTargetName={collisionTargetName}
                    />
                  )
                }

                return (
                  <IfBlock
                    key={item.id}
                    item={item}
                    selectableTargetObjects={selectableTargetObjects}
                    globalVariables={globalVariables}
                    selectedObjectVariables={selectedObjectVariables}
                    objectVariablesByObjectId={objectVariablesByObjectId}
                    roomInstances={roomInstances}
                    allObjects={allObjects}
                    rooms={rooms}
                    eventType={activeEvent.type}
                    collisionTargetName={collisionTargetName}
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
        <ActionSelectorPanel
          classNamePrefix="mvp3-action-picker"
          onSelectAction={handleAddAction}
          onClose={() => setIsActionPickerOpen(false)}
        />
      )}
    </div>
  )
}
