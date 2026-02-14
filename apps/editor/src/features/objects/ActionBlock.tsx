import {
  ChevronDown,
  ChevronUp,
  CopyPlus,
  Flag,
  Maximize,
  Move,
  FastForward,
  Trash,
  Trophy,
  Volume2,
  X,
  Locate,
  LocateFixed,
  Globe2,
  Variable
} from "lucide-react"
import { Button } from "../../components/ui/button.js"
import { Input } from "../../components/ui/input.js"
import type { ObjectActionDraft, ProjectV1, VariableType, VariableValue } from "@creadordejocs/project-format"
import { type ObjectActionType } from "../editor-state/types.js"

type ActionBlockProps = {
  action: ObjectActionDraft & { id: string }
  index: number
  isFirst: boolean
  isLast: boolean
  onUpdate: (action: ObjectActionDraft) => void
  onMoveUp: () => void
  onMoveDown: () => void
  onRemove: () => void
  selectableObjects: { id: string; name: string }[]
  sounds: { id: string; name: string }[]
  globalVariables: ProjectV1["variables"]["global"]
  objectVariablesByObjectId: ProjectV1["variables"]["objectByObjectId"]
  roomInstances: ProjectV1["rooms"][number]["instances"]
  allObjects: ProjectV1["objects"]
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
  destroyOther: X,
}

const ACTION_LABELS: Partial<Record<ObjectActionType, string>> = {
  setGlobalVariable: "Set Global",
  setObjectVariable: "Set Var",
  setObjectVariableFromGlobal: "Var ← Global",
  setGlobalVariableFromObject: "Global ← Var"
}

function parseValueForType(type: VariableType, rawValue: string): VariableValue {
  if (type === "number") {
    const parsed = Number(rawValue)
    return Number.isFinite(parsed) ? parsed : 0
  }
  if (type === "boolean") {
    return rawValue === "true"
  }
  return rawValue
}

function formatValue(value: VariableValue): string {
  if (typeof value === "boolean") {
    return value ? "true" : "false"
  }
  return String(value)
}

export function ActionBlock({
  action,
  isFirst,
  isLast,
  onUpdate,
  onMoveUp,
  onMoveDown,
  onRemove,
  selectableObjects,
  sounds,
  globalVariables,
  objectVariablesByObjectId,
  roomInstances,
  allObjects
}: ActionBlockProps) {
  const Icon = ACTION_ICONS[action.type] ?? Move
  const objectVariableOptions = allObjects.flatMap((objectEntry) =>
    (objectVariablesByObjectId[objectEntry.id] ?? []).map((definition) => ({
      id: definition.id,
      objectName: objectEntry.name,
      label: `${objectEntry.name}.${definition.name}`,
      type: definition.type
    }))
  )
  const selectedGlobalForObjectTarget =
    action.type === "setObjectVariableFromGlobal"
      ? globalVariables.find((definition) => definition.id === action.globalVariableId)
      : null
  const compatibleObjectOptionsForObjectTarget = selectedGlobalForObjectTarget
    ? objectVariableOptions.filter((option) => option.type === selectedGlobalForObjectTarget.type)
    : objectVariableOptions
  const selectedGlobalForGlobalTarget =
    action.type === "setGlobalVariableFromObject"
      ? globalVariables.find((definition) => definition.id === action.globalVariableId)
      : null
  const compatibleObjectOptionsForGlobalTarget = selectedGlobalForGlobalTarget
    ? objectVariableOptions.filter((option) => option.type === selectedGlobalForGlobalTarget.type)
    : objectVariableOptions

  return (
    <div className="group flex items-center gap-3 rounded-md border border-slate-200 bg-white p-2 shadow-sm transition-all hover:shadow-md">
      <div className="flex items-center gap-1.5 min-w-[90px] shrink-0">
        <Icon className="h-4 w-4 text-slate-500 shrink-0" />
        <span className="text-[10px] font-semibold uppercase tracking-wide text-slate-700 leading-tight">
          {ACTION_LABELS[action.type] ?? action.type}
        </span>
      </div>

      <div className="flex-1 flex items-center gap-3 flex-wrap">
        {action.type === "move" && (
          <>
            <div className="flex items-center gap-1">
              <label className="text-[10px] font-medium opacity-60">DX</label>
              <Input
                type="number"
                className="h-6 w-16 px-1 text-xs bg-white/50 border-slate-300"
                value={action.dx}
                onChange={(e) => onUpdate({ ...action, dx: Number(e.target.value) })}
              />
            </div>
            <div className="flex items-center gap-1">
              <label className="text-[10px] font-medium opacity-60">DY</label>
              <Input
                type="number"
                className="h-6 w-16 px-1 text-xs bg-white/50 border-slate-300"
                value={action.dy}
                onChange={(e) => onUpdate({ ...action, dy: Number(e.target.value) })}
              />
            </div>
          </>
        )}

        {action.type === "setVelocity" && (
          <>
            <div className="flex items-center gap-1">
              <label className="text-[10px] font-medium opacity-60">Speed</label>
              <Input
                type="number"
                className="h-6 w-16 px-1 text-xs bg-white/50 border-slate-300"
                value={action.speed}
                onChange={(e) => onUpdate({ ...action, speed: Number(e.target.value) })}
              />
            </div>
            <div className="flex items-center gap-1">
              <label className="text-[10px] font-medium opacity-60">Dir</label>
              <Input
                type="number"
                className="h-6 w-16 px-1 text-xs bg-white/50 border-slate-300"
                value={action.direction}
                onChange={(e) => onUpdate({ ...action, direction: Number(e.target.value) })}
              />
            </div>
          </>
        )}

        {action.type === "spawnObject" && (
          <>
            <select
              className="h-6 rounded border border-slate-300 bg-white/50 px-1 text-xs focus:outline-none"
              value={action.objectId}
              onChange={(e) => onUpdate({ ...action, objectId: e.target.value })}
            >
              {selectableObjects.map((obj) => (
                <option key={obj.id} value={obj.id}>{obj.name}</option>
              ))}
            </select>
            <div className="flex items-center gap-1">
              <label className="text-[10px] font-medium opacity-60">X</label>
              <Input
                type="number"
                className="h-6 w-14 px-1 text-xs bg-white/50 border-slate-300"
                value={action.offsetX}
                onChange={(e) => onUpdate({ ...action, offsetX: Number(e.target.value) })}
              />
            </div>
            <div className="flex items-center gap-1">
              <label className="text-[10px] font-medium opacity-60">Y</label>
              <Input
                type="number"
                className="h-6 w-14 px-1 text-xs bg-white/50 border-slate-300"
                value={action.offsetY}
                onChange={(e) => onUpdate({ ...action, offsetY: Number(e.target.value) })}
              />
            </div>
          </>
        )}

        {action.type === "playSound" && (
          <select
            className="h-6 rounded border border-slate-300 bg-white/50 px-1 text-xs focus:outline-none min-w-[120px]"
            value={action.soundId}
            onChange={(e) => onUpdate({ ...action, soundId: e.target.value })}
          >
            {sounds.map((sound) => (
              <option key={sound.id} value={sound.id}>{sound.name}</option>
            ))}
          </select>
        )}

        {action.type === "changeScore" && (
          <div className="flex items-center gap-1">
            <label className="text-[10px] font-medium opacity-60">Delta</label>
            <Input
              type="number"
              className="h-6 w-16 px-1 text-xs bg-white/50 border-slate-300"
              value={action.delta}
              onChange={(e) => onUpdate({ ...action, delta: Number(e.target.value) })}
            />
          </div>
        )}

        {action.type === "jumpToPosition" && (
          <>
            <div className="flex items-center gap-1">
              <label className="text-[10px] font-medium opacity-60">X</label>
              <Input
                type="number"
                className="h-6 w-16 px-1 text-xs bg-white/50 border-slate-300"
                value={action.x}
                onChange={(e) => onUpdate({ ...action, x: Number(e.target.value) })}
              />
            </div>
            <div className="flex items-center gap-1">
              <label className="text-[10px] font-medium opacity-60">Y</label>
              <Input
                type="number"
                className="h-6 w-16 px-1 text-xs bg-white/50 border-slate-300"
                value={action.y}
                onChange={(e) => onUpdate({ ...action, y: Number(e.target.value) })}
              />
            </div>
          </>
        )}

        {action.type === "endGame" && (
          <div className="flex items-center gap-1 flex-1">
            <label className="text-[10px] font-medium opacity-60">Msg</label>
            <Input
              className="h-6 w-full px-1 text-xs bg-white/50 border-slate-300"
              value={action.message}
              onChange={(e) => onUpdate({ ...action, message: e.target.value })}
            />
          </div>
        )}

        {action.type === "setGlobalVariable" && (
          <>
            <select
              className="h-6 rounded border border-slate-300 bg-white/50 px-1 text-xs focus:outline-none"
              value={action.variableId}
              onChange={(event) => {
                const selected = globalVariables.find((definition) => definition.id === event.target.value)
                if (!selected) return
                onUpdate({ ...action, variableId: selected.id, value: selected.initialValue })
              }}
            >
              {globalVariables.map((definition) => (
                <option key={definition.id} value={definition.id}>{definition.name}</option>
              ))}
            </select>
            {typeof action.value === "boolean" ? (
              <select
                className="h-6 w-16 rounded border border-slate-300 bg-white/50 px-1 text-xs"
                value={String(action.value)}
                onChange={(event) => onUpdate({ ...action, value: event.target.value === "true" })}
              >
                <option value="true">true</option>
                <option value="false">false</option>
              </select>
            ) : (
              <Input
                type={typeof action.value === "number" ? "number" : "text"}
                className="h-6 w-16 px-1 text-xs bg-white/50 border-slate-300"
                value={formatValue(action.value)}
                onChange={(event) => {
                  const selected = globalVariables.find((definition) => definition.id === action.variableId)
                  if (!selected) return
                  onUpdate({ ...action, value: parseValueForType(selected.type, event.target.value) })
                }}
              />
            )}
          </>
        )}

        {action.type === "setObjectVariable" && (
          <>
            <select
              className="h-6 w-14 rounded border border-slate-300 bg-white/50 px-1 text-xs"
              value={action.target}
              onChange={(event) =>
                onUpdate({
                  ...action,
                  target: event.target.value as "self" | "other" | "instanceId",
                  targetInstanceId: event.target.value === "instanceId" ? action.targetInstanceId : null
                })
              }
            >
              <option value="self">self</option>
              <option value="other">other</option>
              <option value="instanceId">id</option>
            </select>
            {action.target === "instanceId" && (
              <select
                className="h-6 rounded border border-slate-300 bg-white/50 px-1 text-xs"
                value={action.targetInstanceId ?? roomInstances[0]?.id ?? ""}
                onChange={(event) => onUpdate({ ...action, targetInstanceId: event.target.value })}
              >
                {roomInstances.map((instanceEntry) => (
                  <option key={instanceEntry.id} value={instanceEntry.id}>{instanceEntry.id}</option>
                ))}
              </select>
            )}
            <select
              className="h-6 rounded border border-slate-300 bg-white/50 px-1 text-xs"
              value={action.variableId}
              onChange={(event) => {
                const selected = objectVariableOptions.find((option) => option.id === event.target.value)
                if (!selected) return
                onUpdate({ ...action, variableId: selected.id })
              }}
            >
              {objectVariableOptions.map((option) => (
                <option key={`${option.objectName}-${option.id}`} value={option.id}>{option.label}</option>
              ))}
            </select>
            {typeof action.value === "boolean" ? (
              <select
                className="h-6 w-16 rounded border border-slate-300 bg-white/50 px-1 text-xs"
                value={String(action.value)}
                onChange={(event) => onUpdate({ ...action, value: event.target.value === "true" })}
              >
                <option value="true">true</option>
                <option value="false">false</option>
              </select>
            ) : (
              <Input
                type={typeof action.value === "number" ? "number" : "text"}
                className="h-6 w-16 px-1 text-xs bg-white/50 border-slate-300"
                value={formatValue(action.value)}
                onChange={(event) => {
                  const selected = objectVariableOptions.find((option) => option.id === action.variableId)
                  if (!selected) return
                  onUpdate({ ...action, value: parseValueForType(selected.type, event.target.value) })
                }}
              />
            )}
          </>
        )}

        {action.type === "setObjectVariableFromGlobal" && (
          <>
            <select
              className="h-6 w-14 rounded border border-slate-300 bg-white/50 px-1 text-xs"
              value={action.target}
              onChange={(event) =>
                onUpdate({
                  ...action,
                  target: event.target.value as "self" | "other" | "instanceId",
                  targetInstanceId: event.target.value === "instanceId" ? action.targetInstanceId : null
                })
              }
            >
              <option value="self">self</option>
              <option value="other">other</option>
              <option value="instanceId">id</option>
            </select>
            {action.target === "instanceId" && (
              <select
                className="h-6 rounded border border-slate-300 bg-white/50 px-1 text-xs"
                value={action.targetInstanceId ?? roomInstances[0]?.id ?? ""}
                onChange={(event) => onUpdate({ ...action, targetInstanceId: event.target.value })}
              >
                {roomInstances.map((instanceEntry) => (
                  <option key={instanceEntry.id} value={instanceEntry.id}>{instanceEntry.id}</option>
                ))}
              </select>
            )}
            <select
              className="h-6 rounded border border-slate-300 bg-white/50 px-1 text-xs"
              value={action.variableId}
              onChange={(event) => onUpdate({ ...action, variableId: event.target.value })}
            >
              {compatibleObjectOptionsForObjectTarget.map((option) => (
                <option key={`${option.objectName}-${option.id}`} value={option.id}>{option.label}</option>
              ))}
            </select>
            <label className="text-[10px] font-medium opacity-60">←</label>
            <select
              className="h-6 rounded border border-slate-300 bg-white/50 px-1 text-xs"
              value={action.globalVariableId}
              onChange={(event) => onUpdate({ ...action, globalVariableId: event.target.value })}
            >
              {globalVariables.map((definition) => (
                <option key={definition.id} value={definition.id}>{definition.name}</option>
              ))}
            </select>
          </>
        )}

        {action.type === "setGlobalVariableFromObject" && (
          <>
            <select
              className="h-6 rounded border border-slate-300 bg-white/50 px-1 text-xs"
              value={action.globalVariableId}
              onChange={(event) => onUpdate({ ...action, globalVariableId: event.target.value })}
            >
              {globalVariables.map((definition) => (
                <option key={definition.id} value={definition.id}>{definition.name}</option>
              ))}
            </select>
            <label className="text-[10px] font-medium opacity-60">←</label>
            <select
              className="h-6 w-14 rounded border border-slate-300 bg-white/50 px-1 text-xs"
              value={action.source}
              onChange={(event) =>
                onUpdate({
                  ...action,
                  source: event.target.value as "self" | "other" | "instanceId",
                  sourceInstanceId: event.target.value === "instanceId" ? action.sourceInstanceId : null
                })
              }
            >
              <option value="self">self</option>
              <option value="other">other</option>
              <option value="instanceId">id</option>
            </select>
            {action.source === "instanceId" && (
              <select
                className="h-6 rounded border border-slate-300 bg-white/50 px-1 text-xs"
                value={action.sourceInstanceId ?? roomInstances[0]?.id ?? ""}
                onChange={(event) => onUpdate({ ...action, sourceInstanceId: event.target.value })}
              >
                {roomInstances.map((instanceEntry) => (
                  <option key={instanceEntry.id} value={instanceEntry.id}>{instanceEntry.id}</option>
                ))}
              </select>
            )}
            <select
              className="h-6 rounded border border-slate-300 bg-white/50 px-1 text-xs"
              value={action.objectVariableId}
              onChange={(event) => onUpdate({ ...action, objectVariableId: event.target.value })}
            >
              {compatibleObjectOptionsForGlobalTarget.map((option) => (
                <option key={`${option.objectName}-${option.id}`} value={option.id}>{option.label}</option>
              ))}
            </select>
          </>
        )}
      </div>

      <div className="flex items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100 focus-within:opacity-100">
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6 text-slate-400 hover:text-slate-700"
          disabled={isFirst}
          onClick={onMoveUp}
          title="Move up"
        >
          <ChevronUp className="h-3.5 w-3.5" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6 text-slate-400 hover:text-slate-700"
          disabled={isLast}
          onClick={onMoveDown}
          title="Move down"
        >
          <ChevronDown className="h-3.5 w-3.5" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6 text-red-300 hover:text-red-600 hover:bg-red-50"
          onClick={onRemove}
          title="Remove action"
        >
          <X className="h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  )
}
