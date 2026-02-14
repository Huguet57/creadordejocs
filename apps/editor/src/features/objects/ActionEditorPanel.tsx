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
  LocateFixed,
  X,
  Globe2,
  Variable
} from "lucide-react"
import { useState } from "react"
import { Button } from "../../components/ui/button.js"
import { Label } from "../../components/ui/label.js"
import { OBJECT_ACTION_TYPES, OBJECT_EVENT_KEYS, type ObjectActionDraft, type ObjectActionType, type ObjectEventKey, type ObjectEventEntry } from "../editor-state/types.js"
import { ActionBlock } from "./ActionBlock.js"
import type { ProjectV1 } from "@creadordejocs/project-format"

type ActionEditorPanelProps = {
  selectedObject: ProjectV1["objects"][0] | null
  activeEvent: ObjectEventEntry | null
  selectableTargetObjects: { id: string; name: string }[]
  sounds: { id: string; name: string }[]
  globalVariables: ProjectV1["variables"]["global"]
  objectVariablesByObjectId: ProjectV1["variables"]["objectByObjectId"]
  roomInstances: ProjectV1["rooms"][number]["instances"]
  allObjects: ProjectV1["objects"]
  onUpdateEventConfig: (key: ObjectEventKey | null, targetId: string | null) => void
  onAddAction: (type: ObjectActionType) => void
  onUpdateAction: (actionId: string, action: ObjectActionDraft) => void
  onMoveAction: (actionId: string, direction: "up" | "down") => void
  onRemoveAction: (actionId: string) => void
}

const ACTION_ICONS: Record<ObjectActionType, React.ElementType> = {
  move: Move,
  setVelocity: FastForward,
  spawnObject: CopyPlus,
  playSound: Volume2,
  changeScore: Trophy,
  endGame: Flag,
  clampToRoom: Maximize,
  jumpToPosition: Locate,
  jumpToStart: LocateFixed,
  setGlobalVariable: Globe2,
  setObjectVariable: Variable,
  setObjectVariableFromGlobal: Variable,
  setGlobalVariableFromObject: Globe2,
  destroySelf: Trash,
  destroyOther: Trash,
}

export function ActionEditorPanel({
  selectedObject,
  activeEvent,
  selectableTargetObjects,
  sounds,
  globalVariables,
  objectVariablesByObjectId,
  roomInstances,
  allObjects,
  onUpdateEventConfig,
  onAddAction,
  onUpdateAction,
  onMoveAction,
  onRemoveAction
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

  return (
    <div className="mvp3-action-editor-panel flex flex-1 flex-col bg-white">
      <div className="flex h-12 items-center justify-between border-b border-slate-200 px-4">
        <h3 className="text-sm text-slate-800">
          When <span className="font-semibold text-slate-900">{activeEvent.type}</span>
        </h3>

        {activeEvent.type === "Keyboard" && (
          <div className="flex items-center gap-2">
            <Label className="text-xs text-slate-400">Key</Label>
            <select
              className="h-7 rounded border border-slate-200 bg-slate-50 px-2 text-xs text-slate-700 focus:border-slate-400 focus:outline-none"
              value={activeEvent.key ?? "ArrowLeft"}
              onChange={(e) => onUpdateEventConfig(e.target.value as ObjectEventKey, activeEvent.targetObjectId)}
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
              onChange={(e) => onUpdateEventConfig(activeEvent.key, e.target.value === "any" ? null : e.target.value)}
            >
              <option value="any">Any object</option>
              {selectableTargetObjects.map((obj) => (
                <option key={obj.id} value={obj.id}>{obj.name}</option>
              ))}
            </select>
          </div>
        )}
      </div>

      <div className="flex-1 overflow-y-auto p-4 bg-slate-50/50">
        <div className="mx-auto max-w-3xl space-y-3">
          {activeEvent.actions.length === 0 && (
            <div className="rounded-lg border-2 border-dashed border-slate-200 p-8 text-center">
              <p className="text-sm text-slate-400">No actions yet.</p>
              <p className="text-xs text-slate-400 mt-1">Add an action below to define what happens.</p>
            </div>
          )}
          
          {activeEvent.actions.map((action, index) => (
            <ActionBlock
              key={action.id}
              action={action}
              index={index}
              isFirst={index === 0}
              isLast={index === activeEvent.actions.length - 1}
              onUpdate={(updatedAction) => onUpdateAction(action.id, updatedAction)}
              onMoveUp={() => onMoveAction(action.id, "up")}
              onMoveDown={() => onMoveAction(action.id, "down")}
              onRemove={() => onRemoveAction(action.id)}
              selectableObjects={selectableTargetObjects}
              sounds={sounds}
              globalVariables={globalVariables}
              objectVariablesByObjectId={objectVariablesByObjectId}
              roomInstances={roomInstances}
              allObjects={allObjects}
            />
          ))}
        </div>
      </div>

      <div className="mvp3-action-picker border-t border-slate-200 p-3">
        {!isActionPickerOpen && (
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
        )}

        {isActionPickerOpen && (
          <div className="mvp3-action-picker-panel mt-2 rounded-md border border-slate-200 bg-slate-50 p-2">
            <div className="mvp3-action-picker-panel-header mb-2 flex items-center justify-between">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">Add Action</p>
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

            <div className="mvp3-action-picker-grid grid grid-cols-4 gap-2">
              {OBJECT_ACTION_TYPES.map((type) => {
                const Icon = ACTION_ICONS[type] ?? Plus
                return (
                  <button
                    key={type}
                    type="button"
                    className="mvp3-action-picker-item flex flex-col items-center justify-center gap-1.5 rounded border border-slate-200 bg-white p-2 text-slate-600 transition-colors hover:border-slate-300 hover:bg-slate-50 hover:text-slate-900"
                    onClick={() => handleAddAction(type)}
                  >
                    <Icon className="h-4 w-4" />
                    <span className="text-[10px] font-medium uppercase">{type}</span>
                  </button>
                )
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
