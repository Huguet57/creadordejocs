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
  Variable,
  ArrowLeftRight,
  DoorOpen,
  RotateCcw
} from "lucide-react"
import { Button } from "../../components/ui/button.js"
import { Input } from "../../components/ui/input.js"
import type { ObjectActionDraft, ProjectV1, VariableType, VariableValue } from "@creadordejocs/project-format"
import { type ObjectActionType } from "../editor-state/types.js"
import { VariablePicker } from "./VariablePicker.js"

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
  rooms: ProjectV1["rooms"]
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

const ACTION_LABELS: Record<ObjectActionType, string> = {
  move: "Moure",
  setVelocity: "Velocitat",
  clampToRoom: "Limitar",
  teleport: "Teleport",
  destroySelf: "Destruir-se",
  destroyOther: "Destruir altre",
  spawnObject: "Crear obj.",
  changeScore: "Punts",
  endGame: "Fi joc",
  playSound: "So",
  changeVariable: "Variable",
  copyVariable: "Copiar var.",
  goToRoom: "Anar a sala",
  restartRoom: "Reiniciar",
}

// Operator labels used in the UI are inlined in the select options

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
  allObjects,
  rooms
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

  const selectedGlobalForCopy =
    action.type === "copyVariable"
      ? globalVariables.find((definition) => definition.id === action.globalVariableId)
      : null
  const compatibleObjectOptionsForCopy = selectedGlobalForCopy
    ? objectVariableOptions.filter((option) => option.type === selectedGlobalForCopy.type)
    : objectVariableOptions

  return (
    <div className="action-block-container group flex items-center gap-3 py-2 px-3 bg-slate-50 hover:bg-slate-100/60 transition-colors">
      <div className="action-block-label flex items-center gap-1.5 min-w-[90px] shrink-0">
        <Icon className="h-3.5 w-3.5 text-slate-400 shrink-0" />
        <span className="text-[10px] font-semibold uppercase tracking-wide text-slate-500 leading-tight">
          {ACTION_LABELS[action.type]}
        </span>
      </div>

      <div className="action-block-fields flex-1 flex items-center gap-3 flex-wrap">
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
              className="action-block-spawn-select h-6 rounded border border-slate-300 bg-white/50 px-1 text-xs focus:outline-none"
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
            className="action-block-sound-select h-6 rounded border border-slate-300 bg-white/50 px-1 text-xs focus:outline-none min-w-[120px]"
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

        {action.type === "teleport" && (
          <>
            <select
              className="action-block-teleport-mode h-6 rounded border border-slate-300 bg-white/50 px-1 text-xs"
              value={action.mode}
              onChange={(event) =>
                onUpdate({
                  ...action,
                  mode: event.target.value as "position" | "start",
                  x: event.target.value === "position" ? (action.x ?? 0) : null,
                  y: event.target.value === "position" ? (action.y ?? 0) : null
                })
              }
            >
              <option value="position">Position</option>
              <option value="start">Start</option>
            </select>
            {action.mode === "position" && (
              <>
                <div className="flex items-center gap-1">
                  <label className="text-[10px] font-medium opacity-60">X</label>
                  <Input
                    type="number"
                    className="h-6 w-16 px-1 text-xs bg-white/50 border-slate-300"
                    value={action.x ?? 0}
                    onChange={(e) => onUpdate({ ...action, x: Number(e.target.value) })}
                  />
                </div>
                <div className="flex items-center gap-1">
                  <label className="text-[10px] font-medium opacity-60">Y</label>
                  <Input
                    type="number"
                    className="h-6 w-16 px-1 text-xs bg-white/50 border-slate-300"
                    value={action.y ?? 0}
                    onChange={(e) => onUpdate({ ...action, y: Number(e.target.value) })}
                  />
                </div>
              </>
            )}
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

        {action.type === "goToRoom" && (
          <select
            className="action-block-room-select h-6 min-w-[140px] rounded border border-slate-300 bg-white/50 px-1 text-xs focus:outline-none"
            value={action.roomId}
            onChange={(event) => onUpdate({ ...action, roomId: event.target.value })}
          >
            {rooms.map((room) => (
              <option key={room.id} value={room.id}>
                {room.name}
              </option>
            ))}
          </select>
        )}

        {action.type === "restartRoom" && <span className="text-[10px] font-medium text-slate-500">Sala actual</span>}

        {action.type === "changeVariable" && (
          <>
            <VariablePicker
              scope={action.scope}
              variableId={action.variableId}
              globalVariables={globalVariables}
              objectVariables={objectVariableOptions}
              showTarget
              target={action.scope === "object" ? (action.target ?? "self") : null}
              targetInstanceId={action.scope === "object" ? (action.targetInstanceId ?? null) : null}
              roomInstances={roomInstances}
              onTargetChange={(nextTarget, nextInstanceId) => {
                onUpdate({
                  ...action,
                  target: nextTarget,
                  targetInstanceId: nextInstanceId
                })
              }}
              {...(action.operator !== "set" ? { filter: (v: { type: string }) => v.type === "number" } : {})}
              onChange={(nextScope, nextVariableId) => {
                if (nextScope === "global") {
                  const selected = globalVariables.find((d) => d.id === nextVariableId)
                  if (!selected) return
                  onUpdate({
                    scope: "global",
                    type: "changeVariable",
                    variableId: nextVariableId,
                    operator: action.operator,
                    value: action.operator === "set" ? selected.initialValue : 0
                  })
                } else {
                  const selected = objectVariableOptions.find((o) => o.id === nextVariableId)
                  if (!selected) return
                  onUpdate({
                    ...action,
                    scope: "object",
                    variableId: nextVariableId,
                    target: action.scope === "object" ? (action.target ?? "self") : "self",
                    targetInstanceId: action.scope === "object" ? (action.targetInstanceId ?? null) : null,
                    value: action.operator === "set" ? parseValueForType(selected.type, formatValue(action.value)) : 0
                  })
                }
              }}
            />
            <select
              className="action-block-operator-select h-6 w-12 rounded border border-slate-300 bg-white/50 px-1 text-xs font-bold text-center"
              value={action.operator}
              onChange={(event) => {
                const newOp = event.target.value as "set" | "add" | "subtract" | "multiply"
                if (newOp !== "set" && typeof action.value !== "number") {
                  onUpdate({ ...action, operator: newOp, value: 0 })
                } else {
                  onUpdate({ ...action, operator: newOp })
                }
              }}
            >
              <option value="set">=</option>
              <option value="add">+</option>
              <option value="subtract">−</option>
              <option value="multiply">×</option>
            </select>
            {typeof action.value === "boolean" ? (
              <select
                className="action-block-bool-select h-6 w-16 rounded border border-slate-300 bg-white/50 px-1 text-xs"
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
                  const selected =
                    action.scope === "global"
                      ? globalVariables.find((definition) => definition.id === action.variableId)
                      : objectVariableOptions.find((option) => option.id === action.variableId)
                  if (!selected) return
                  const selectedType = "type" in selected ? selected.type : "string"
                  onUpdate({ ...action, value: parseValueForType(selectedType, event.target.value) })
                }}
              />
            )}
          </>
        )}

        {action.type === "copyVariable" && (() => {
          const isGlobalToObject = action.direction === "globalToObject"
          const leftScope = isGlobalToObject ? "global" as const : "object" as const
          const rightScope = isGlobalToObject ? "object" as const : "global" as const
          const leftVarId = isGlobalToObject ? action.globalVariableId : action.objectVariableId
          const rightVarId = isGlobalToObject ? action.objectVariableId : action.globalVariableId

          return (
            <>
              {/* Source (A) */}
              <VariablePicker
                scope={leftScope}
                variableId={leftVarId}
                globalVariables={globalVariables}
                objectVariables={compatibleObjectOptionsForCopy}
                showTarget={leftScope === "object"}
                target={leftScope === "object" ? action.instanceTarget : null}
                targetInstanceId={leftScope === "object" ? (action.instanceTargetId ?? null) : null}
                roomInstances={roomInstances}
                onTargetChange={(nextTarget, nextInstanceId) => {
                  onUpdate({ ...action, instanceTarget: nextTarget, instanceTargetId: nextInstanceId })
                }}
                onChange={(nextScope, nextVarId) => {
                  if (nextScope === "global") {
                    // Left picked global → direction = globalToObject
                    onUpdate({ ...action, direction: "globalToObject", globalVariableId: nextVarId })
                  } else {
                    // Left picked object → direction = objectToGlobal
                    onUpdate({ ...action, direction: "objectToGlobal", objectVariableId: nextVarId })
                  }
                }}
              />
              <span className="text-[10px] font-bold text-slate-400 shrink-0">→</span>
              {/* Destination (B) */}
              <VariablePicker
                scope={rightScope}
                variableId={rightVarId}
                globalVariables={globalVariables}
                objectVariables={compatibleObjectOptionsForCopy}
                allowedScopes={[rightScope]}
                showTarget={rightScope === "object"}
                target={rightScope === "object" ? action.instanceTarget : null}
                targetInstanceId={rightScope === "object" ? (action.instanceTargetId ?? null) : null}
                roomInstances={roomInstances}
                onTargetChange={(nextTarget, nextInstanceId) => {
                  onUpdate({ ...action, instanceTarget: nextTarget, instanceTargetId: nextInstanceId })
                }}
                onChange={(_nextScope, nextVarId) => {
                  if (rightScope === "global") {
                    onUpdate({ ...action, globalVariableId: nextVarId })
                  } else {
                    onUpdate({ ...action, objectVariableId: nextVarId })
                  }
                }}
              />
            </>
          )
        })()}
      </div>

      <div className="action-block-controls flex items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100 focus-within:opacity-100">
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
