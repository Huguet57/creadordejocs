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
import { useEffect, useRef, useState } from "react"
import { Button } from "../../components/ui/button.js"
import { Input } from "../../components/ui/input.js"
import type { ObjectActionDraft, ProjectV1, VariableType, VariableValue } from "@creadordejocs/project-format"
import { VariablePicker } from "./VariablePicker.js"

function numInputWidth(raw: string, minCh: number): string {
  return `${Math.max(minCh, raw.length + 2)}ch`
}

/** Numeric text input: free typing, auto-width, red border when invalid & unfocused */
function NumInput({ value, onChange, className, minCh = 6 }: { value: number; onChange: (v: number) => void; className?: string; minCh?: number }) {
  const [raw, setRaw] = useState(String(value))
  const [focused, setFocused] = useState(false)
  const lastExternal = useRef(value)

  // Sync when external value changes (not from local edits)
  useEffect(() => {
    if (value !== lastExternal.current) {
      lastExternal.current = value
      if (!focused) setRaw(String(value))
    }
  }, [value, focused])

  const parsed = Number(raw)
  const isValid = raw !== "" && Number.isFinite(parsed)
  const isError = !focused && !isValid

  return (
    <Input
      type="text"
      inputMode="numeric"
      className={`h-7 px-2 text-xs ${isError ? "border-red-400 bg-red-50" : "bg-white/50 border-slate-300"} ${className ?? ""}`}
      style={{ width: numInputWidth(raw, minCh) }}
      value={focused ? raw : String(value)}
      onChange={(e) => {
        setRaw(e.target.value)
        const n = Number(e.target.value)
        if (Number.isFinite(n)) {
          lastExternal.current = n
          onChange(n)
        }
      }}
      onFocus={() => {
        setRaw(String(value))
        setFocused(true)
      }}
      onBlur={() => {
        setFocused(false)
        if (isValid) {
          lastExternal.current = parsed
          onChange(parsed)
          setRaw(String(parsed))
        }
      }}
    />
  )
}

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
  clampToRoom: "Limitar",
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
              <NumInput value={action.dx} onChange={(v) => onUpdate({ ...action, dx: v })} />
            </div>
            <div className="flex items-center gap-1">
              <label className="text-[10px] font-medium opacity-60">DY</label>
              <NumInput value={action.dy} onChange={(v) => onUpdate({ ...action, dy: v })} />
            </div>
          </>
        )}

        {action.type === "setVelocity" && (
          <>
            <div className="flex items-center gap-1">
              <label className="text-[10px] font-medium opacity-60">Speed</label>
              <NumInput value={action.speed} onChange={(v) => onUpdate({ ...action, speed: v })} />
            </div>
            <div className="flex items-center gap-1">
              <label className="text-[10px] font-medium opacity-60">Dir</label>
              <NumInput value={action.direction} onChange={(v) => onUpdate({ ...action, direction: v })} />
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
              <NumInput value={action.angle} onChange={(v) => onUpdate({ ...action, angle: v })} />
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
              <NumInput value={action.speed} onChange={(v) => onUpdate({ ...action, speed: v })} />
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
              <NumInput value={action.offsetX} onChange={(v) => onUpdate({ ...action, offsetX: v })} />
            </div>
            <div className="flex items-center gap-1">
              <label className="text-[10px] font-medium opacity-60">Y</label>
              <NumInput value={action.offsetY} onChange={(v) => onUpdate({ ...action, offsetY: v })} />
            </div>
          </>
        )}

        {action.type === "changeScore" && (
          <div className="flex items-center gap-1">
            <label className="text-[10px] font-medium opacity-60">+/−</label>
            <NumInput value={action.delta} onChange={(v) => onUpdate({ ...action, delta: v })} />
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
                  <NumInput value={action.x ?? 0} onChange={(v) => onUpdate({ ...action, x: v })} />
                </div>
                <div className="flex items-center gap-1">
                  <label className="text-[10px] font-medium opacity-60">Y</label>
                  <NumInput value={action.y ?? 0} onChange={(v) => onUpdate({ ...action, y: v })} />
                </div>
              </>
            )}
          </>
        )}

        {action.type === "endGame" && (
          <div className="flex items-center gap-1 flex-1">
            <label className="text-[10px] font-medium opacity-60">Msg</label>
            <Input
              className="h-7 w-full px-2 text-xs bg-white/50 border-slate-300"
              value={action.message}
              onChange={(e) => onUpdate({ ...action, message: e.target.value })}
            />
          </div>
        )}

        {action.type === "message" && (
          <>
            <div className="action-block-message-text-field flex items-center gap-1 flex-1">
              <label className="text-[10px] font-medium opacity-60">Msg</label>
              <Input
                className="action-block-message-text-input h-7 w-full px-2 text-xs bg-white/50 border-slate-300"
                value={action.text}
                onChange={(event) => onUpdate({ ...action, text: event.target.value })}
              />
            </div>
            <div className="action-block-message-duration-field flex items-center gap-1">
              <label className="text-[10px] font-medium opacity-60">ms</label>
              <NumInput
                value={action.durationMs}
                onChange={(value) => onUpdate({ ...action, durationMs: Math.max(1, Math.round(value)) })}
                className="action-block-message-duration-input"
                minCh={8}
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
            <NumInput
              value={action.durationMs}
              onChange={(v) => onUpdate({ ...action, durationMs: Math.max(1, Math.round(v)) })}
              className="action-block-wait-ms"
              minCh={8}
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
              className="action-block-operator-select h-7 w-14 rounded border border-slate-300 bg-white/50 px-2 text-xs font-bold text-center"
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
                className="action-block-bool-select h-7 w-18 rounded border border-slate-300 bg-white/50 px-2 text-xs"
                value={String(action.value)}
                onChange={(event) => onUpdate({ ...action, value: event.target.value === "true" })}
              >
                <option value="true">true</option>
                <option value="false">false</option>
              </select>
            ) : typeof action.value === "number" ? (
              <NumInput
                value={action.value}
                onChange={(v) => onUpdate({ ...action, value: v })}
              />
            ) : (
              <Input
                type="text"
                className="h-7 px-2 text-xs bg-white/50 border-slate-300"
                style={{ width: `${Math.max(6, formatValue(action.value).length + 2)}ch` }}
                value={formatValue(action.value)}
                onChange={(event) => {
                  onUpdate({ ...action, value: event.target.value })
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

        {action.type === "randomizeVariable" && (
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
                    max: action.max
                  })
                } else {
                  onUpdate({
                    ...action,
                    type: "randomizeVariable",
                    scope: "object",
                    variableId: nextVariableId,
                    target: action.scope === "object" ? (action.target ?? "self") : "self",
                    targetInstanceId: action.scope === "object" ? (action.targetInstanceId ?? null) : null
                  })
                }
              }}
            />
            <div className="action-block-random-min-field flex items-center gap-1">
              <label className="text-[10px] font-medium opacity-60">Min</label>
              <NumInput
                value={action.min}
                onChange={(v) => onUpdate({ ...action, min: Math.round(v) })}
                className="action-block-random-min-input"
              />
            </div>
            <div className="action-block-random-max-field flex items-center gap-1">
              <label className="text-[10px] font-medium opacity-60">Max</label>
              <NumInput
                value={action.max}
                onChange={(v) => onUpdate({ ...action, max: Math.round(v) })}
                className="action-block-random-max-input"
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
