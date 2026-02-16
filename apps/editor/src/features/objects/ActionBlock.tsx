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
  X,
  Locate,
  Variable,
  Dices,
  ArrowLeftRight,
  DoorOpen,
  RotateCcw,
  Hourglass,
  MessageSquare
} from "lucide-react"
import { Button } from "../../components/ui/button.js"
import type { ObjectActionDraft, ProjectV1, ValueExpression, VariableValue } from "@creadordejocs/project-format"
import { VariablePicker } from "./VariablePicker.js"
import { RightValuePicker } from "./RightValuePicker.js"
import type { ObjectEventType } from "../editor-state/types.js"

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
  globalVariables: ProjectV1["variables"]["global"]
  objectVariablesByObjectId: ProjectV1["variables"]["objectByObjectId"]
  roomInstances: ProjectV1["rooms"][number]["instances"]
  allObjects: ProjectV1["objects"]
  rooms: ProjectV1["rooms"]
  selectedObjectVariables: ProjectV1["variables"]["global"]
  eventType: ObjectEventType
}

const ACTION_ICONS: Partial<Record<ObjectActionDraft["type"], React.ElementType>> = {
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
  changeVariable: Variable,
  randomizeVariable: Dices,
  copyVariable: ArrowLeftRight,
  goToRoom: DoorOpen,
  restartRoom: RotateCcw,
  wait: Hourglass
}

const ACTION_LABELS: Partial<Record<ObjectActionDraft["type"], string>> = {
  move: "Moure",
  setVelocity: "Velocitat",
  rotate: "Rotar",
  moveToward: "Anar cap a",
  clampToRoom: "Limitar a la pantalla",
  teleport: "Teleport",
  destroySelf: "Destruir-se",
  destroyOther: "Destruir altre",
  spawnObject: "Crear obj.",
  changeScore: "Punts",
  endGame: "Fi joc",
  message: "Missatge",
  changeVariable: "Variable",
  randomizeVariable: "Aleatori",
  copyVariable: "Copiar var.",
  goToRoom: "Anar a sala",
  restartRoom: "Reiniciar",
  wait: "Esperar",
}

// Operator labels used in the UI are inlined in the select options

function asLiteralValue(value: VariableValue): ValueExpression {
  return { source: "literal", value }
}

function canBeNumericExpression(value: ValueExpression): boolean {
  if (typeof value === "number") {
    return true
  }
  if (typeof value === "string" || typeof value === "boolean") {
    return false
  }
  if ("source" in value) {
    if (value.source === "literal") {
      return typeof value.value === "number"
    }
    return true
  }
  return true
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
  globalVariables,
  objectVariablesByObjectId,
  roomInstances,
  allObjects,
  rooms,
  selectedObjectVariables,
  eventType
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
  const internalVariableOptions = selectedObjectVariables.map((definition) => ({
    id: definition.id,
    label: definition.name,
    type: definition.type,
    objectName: ""
  }))
  const allowOtherTarget = eventType === "Collision"
  const selectedGlobalVariableForChange =
    action.type === "changeVariable" && action.scope === "global"
      ? globalVariables.find((definition) => definition.id === action.variableId)
      : null
  const selectedObjectVariableForChange =
    action.type === "changeVariable" && action.scope === "object"
      ? objectVariableOptions.find((definition) => definition.id === action.variableId)
      : null
  const changeVariableExpectedType =
    selectedGlobalVariableForChange?.type ?? selectedObjectVariableForChange?.type ?? "number"

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
              <RightValuePicker
                value={action.dx}
                expectedType="number"
                globalVariables={globalVariables}
                internalVariables={internalVariableOptions}
                allowOtherTarget={allowOtherTarget}
                onChange={(nextValue) => onUpdate({ ...action, dx: nextValue as typeof action.dx })}
              />
            </div>
            <div className="flex items-center gap-1">
              <label className="text-[10px] font-medium opacity-60">DY</label>
              <RightValuePicker
                value={action.dy}
                expectedType="number"
                globalVariables={globalVariables}
                internalVariables={internalVariableOptions}
                allowOtherTarget={allowOtherTarget}
                onChange={(nextValue) => onUpdate({ ...action, dy: nextValue as typeof action.dy })}
              />
            </div>
          </>
        )}

        {action.type === "setVelocity" && (
          <>
            <div className="flex items-center gap-1">
              <label className="text-[10px] font-medium opacity-60">Speed</label>
              <RightValuePicker
                value={action.speed}
                expectedType="number"
                globalVariables={globalVariables}
                internalVariables={internalVariableOptions}
                allowOtherTarget={allowOtherTarget}
                onChange={(nextValue) => onUpdate({ ...action, speed: nextValue as typeof action.speed })}
              />
            </div>
            <div className="flex items-center gap-1">
              <label className="text-[10px] font-medium opacity-60">Dir</label>
              <RightValuePicker
                value={action.direction}
                expectedType="number"
                globalVariables={globalVariables}
                internalVariables={internalVariableOptions}
                allowOtherTarget={allowOtherTarget}
                onChange={(nextValue) => onUpdate({ ...action, direction: nextValue as typeof action.direction })}
              />
            </div>
          </>
        )}

        {action.type === "rotate" && (
          <>
            <select
              className="action-block-rotate-mode h-7 rounded border border-slate-300 bg-white/50 px-2 text-xs"
              value={action.mode}
              onChange={(event) => onUpdate({ ...action, mode: event.target.value as "set" | "add" })}
            >
              <option value="set">Set</option>
              <option value="add">Add</option>
            </select>
            <div className="action-block-rotate-angle-field flex items-center gap-1">
              <label className="text-[10px] font-medium opacity-60">Angle</label>
              <RightValuePicker
                value={action.angle}
                expectedType="number"
                globalVariables={globalVariables}
                internalVariables={internalVariableOptions}
                allowOtherTarget={allowOtherTarget}
                onChange={(nextValue) => onUpdate({ ...action, angle: nextValue as typeof action.angle })}
              />
            </div>
          </>
        )}

        {action.type === "moveToward" && (
          <>
            <select
              className="action-block-move-toward-target-type h-7 rounded border border-slate-300 bg-white/50 px-2 text-xs"
              value={action.targetType}
              onChange={(event) =>
                onUpdate({
                  ...action,
                  targetType: event.target.value as "object" | "mouse",
                  targetObjectId: event.target.value === "object" ? (action.targetObjectId ?? selectableObjects[0]?.id ?? null) : null
                })
              }
            >
              <option value="object">Objecte</option>
              <option value="mouse">Ratoli</option>
            </select>
            {action.targetType === "object" && (
              <select
                className="action-block-move-toward-object-select h-7 rounded border border-slate-300 bg-white/50 px-2 text-xs focus:outline-none"
                value={action.targetObjectId ?? ""}
                onChange={(event) => onUpdate({ ...action, targetObjectId: event.target.value || null })}
              >
                {selectableObjects.length === 0 ? (
                  <option value="">No objectes</option>
                ) : (
                  selectableObjects.map((obj) => (
                    <option key={obj.id} value={obj.id}>
                      {obj.name}
                    </option>
                  ))
                )}
              </select>
            )}
            <div className="action-block-move-toward-speed-field flex items-center gap-1">
              <label className="text-[10px] font-medium opacity-60">Speed</label>
              <RightValuePicker
                value={action.speed}
                expectedType="number"
                globalVariables={globalVariables}
                internalVariables={internalVariableOptions}
                allowOtherTarget={allowOtherTarget}
                onChange={(nextValue) => onUpdate({ ...action, speed: nextValue as typeof action.speed })}
              />
            </div>
          </>
        )}

        {action.type === "spawnObject" && (
          <>
            <select
              className="action-block-spawn-select h-7 rounded border border-slate-300 bg-white/50 px-2 text-xs focus:outline-none"
              value={action.objectId}
              onChange={(e) => onUpdate({ ...action, objectId: e.target.value })}
            >
              {selectableObjects.map((obj) => (
                <option key={obj.id} value={obj.id}>{obj.name}</option>
              ))}
            </select>
            <div className="flex items-center gap-1">
              <label className="text-[10px] font-medium opacity-60">X</label>
              <RightValuePicker
                value={action.offsetX}
                expectedType="number"
                globalVariables={globalVariables}
                internalVariables={internalVariableOptions}
                allowOtherTarget={allowOtherTarget}
                onChange={(nextValue) => onUpdate({ ...action, offsetX: nextValue as typeof action.offsetX })}
              />
            </div>
            <div className="flex items-center gap-1">
              <label className="text-[10px] font-medium opacity-60">Y</label>
              <RightValuePicker
                value={action.offsetY}
                expectedType="number"
                globalVariables={globalVariables}
                internalVariables={internalVariableOptions}
                allowOtherTarget={allowOtherTarget}
                onChange={(nextValue) => onUpdate({ ...action, offsetY: nextValue as typeof action.offsetY })}
              />
            </div>
          </>
        )}

        {action.type === "changeScore" && (
          <div className="flex items-center gap-1">
            <label className="text-[10px] font-medium opacity-60">+/−</label>
            <RightValuePicker
              value={action.delta}
              expectedType="number"
              globalVariables={globalVariables}
              internalVariables={internalVariableOptions}
              allowOtherTarget={allowOtherTarget}
              onChange={(nextValue) => onUpdate({ ...action, delta: nextValue as typeof action.delta })}
            />
          </div>
        )}

        {action.type === "teleport" && (
          <>
            <select
              className="action-block-teleport-mode h-7 rounded border border-slate-300 bg-white/50 px-2 text-xs"
              value={action.mode}
              onChange={(event) =>
                onUpdate({
                  ...action,
                  mode: event.target.value as "position" | "start" | "mouse",
                  x: event.target.value === "position" ? (action.x ?? 0) : null,
                  y: event.target.value === "position" ? (action.y ?? 0) : null
                })
              }
            >
              <option value="position">Position</option>
              <option value="start">Start</option>
              <option value="mouse">Mouse</option>
            </select>
            {action.mode === "position" && (
              <>
                <div className="flex items-center gap-1">
                  <label className="text-[10px] font-medium opacity-60">X</label>
                  <RightValuePicker
                    value={action.x ?? asLiteralValue(0)}
                    expectedType="number"
                    globalVariables={globalVariables}
                    internalVariables={internalVariableOptions}
                    allowOtherTarget={allowOtherTarget}
                    onChange={(nextValue) => onUpdate({ ...action, x: nextValue as typeof action.x })}
                  />
                </div>
                <div className="flex items-center gap-1">
                  <label className="text-[10px] font-medium opacity-60">Y</label>
                  <RightValuePicker
                    value={action.y ?? asLiteralValue(0)}
                    expectedType="number"
                    globalVariables={globalVariables}
                    internalVariables={internalVariableOptions}
                    allowOtherTarget={allowOtherTarget}
                    onChange={(nextValue) => onUpdate({ ...action, y: nextValue as typeof action.y })}
                  />
                </div>
              </>
            )}
          </>
        )}

        {action.type === "endGame" && (
          <div className="flex items-center gap-1 flex-1">
            <label className="text-[10px] font-medium opacity-60">Msg</label>
            <RightValuePicker
              value={action.message}
              expectedType="string"
              globalVariables={globalVariables}
              internalVariables={internalVariableOptions}
              allowOtherTarget={allowOtherTarget}
              onChange={(nextValue) => onUpdate({ ...action, message: nextValue as typeof action.message })}
            />
          </div>
        )}

        {action.type === "message" && (
          <>
            <div className="action-block-message-text-field flex items-center gap-1 flex-1">
              <label className="text-[10px] font-medium opacity-60">Msg</label>
              <RightValuePicker
                value={action.text}
                expectedType="string"
                globalVariables={globalVariables}
                internalVariables={internalVariableOptions}
                allowOtherTarget={allowOtherTarget}
                onChange={(nextValue) => onUpdate({ ...action, text: nextValue as typeof action.text })}
              />
            </div>
            <div className="action-block-message-duration-field flex items-center gap-1">
              <label className="text-[10px] font-medium opacity-60">ms</label>
              <RightValuePicker
                value={action.durationMs}
                expectedType="number"
                globalVariables={globalVariables}
                internalVariables={internalVariableOptions}
                allowOtherTarget={allowOtherTarget}
                onChange={(nextValue) => onUpdate({ ...action, durationMs: nextValue as typeof action.durationMs })}
              />
            </div>
          </>
        )}

        {action.type === "goToRoom" && (
          <select
            className="action-block-room-select h-7 min-w-[140px] rounded border border-slate-300 bg-white/50 px-2 text-xs focus:outline-none"
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

        {action.type === "wait" && (
          <div className="action-block-wait-field flex items-center gap-1">
            <label className="text-[10px] font-medium opacity-60">ms</label>
            <RightValuePicker
              value={action.durationMs}
              expectedType="number"
              globalVariables={globalVariables}
              internalVariables={internalVariableOptions}
              allowOtherTarget={allowOtherTarget}
              onChange={(nextValue) => onUpdate({ ...action, durationMs: nextValue as typeof action.durationMs })}
            />
          </div>
        )}

        {action.type === "changeVariable" && (
          <>
            <VariablePicker
              scope={action.scope}
              variableId={action.variableId}
              globalVariables={globalVariables}
              objectVariables={objectVariableOptions}
              showTarget={allowOtherTarget}
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
                    value: action.operator === "set" ? asLiteralValue(selected.initialValue) : asLiteralValue(0)
                  })
                } else {
                  const selected = objectVariableOptions.find((o) => o.id === nextVariableId)
                  const selectedObjectDefinition = selectedObjectVariables.find((definition) => definition.id === nextVariableId)
                  if (!selected) return
                  onUpdate({
                    ...action,
                    scope: "object",
                    variableId: nextVariableId,
                    target: action.scope === "object" ? (action.target ?? "self") : "self",
                    targetInstanceId: action.scope === "object" ? (action.targetInstanceId ?? null) : null,
                    value:
                      action.operator === "set"
                        ? asLiteralValue(selectedObjectDefinition?.initialValue ?? 0)
                        : asLiteralValue(0)
                  })
                }
              }}
            />
            <select
              className="action-block-operator-select h-7 w-14 rounded border border-slate-300 bg-white/50 px-2 text-xs font-bold text-center"
              value={action.operator}
              onChange={(event) => {
                const newOp = event.target.value as "set" | "add" | "subtract" | "multiply"
                if (newOp !== "set" && !canBeNumericExpression(action.value)) {
                  onUpdate({ ...action, operator: newOp, value: asLiteralValue(0) })
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
            <RightValuePicker
              value={action.value}
              expectedType={action.operator === "set" ? changeVariableExpectedType : "number"}
              globalVariables={globalVariables}
              internalVariables={internalVariableOptions}
              allowOtherTarget={allowOtherTarget}
              onChange={(nextValue) => onUpdate({ ...action, value: nextValue })}
            />
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
                showTarget={leftScope === "object" && allowOtherTarget}
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
                showTarget={rightScope === "object" && allowOtherTarget}
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

        {action.type === "randomizeVariable" && (
          <>
            <VariablePicker
              scope={action.scope}
              variableId={action.variableId}
              globalVariables={globalVariables}
              objectVariables={objectVariableOptions}
              showTarget={allowOtherTarget}
              target={action.scope === "object" ? (action.target ?? "self") : null}
              targetInstanceId={action.scope === "object" ? (action.targetInstanceId ?? null) : null}
              roomInstances={roomInstances}
              filter={(definition) => definition.type === "number"}
              onTargetChange={(nextTarget, nextInstanceId) => {
                onUpdate({
                  ...action,
                  target: nextTarget,
                  targetInstanceId: nextInstanceId
                })
              }}
              onChange={(nextScope, nextVariableId) => {
                if (nextScope === "global") {
                  onUpdate({
                    type: "randomizeVariable",
                    scope: "global",
                    variableId: nextVariableId,
                    min: action.min,
                    max: action.max,
                    step: action.step
                  })
                } else {
                  onUpdate({
                    ...action,
                    type: "randomizeVariable",
                    scope: "object",
                    variableId: nextVariableId,
                    target: action.scope === "object" ? (action.target ?? "self") : "self",
                    targetInstanceId: action.scope === "object" ? (action.targetInstanceId ?? null) : null,
                    step: action.step
                  })
                }
              }}
            />
            <div className="action-block-random-min-field flex items-center gap-1">
              <label className="text-[10px] font-medium opacity-60">Min</label>
              <RightValuePicker
                value={action.min}
                expectedType="number"
                globalVariables={globalVariables}
                internalVariables={internalVariableOptions}
                allowOtherTarget={allowOtherTarget}
                onChange={(nextValue) => onUpdate({ ...action, min: nextValue as typeof action.min })}
              />
            </div>
            <div className="action-block-random-max-field flex items-center gap-1">
              <label className="text-[10px] font-medium opacity-60">Max</label>
              <RightValuePicker
                value={action.max}
                expectedType="number"
                globalVariables={globalVariables}
                internalVariables={internalVariableOptions}
                allowOtherTarget={allowOtherTarget}
                onChange={(nextValue) => onUpdate({ ...action, max: nextValue as typeof action.max })}
              />
            </div>
            <div className="action-block-random-step-field flex items-center gap-1">
              <label className="text-[10px] font-medium opacity-60">Step</label>
              <RightValuePicker
                value={action.step ?? asLiteralValue(1)}
                expectedType="number"
                globalVariables={globalVariables}
                internalVariables={internalVariableOptions}
                allowOtherTarget={allowOtherTarget}
                onChange={(nextValue) => onUpdate({ ...action, step: nextValue as typeof action.step })}
              />
            </div>
          </>
        )}
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
