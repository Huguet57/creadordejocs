import { CopyPlus, Flag, Maximize, Move, FastForward, Trash, Trophy, Volume2, Plus } from "lucide-react"
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

const ACTION_ICONS: Record<ObjectActionType, React.ElementType> = {
  move: Move,
  setVelocity: FastForward,
  spawnObject: CopyPlus,
  playSound: Volume2,
  changeScore: Trophy,
  endGame: Flag,
  clampToRoom: Maximize,
  destroySelf: Trash,
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

          <div className="mt-8">
            <p className="mb-3 text-xs font-semibold text-slate-400 uppercase tracking-wider">Add Action</p>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4">
              {OBJECT_ACTION_TYPES.map((type) => {
                const Icon = ACTION_ICONS[type] ?? Plus
                return (
                  <button
                    key={type}
                    type="button"
                    className="flex flex-col items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white p-3 text-slate-600 shadow-sm transition-all hover:border-slate-300 hover:bg-slate-50 hover:text-slate-900 hover:shadow-md active:scale-95"
                    onClick={() => onAddAction(type)}
                  >
                    <Icon className="h-5 w-5" />
                    <span className="text-[10px] font-medium uppercase">{type}</span>
                  </button>
                )
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
