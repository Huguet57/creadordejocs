import {
  Move,
  X,
  GripVertical
} from "lucide-react"
import { useEffect, useState, type ComponentProps } from "react"
import { Button } from "../../components/ui/button.js"
import {
  ACTION_REGISTRY,
  createEditorDefaultAction,
  generateUUID,
  type ObjectActionDraft,
  type ProjectV1,
  type ValueExpression
} from "@creadordejocs/project-format"
import { VariablePicker } from "./VariablePicker.js"
import { RightValuePicker as BaseRightValuePicker } from "./RightValuePicker.js"
import type { ObjectActionType, ObjectEventType } from "../editor-state/types.js"
import { ACTION_ICON_MAP } from "./action-icon-map.js"

type ActionBlockProps = {
  action: ObjectActionDraft & { id: string }
  index: number
  isFirst: boolean
  isLast: boolean
  onUpdate: (action: ObjectActionDraft) => void
  onMoveUp: () => void
  onMoveDown: () => void
  onRemove: () => void
  onCopy: () => void
  onPaste: () => void
  canPaste: boolean
  selectableObjects: { id: string; name: string }[]
  globalVariables: ProjectV1["variables"]["global"]
  objectVariablesByObjectId: ProjectV1["variables"]["objectByObjectId"]
  roomInstances: ProjectV1["rooms"][number]["instances"]
  allObjects: ProjectV1["objects"]
  rooms: ProjectV1["rooms"]
  selectedObjectVariables: ProjectV1["variables"]["global"]
  eventType: ObjectEventType
  collisionTargetName?: string | null | undefined
  isDragging?: boolean
  dropIndicator?: "top" | "bottom" | null
  onDragStartAction?: (actionId: string) => void
  onDragOverAction?: (actionId: string, position: "top" | "bottom") => void
  onDropOnAction?: (actionId: string, position: "top" | "bottom") => void
  onDragEndAction?: () => void
  iterationVariables?: { name: string; type: "number" | "string" | "boolean" }[]
}

type ActionContextMenuState = {
  x: number
  y: number
} | null

// Operator labels used in the UI are inlined in the select options

function asLiteralValue(value: string | number | boolean): ValueExpression {
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

function isFlowAction(
  action: ObjectActionDraft & { id: string }
): action is Extract<ObjectActionDraft & { id: string }, { type: "repeat" | "forEachList" | "forEachMap" }> {
  return action.type === "repeat" || action.type === "forEachList" || action.type === "forEachMap"
}

export function ActionBlock({
  action,
  onUpdate,
  onRemove,
  onCopy,
  onPaste,
  canPaste,
  selectableObjects,
  globalVariables,
  objectVariablesByObjectId,
  roomInstances,
  allObjects,
  rooms,
  selectedObjectVariables,
  eventType,
  collisionTargetName,
  isDragging = false,
  dropIndicator = null,
  onDragStartAction,
  onDragOverAction,
  onDropOnAction,
  onDragEndAction,
  iterationVariables = []
}: ActionBlockProps) {
  const Icon = ACTION_ICON_MAP[action.type] ?? Move
  const actionLabel = ACTION_REGISTRY.find((entry) => entry.type === action.type)?.ui.shortLabel ?? action.type
  const isDestroySelfAction = action.type === "destroySelf"
  const objectVariableOptions = allObjects.flatMap((objectEntry) =>
    (objectVariablesByObjectId[objectEntry.id] ?? []).map((definition) => ({
      id: definition.id,
      objectName: objectEntry.name,
      label: `${objectEntry.name}.${definition.name}`,
      type: definition.type
    }))
  ).filter((definition) => definition.type === "number" || definition.type === "string" || definition.type === "boolean")
  const scalarGlobalVariables = globalVariables.filter(
    (definition): definition is Extract<typeof globalVariables[number], { type: "number" | "string" | "boolean" }> =>
      definition.type === "number" || definition.type === "string" || definition.type === "boolean"
  )

  const selectedGlobalForCopy =
    action.type === "copyVariable"
      ? scalarGlobalVariables.find((definition) => definition.id === action.globalVariableId)
      : null
  const compatibleObjectOptionsForCopy = selectedGlobalForCopy
    ? objectVariableOptions.filter((option) => option.type === selectedGlobalForCopy.type)
    : objectVariableOptions
  const internalVariableOptions = selectedObjectVariables.map((definition) => ({
    id: definition.id,
    label: definition.name,
    type: definition.type,
    objectName: ""
  })).filter((definition) => definition.type === "number" || definition.type === "string" || definition.type === "boolean")
  const scalarSelectedObjectVariables = selectedObjectVariables.filter(
    (definition): definition is Extract<typeof selectedObjectVariables[number], { type: "number" | "string" | "boolean" }> =>
      definition.type === "number" || definition.type === "string" || definition.type === "boolean"
  )
  const allowOtherTarget = eventType === "Collision"
  const selectedGlobalVariableForChange =
    action.type === "changeVariable" && action.scope === "global"
      ? scalarGlobalVariables.find((definition) => definition.id === action.variableId)
      : null
  const selectedObjectVariableForChange =
    action.type === "changeVariable" && action.scope === "object"
      ? objectVariableOptions.find((definition) => definition.id === action.variableId)
      : null
  const changeVariableExpectedType =
    selectedGlobalVariableForChange?.type ?? selectedObjectVariableForChange?.type ?? "number"
  const normalizedChangeVariableExpectedType: "number" | "string" | "boolean" =
    changeVariableExpectedType === "number" || changeVariableExpectedType === "string" || changeVariableExpectedType === "boolean"
      ? changeVariableExpectedType
      : "number"
  const listGlobalOptions = globalVariables.filter(
    (definition): definition is Extract<typeof globalVariables[number], { type: "list" }> => definition.type === "list"
  )
  const mapGlobalOptions = globalVariables.filter(
    (definition): definition is Extract<typeof globalVariables[number], { type: "map" }> => definition.type === "map"
  )
  const listObjectOptions = selectedObjectVariables.filter(
    (definition): definition is Extract<typeof selectedObjectVariables[number], { type: "list" }> => definition.type === "list"
  )
  const mapObjectOptions = selectedObjectVariables.filter(
    (definition): definition is Extract<typeof selectedObjectVariables[number], { type: "map" }> => definition.type === "map"
  )
  const flowIterationVariables = (() => {
    if (!isFlowAction(action)) {
      return iterationVariables
    }
    if (action.type === "repeat") {
      return [...iterationVariables, { name: "index", type: "number" as const }]
    }
    if (action.type === "forEachList") {
      const itemType =
        action.scope === "global"
          ? (listGlobalOptions.find((entry) => entry.id === action.variableId)?.itemType ?? "number")
          : (listObjectOptions.find((entry) => entry.id === action.variableId)?.itemType ?? "number")
      return [
        ...iterationVariables,
        { name: action.itemLocalVarName, type: itemType },
        ...(action.indexLocalVarName ? [{ name: action.indexLocalVarName, type: "number" as const }] : [])
      ]
    }
    const valueType =
      action.scope === "global"
        ? (mapGlobalOptions.find((entry) => entry.id === action.variableId)?.itemType ?? "number")
        : (mapObjectOptions.find((entry) => entry.id === action.variableId)?.itemType ?? "number")
    return [
      ...iterationVariables,
      { name: action.keyLocalVarName, type: "string" as const },
      { name: action.valueLocalVarName, type: valueType }
    ]
  })()
  const [contextMenu, setContextMenu] = useState<ActionContextMenuState>(null)
  const [newNestedActionType, setNewNestedActionType] = useState<ObjectActionType>("changeScore")
  const RightValuePicker = (
    props: Omit<ComponentProps<typeof BaseRightValuePicker>, "iterationVariables">
  ) => <BaseRightValuePicker {...props} iterationVariables={iterationVariables} />
  const nestedFlowActions = isFlowAction(action)
    ? action.actions.filter(
        (entry): entry is ObjectActionDraft & { id: string } =>
          typeof entry === "object" && entry !== null && "id" in entry && "type" in entry
      )
    : []
  const addNestedFlowAction = () => {
    if (!isFlowAction(action)) {
      return
    }
    const nextDraft = createEditorDefaultAction(newNestedActionType, {
      selectableTargetObjectIds: selectableObjects.map((entry) => entry.id),
      globalVariables,
      objectVariables: selectedObjectVariables,
      roomIds: rooms.map((entry) => entry.id),
      soundIds: []
    })
    if (!nextDraft) {
      return
    }
    onUpdate({
      ...action,
      actions: [...nestedFlowActions, { id: `action-${generateUUID()}`, ...(nextDraft as ObjectActionDraft) }]
    })
  }

  useEffect(() => {
    if (!contextMenu) {
      return
    }
    const closeContextMenu = () => setContextMenu(null)
    window.addEventListener("mousedown", closeContextMenu)
    return () => window.removeEventListener("mousedown", closeContextMenu)
  }, [contextMenu])

  return (
    <div
      className={`action-block-container group relative flex flex-wrap items-center gap-3 py-2 px-3 bg-slate-50 hover:bg-slate-100/60 transition-colors ${
        isDragging ? "mvp18-action-block-dragging opacity-45" : ""
      }`}
      onContextMenu={(event) => {
        event.preventDefault()
        setContextMenu({
          x: event.clientX,
          y: event.clientY
        })
      }}
      onDragOver={(event) => {
        if (!onDropOnAction) {
          return
        }
        event.preventDefault()
        const targetRect = event.currentTarget.getBoundingClientRect()
        const relativeY = event.clientY - targetRect.top
        const position: "top" | "bottom" = relativeY < targetRect.height / 2 ? "top" : "bottom"
        onDragOverAction?.(action.id, position)
      }}
      onDrop={(event) => {
        if (!onDropOnAction) {
          return
        }
        event.preventDefault()
        const targetRect = event.currentTarget.getBoundingClientRect()
        const relativeY = event.clientY - targetRect.top
        const position: "top" | "bottom" = relativeY < targetRect.height / 2 ? "top" : "bottom"
        onDropOnAction(action.id, position)
      }}
    >
      {dropIndicator === "top" && (
        <div className="mvp18-action-drop-indicator-top pointer-events-none absolute left-2 right-2 top-0 h-0.5 bg-blue-500" />
      )}
      {dropIndicator === "bottom" && (
        <div className="mvp18-action-drop-indicator-bottom pointer-events-none absolute left-2 right-2 bottom-0 h-0.5 bg-blue-500" />
      )}
      <button
        type="button"
        draggable
        className="mvp18-action-drag-handle flex h-6 w-6 shrink-0 items-center justify-center rounded text-slate-300 hover:bg-slate-200 hover:text-slate-600 active:cursor-grabbing cursor-grab"
        title="Reorder action"
        onDragStart={(event) => {
          event.dataTransfer.setData("text/plain", action.id)
          event.dataTransfer.effectAllowed = "move"
          onDragStartAction?.(action.id)
        }}
        onDragEnd={() => onDragEndAction?.()}
      >
        <GripVertical className="h-3.5 w-3.5" />
      </button>
      <div className="action-block-label flex items-center gap-1.5 min-w-[90px] shrink-0">
        <Icon
          className={`h-3.5 w-3.5 shrink-0 ${isDestroySelfAction ? "text-red-500" : "text-slate-400"}`}
        />
        <span
          className={`text-[10px] font-semibold uppercase tracking-wide leading-tight ${
            isDestroySelfAction ? "text-red-600" : "text-slate-500"
          }`}
        >
          {actionLabel}
        </span>
      </div>

      <div className="action-block-fields flex-1 flex items-center gap-3 flex-wrap">
        {action.type === "destroyOther" && collisionTargetName && (
          <span className="action-block-destroy-target-pill inline-flex items-center rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-medium text-slate-500">
            {collisionTargetName}
          </span>
        )}

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
            <select
              className="action-block-spawn-position-mode h-7 rounded border border-slate-300 bg-white/50 px-2 text-xs focus:outline-none"
              value={action.positionMode ?? "relative"}
              onChange={(e) => onUpdate({ ...action, positionMode: e.target.value as "absolute" | "relative" })}
            >
              <option value="absolute">Absolut</option>
              <option value="relative">Relatiu</option>
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

        {action.type === "repeat" && (
          <div className="mvp31-flow-repeat-field flex items-center gap-1">
            <label className="text-[10px] font-medium opacity-60">count</label>
            <RightValuePicker
              value={action.count}
              expectedType="number"
              globalVariables={globalVariables}
              internalVariables={internalVariableOptions}
              allowOtherTarget={allowOtherTarget}
              onChange={(nextValue) => onUpdate({ ...action, count: nextValue as typeof action.count })}
            />
          </div>
        )}

        {action.type === "forEachList" && (
          <>
            <select
              className="mvp31-flow-scope h-7 rounded border border-slate-300 bg-white/50 px-2 text-xs"
              value={action.scope}
              onChange={(event) => {
                const nextScope = event.target.value as "global" | "object"
                const nextVariableId =
                  nextScope === "global" ? (listGlobalOptions[0]?.id ?? "") : (listObjectOptions[0]?.id ?? "")
                onUpdate({
                  ...action,
                  scope: nextScope,
                  variableId: nextVariableId,
                  target: nextScope === "object" ? (action.target ?? "self") : undefined,
                  targetInstanceId: nextScope === "object" ? (action.targetInstanceId ?? null) : undefined
                })
              }}
            >
              <option value="global">global</option>
              <option value="object">object</option>
            </select>
            <select
              className="mvp31-flow-list-var h-7 rounded border border-slate-300 bg-white/50 px-2 text-xs"
              value={action.variableId}
              onChange={(event) => onUpdate({ ...action, variableId: event.target.value })}
            >
              {(action.scope === "global" ? listGlobalOptions : listObjectOptions).map((entry) => (
                <option key={entry.id} value={entry.id}>
                  {entry.name}
                </option>
              ))}
            </select>
            <input
              className="mvp31-flow-local-name h-7 w-20 rounded border border-slate-300 bg-white/50 px-2 text-xs"
              value={action.itemLocalVarName}
              onChange={(event) => onUpdate({ ...action, itemLocalVarName: event.target.value })}
              placeholder="item"
            />
            <input
              className="mvp31-flow-local-index h-7 w-20 rounded border border-slate-300 bg-white/50 px-2 text-xs"
              value={action.indexLocalVarName ?? ""}
              onChange={(event) => onUpdate({ ...action, indexLocalVarName: event.target.value || undefined })}
              placeholder="index"
            />
          </>
        )}

        {action.type === "forEachMap" && (
          <>
            <select
              className="mvp31-flow-scope h-7 rounded border border-slate-300 bg-white/50 px-2 text-xs"
              value={action.scope}
              onChange={(event) => {
                const nextScope = event.target.value as "global" | "object"
                const nextVariableId =
                  nextScope === "global" ? (mapGlobalOptions[0]?.id ?? "") : (mapObjectOptions[0]?.id ?? "")
                onUpdate({
                  ...action,
                  scope: nextScope,
                  variableId: nextVariableId,
                  target: nextScope === "object" ? (action.target ?? "self") : undefined,
                  targetInstanceId: nextScope === "object" ? (action.targetInstanceId ?? null) : undefined
                })
              }}
            >
              <option value="global">global</option>
              <option value="object">object</option>
            </select>
            <select
              className="mvp31-flow-map-var h-7 rounded border border-slate-300 bg-white/50 px-2 text-xs"
              value={action.variableId}
              onChange={(event) => onUpdate({ ...action, variableId: event.target.value })}
            >
              {(action.scope === "global" ? mapGlobalOptions : mapObjectOptions).map((entry) => (
                <option key={entry.id} value={entry.id}>
                  {entry.name}
                </option>
              ))}
            </select>
            <input
              className="mvp31-flow-local-key h-7 w-20 rounded border border-slate-300 bg-white/50 px-2 text-xs"
              value={action.keyLocalVarName}
              onChange={(event) => onUpdate({ ...action, keyLocalVarName: event.target.value })}
              placeholder="key"
            />
            <input
              className="mvp31-flow-local-value h-7 w-20 rounded border border-slate-300 bg-white/50 px-2 text-xs"
              value={action.valueLocalVarName}
              onChange={(event) => onUpdate({ ...action, valueLocalVarName: event.target.value })}
              placeholder="value"
            />
          </>
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
                  const selected = scalarGlobalVariables.find((d) => d.id === nextVariableId)
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
                  const selectedObjectDefinition = scalarSelectedObjectVariables.find(
                    (definition) => definition.id === nextVariableId
                  )
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
              expectedType={action.operator === "set" ? normalizedChangeVariableExpectedType : "number"}
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
          className="h-6 w-6 text-red-300 hover:text-red-600 hover:bg-red-50"
          onClick={onRemove}
          title="Remove action"
        >
          <X className="h-3.5 w-3.5" />
        </Button>
      </div>
      {isFlowAction(action) && (
        <div className="mvp31-flow-branch basis-full mt-1 ml-9 rounded border border-slate-200 bg-white p-2">
          <div className="mvp31-flow-branch-list flex flex-col gap-px bg-slate-200">
            {nestedFlowActions.map((nestedActionEntry, nestedIndex) => (
              <ActionBlock
                key={nestedActionEntry.id}
                action={nestedActionEntry}
                index={nestedIndex}
                isFirst={nestedIndex === 0}
                isLast={nestedIndex === nestedFlowActions.length - 1}
                onUpdate={(updatedAction) =>
                  onUpdate({
                    ...action,
                    actions: nestedFlowActions.map((entry) =>
                      entry.id === nestedActionEntry.id ? ({ id: nestedActionEntry.id, ...updatedAction } as typeof entry) : entry
                    )
                  })
                }
                onMoveUp={() => undefined}
                onMoveDown={() => undefined}
                onRemove={() =>
                  onUpdate({
                    ...action,
                    actions: nestedFlowActions.filter((entry) => entry.id !== nestedActionEntry.id)
                  })
                }
                onCopy={() => undefined}
                onPaste={() => undefined}
                canPaste={false}
                selectableObjects={selectableObjects}
                globalVariables={globalVariables}
                objectVariablesByObjectId={objectVariablesByObjectId}
                roomInstances={roomInstances}
                allObjects={allObjects}
                rooms={rooms}
                selectedObjectVariables={selectedObjectVariables}
                eventType={eventType}
                collisionTargetName={collisionTargetName}
                iterationVariables={flowIterationVariables}
              />
            ))}
          </div>
          <div className="mvp31-flow-branch-footer mt-2 flex items-center gap-2">
            <select
              className="h-7 rounded border border-slate-300 bg-white px-2 text-xs"
              value={newNestedActionType}
              onChange={(event) => setNewNestedActionType(event.target.value as ObjectActionType)}
            >
              {ACTION_REGISTRY.filter((entry) => entry.ui.editorVisible && entry.type !== "playSound").map((entry) => (
                <option key={`nested-${entry.type}`} value={entry.type}>
                  {entry.ui.label}
                </option>
              ))}
            </select>
            <Button size="sm" className="h-7 text-xs" onClick={addNestedFlowAction}>
              Add nested action
            </Button>
          </div>
        </div>
      )}
      {contextMenu && (
        <div
          className="mvp17-action-context-menu fixed z-30 min-w-[180px] overflow-hidden rounded-md border border-slate-200 bg-white shadow-xl"
          style={{ left: `${contextMenu.x}px`, top: `${contextMenu.y}px` }}
          onMouseDown={(event) => event.stopPropagation()}
        >
          <button
            type="button"
            className="mvp17-action-context-menu-item-copy flex w-full items-center justify-start px-3 py-2 text-xs text-slate-700 hover:bg-slate-50"
            onClick={() => {
              onCopy()
              setContextMenu(null)
            }}
          >
            Copy action
          </button>
          <button
            type="button"
            className="mvp17-action-context-menu-item-paste flex w-full items-center justify-start border-t border-slate-100 px-3 py-2 text-xs text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:text-slate-300 disabled:hover:bg-white"
            onClick={() => {
              onPaste()
              setContextMenu(null)
            }}
            disabled={!canPaste}
          >
            Paste after
          </button>
          <button
            type="button"
            className="mvp17-action-context-menu-item-delete flex w-full items-center justify-start border-t border-slate-100 px-3 py-2 text-xs text-red-500 hover:bg-red-50"
            onClick={() => {
              onRemove()
              setContextMenu(null)
            }}
          >
            Delete action
          </button>
        </div>
      )}
    </div>
  )
}
