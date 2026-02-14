import { Plus } from "lucide-react"
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
  onUpdateEventConfig: (key: ObjectEventKey | null, targetId: string | null) => void
  onAddAction: (type: ObjectActionType) => void
  onUpdateAction: (actionId: string, action: ObjectActionDraft) => void
  onMoveAction: (actionId: string, direction: "up" | "down") => void
  onRemoveAction: (actionId: string) => void
}

export function ActionEditorPanel({
  selectedObject,
  activeEvent,
  selectableTargetObjects,
  sounds,
  onUpdateEventConfig,
  onAddAction,
  onUpdateAction,
  onMoveAction,
  onRemoveAction
}: ActionEditorPanelProps) {
  const [nextActionType, setNextActionType] = useState<ObjectActionType>("move")

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

  return (
    <div className="mvp3-action-editor-panel flex flex-1 flex-col bg-white">
      <div className="border-b border-slate-200 p-4">
        <div className="flex items-center gap-4">
          <h3 className="text-sm font-semibold text-slate-800">
            When <span className="text-blue-600">{activeEvent.type}</span>
          </h3>
          
          {activeEvent.type === "Keyboard" && (
            <div className="flex items-center gap-2">
              <Label className="text-xs text-slate-500">Key:</Label>
              <select
                className="h-7 rounded border border-slate-300 bg-white px-2 text-xs font-medium text-slate-700 focus:border-blue-500 focus:outline-none"
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
              <Label className="text-xs text-slate-500">Target:</Label>
              <select
                className="h-7 rounded border border-slate-300 bg-white px-2 text-xs font-medium text-slate-700 focus:border-blue-500 focus:outline-none"
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
            />
          ))}

          <div className="mt-6 flex items-center gap-2 rounded-md border border-slate-200 bg-white p-2 shadow-sm max-w-md">
            <select
              className="h-8 flex-1 rounded border border-slate-300 bg-white px-2 text-xs text-slate-700 focus:border-blue-500 focus:outline-none"
              value={nextActionType}
              onChange={(e) => setNextActionType(e.target.value as ObjectActionType)}
            >
              {OBJECT_ACTION_TYPES.map((type) => (
                <option key={type} value={type}>{type}</option>
              ))}
            </select>
            <Button
              size="sm"
              className="h-8 px-3 text-xs"
              onClick={() => onAddAction(nextActionType)}
            >
              <Plus className="mr-2 h-3.5 w-3.5" />
              Add Action
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
