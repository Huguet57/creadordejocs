import {
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Move,
  Sparkles,
  Map,
  X,
  GripVertical
} from "lucide-react"
import React, { useEffect, useRef, useState } from "react"
import { Button } from "../../components/ui/button.js"
import {
  ACTION_REGISTRY,
  GO_TO_ROOM_TRANSITIONS,
  type GoToRoomTransition,
  type ObjectActionDraft,
  type ProjectV1,
  type ValueExpression
} from "@creadordejocs/project-format"
import { VariablePicker } from "./VariablePicker.js"
import { RightValuePicker as BaseRightValuePicker } from "./RightValuePicker.js"
import { CollectionVariablePicker } from "./CollectionVariablePicker.js"
import { SpriteDropdownPicker } from "./SpriteDropdownPicker.js"
import { ObjectTextLifetimePicker } from "./ObjectTextLifetimePicker.js"
import type { ObjectEventType } from "../editor-state/types.js"
import { ACTION_ICON_MAP } from "./action-icon-map.js"
import {
  canRandomizeVariable,
  getScalarObjectDefinitions,
  inferPayloadType,
  normalizeChangeVariableDraft,
  normalizeCollectionActionDraft,
  normalizeCopyVariableDraft,
  normalizeEmitPayloadDraft,
  normalizeTargetValue,
  resolveCollectionItemType,
  resolveScalarType,
  type ScalarType,
  type VariableSelectionContext
} from "./variable-selection-model.js"

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
  selectableSprites: { id: string; name: string; folderId: string | null; previewSrc: string | null }[]
  spriteFolders: { id: string; name: string; parentId: string | null }[]
  globalVariables: ProjectV1["variables"]["global"]
  roomInstances: ProjectV1["rooms"][number]["instances"]
  rooms: ProjectV1["rooms"]
  selectedObjectVariables: ProjectV1["variables"]["global"]
  otherObjectVariables?: ProjectV1["variables"]["global"]
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

const GO_TO_ROOM_TRANSITION_LABELS: Record<GoToRoomTransition, string> = {
  none: "None",
  fade: "Fade",
  slideLeft: "Slide Left",
  slideRight: "Slide Right"
}

const GO_TO_ROOM_TRANSITION_ICONS = {
  none: X,
  fade: Sparkles,
  slideLeft: ChevronLeft,
  slideRight: ChevronRight
} satisfies Record<GoToRoomTransition, React.ComponentType<{ className?: string }>>

export function ActionBlock({
  action,
  onUpdate,
  onRemove,
  onCopy,
  onPaste,
  canPaste,
  selectableObjects,
  selectableSprites,
  spriteFolders,
  globalVariables,
  roomInstances,
  rooms,
  selectedObjectVariables,
  otherObjectVariables = [],
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
  const allowOtherTarget = eventType === "Collision"
  const variableContext: VariableSelectionContext = {
    globalVariables,
    selfObjectVariables: selectedObjectVariables,
    otherObjectVariables,
    allowOtherTarget,
    allowInstanceTarget: false,
    iterationVariables
  }
  const scalarGlobalVariables = getScalarObjectDefinitions(globalVariables)
  const scalarSelectedObjectVariables = getScalarObjectDefinitions(selectedObjectVariables)
  const scalarOtherObjectVariables = getScalarObjectDefinitions(otherObjectVariables)

  const selectedGlobalForCopy =
    action.type === "copyVariable"
      ? scalarGlobalVariables.find((definition) => definition.id === action.globalVariableId)
      : null
  const internalVariableOptions = scalarSelectedObjectVariables.map((definition) => ({
    id: definition.id,
    label: definition.name,
    type: definition.type,
    objectName: ""
  }))
  const otherInternalVariableOptions = scalarOtherObjectVariables.map((definition) => ({
    id: definition.id,
    label: definition.name,
    type: definition.type,
    objectName: ""
  }))
  const selfObjectVariableOptions = scalarSelectedObjectVariables.map((definition) => ({
    id: definition.id,
    label: definition.name,
    type: definition.type,
    objectName: ""
  }))
  const otherObjectVariableOptionsForPicker = scalarOtherObjectVariables.map((definition) => ({
    id: definition.id,
    label: definition.name,
    type: definition.type,
    objectName: ""
  }))
  const compatibleSelfOptionsForCopy = selectedGlobalForCopy
    ? selfObjectVariableOptions.filter((option) => option.type === selectedGlobalForCopy.type)
    : selfObjectVariableOptions
  const compatibleOtherOptionsForCopy = selectedGlobalForCopy
    ? otherObjectVariableOptionsForPicker.filter((option) => option.type === selectedGlobalForCopy.type)
    : otherObjectVariableOptionsForPicker
  const normalizedChangeVariableAction =
    action.type === "changeVariable" ? normalizeChangeVariableDraft(action, variableContext) : null
  const normalizedChangeVariableExpectedType: ScalarType =
    action.type === "changeVariable" && normalizedChangeVariableAction
      ? (
          resolveScalarType(
            normalizedChangeVariableAction.scope === "global"
              ? { source: "globalVariable", variableId: normalizedChangeVariableAction.variableId }
              : {
                  source: "internalVariable",
                  target:
                    normalizeTargetValue(normalizedChangeVariableAction.target, allowOtherTarget, false) === "other"
                      ? "other"
                      : "self",
                  variableId: normalizedChangeVariableAction.variableId
                },
            variableContext
          ) ?? "number"
        )
      : "number"
  const emitPayloadType: ScalarType =
    action.type === "emitCustomEvent" ? inferPayloadType(action.payload, variableContext) : "number"
  const [contextMenu, setContextMenu] = useState<ActionContextMenuState>(null)
  const [isRoomSelectorOpen, setIsRoomSelectorOpen] = useState(false)
  const [isRoomTransitionSelectorOpen, setIsRoomTransitionSelectorOpen] = useState(false)
  const roomSelectorRef = useRef<HTMLDivElement>(null)
  const roomTransitionSelectorRef = useRef<HTMLDivElement>(null)
  const selectedRoom = action.type === "goToRoom" ? rooms.find((room) => room.id === action.roomId) ?? null : null
  const selectedRoomTransition: GoToRoomTransition = action.type === "goToRoom" ? (action.transition ?? "none") : "none"
  const SelectedRoomTransitionIcon = GO_TO_ROOM_TRANSITION_ICONS[selectedRoomTransition]
  const RightValuePicker = (
    props: Omit<React.ComponentProps<typeof BaseRightValuePicker>, "iterationVariables">
  ) => (
    <BaseRightValuePicker
      {...props}
      iterationVariables={iterationVariables}
      allowedSources={props.allowedSources ?? ["literal", "random", "attribute", "internalVariable", "globalVariable", "iterationVariable"]}
    />
  )
  function ensureRandomizeVariableDraft(
    draft: Extract<ObjectActionDraft, { type: "randomizeVariable" }>
  ): Extract<ObjectActionDraft, { type: "randomizeVariable" }> {
    const normalizedTarget = normalizeTargetValue(draft.target, allowOtherTarget, false)
    const normalizedDraft = {
      ...draft,
      target: normalizedTarget,
      targetInstanceId: null
    }

    if (
      canRandomizeVariable(
        { scope: normalizedDraft.scope, variableId: normalizedDraft.variableId, target: normalizedDraft.target },
        variableContext
      )
    ) {
      return normalizedDraft
    }

    if (normalizedDraft.scope === "global") {
      const fallbackGlobal = scalarGlobalVariables.find((definition) => definition.type === "number")
      return {
        ...normalizedDraft,
        variableId: fallbackGlobal?.id ?? normalizedDraft.variableId
      }
    }

    const objectVariables = normalizedTarget === "other"
      ? scalarOtherObjectVariables
      : scalarSelectedObjectVariables
    const fallbackObject = objectVariables.find((definition) => definition.type === "number")
    return {
      ...normalizedDraft,
      variableId: fallbackObject?.id ?? normalizedDraft.variableId
    }
  }

  useEffect(() => {
    if (!contextMenu) {
      return
    }
    const closeContextMenu = () => setContextMenu(null)
    window.addEventListener("mousedown", closeContextMenu)
    return () => window.removeEventListener("mousedown", closeContextMenu)
  }, [contextMenu])

  useEffect(() => {
    if (!isRoomSelectorOpen && !isRoomTransitionSelectorOpen) {
      return
    }

    const handleMouseDown = (event: MouseEvent) => {
      if (
        isRoomSelectorOpen &&
        roomSelectorRef.current &&
        !roomSelectorRef.current.contains(event.target as Node)
      ) {
        setIsRoomSelectorOpen(false)
      }
      if (
        isRoomTransitionSelectorOpen &&
        roomTransitionSelectorRef.current &&
        !roomTransitionSelectorRef.current.contains(event.target as Node)
      ) {
        setIsRoomTransitionSelectorOpen(false)
      }
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsRoomSelectorOpen(false)
        setIsRoomTransitionSelectorOpen(false)
      }
    }

    window.addEventListener("mousedown", handleMouseDown)
    window.addEventListener("keydown", handleKeyDown)
    return () => {
      window.removeEventListener("mousedown", handleMouseDown)
      window.removeEventListener("keydown", handleKeyDown)
    }
  }, [isRoomSelectorOpen, isRoomTransitionSelectorOpen])

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
                otherInternalVariables={otherInternalVariableOptions}
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
                otherInternalVariables={otherInternalVariableOptions}
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
                otherInternalVariables={otherInternalVariableOptions}
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
                otherInternalVariables={otherInternalVariableOptions}
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
                otherInternalVariables={otherInternalVariableOptions}
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
                otherInternalVariables={otherInternalVariableOptions}
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
                otherInternalVariables={otherInternalVariableOptions}
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
                otherInternalVariables={otherInternalVariableOptions}
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
                otherInternalVariables={otherInternalVariableOptions}
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
                otherInternalVariables={otherInternalVariableOptions}
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
                otherInternalVariables={otherInternalVariableOptions}
                    allowOtherTarget={allowOtherTarget}
                    onChange={(nextValue) => onUpdate({ ...action, y: nextValue as typeof action.y })}
                  />
                </div>
              </>
            )}
          </>
        )}

        {action.type === "teleportWindow" && (
          <>
            <select
              className="action-block-teleport-window-mode h-7 rounded border border-slate-300 bg-white/50 px-2 text-xs"
              value={action.mode}
              onChange={(event) =>
                onUpdate({
                  ...action,
                  mode: event.target.value as "position" | "self",
                  x: event.target.value === "position" ? (action.x ?? 0) : null,
                  y: event.target.value === "position" ? (action.y ?? 0) : null
                })
              }
            >
              <option value="position">Position</option>
              <option value="self">Self</option>
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
                otherInternalVariables={otherInternalVariableOptions}
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
                otherInternalVariables={otherInternalVariableOptions}
                    allowOtherTarget={allowOtherTarget}
                    onChange={(nextValue) => onUpdate({ ...action, y: nextValue as typeof action.y })}
                  />
                </div>
              </>
            )}
          </>
        )}

        {action.type === "moveWindow" && (
          <>
            <div className="flex items-center gap-1">
              <label className="text-[10px] font-medium opacity-60">DX</label>
              <RightValuePicker
                value={action.dx}
                expectedType="number"
                globalVariables={globalVariables}
                internalVariables={internalVariableOptions}
                otherInternalVariables={otherInternalVariableOptions}
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
                otherInternalVariables={otherInternalVariableOptions}
                allowOtherTarget={allowOtherTarget}
                onChange={(nextValue) => onUpdate({ ...action, dy: nextValue as typeof action.dy })}
              />
            </div>
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
                otherInternalVariables={otherInternalVariableOptions}
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
                otherInternalVariables={otherInternalVariableOptions}
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
                otherInternalVariables={otherInternalVariableOptions}
                allowOtherTarget={allowOtherTarget}
                onChange={(nextValue) => onUpdate({ ...action, durationMs: nextValue as typeof action.durationMs })}
              />
            </div>
          </>
        )}

        {action.type === "setObjectText" && (
          <>
            <div className="action-block-object-text-field flex items-center gap-1 flex-1 min-w-[220px]">
              <label className="text-[10px] font-medium opacity-60">Txt</label>
              <RightValuePicker
                value={action.text}
                expectedType="string"
                globalVariables={globalVariables}
                internalVariables={internalVariableOptions}
                otherInternalVariables={otherInternalVariableOptions}
                allowOtherTarget={allowOtherTarget}
                onChange={(nextValue) => onUpdate({ ...action, text: nextValue as typeof action.text })}
              />
            </div>
            <div className="action-block-object-text-justification-field flex items-center gap-1">
              <label className="text-[10px] font-medium opacity-60">Align</label>
              <select
                className="h-7 rounded border border-slate-300 bg-white/50 px-2 text-xs focus:outline-none"
                value={action.justification ?? "center"}
                onChange={(event) =>
                  onUpdate({
                    ...action,
                    justification: event.target.value as typeof action.justification
                  })
                }
              >
                <option value="center">center</option>
                <option value="left">left</option>
                <option value="right">right</option>
              </select>
            </div>
            <div className="action-block-object-text-lifetime-field flex items-center gap-1">
              <label className="text-[10px] font-medium opacity-60">Time</label>
              <ObjectTextLifetimePicker
                mode={action.mode}
                durationMs={action.durationMs ?? asLiteralValue(2000)}
                onChange={(nextValue) =>
                  onUpdate({
                    ...action,
                    mode: nextValue.mode,
                    durationMs: nextValue.durationMs as typeof action.durationMs
                  })
                }
              />
            </div>
          </>
        )}

        {action.type === "goToRoom" && (
          <div className="action-block-go-to-room-fields flex flex-wrap items-center gap-2">
            <div ref={roomSelectorRef} className="action-block-room-select-container relative">
              <button
                type="button"
                className="action-block-room-select-trigger inline-flex h-7 min-w-[140px] max-w-[180px] items-center gap-1.5 rounded border border-slate-300 bg-white/50 px-2 text-xs text-slate-700 hover:bg-white focus:outline-none"
                onClick={() => {
                  setIsRoomSelectorOpen((previousOpenState) => !previousOpenState)
                  setIsRoomTransitionSelectorOpen(false)
                }}
                aria-expanded={isRoomSelectorOpen}
                aria-haspopup="listbox"
              >
                <Map className="h-3.5 w-3.5 shrink-0 text-slate-400" />
                <span className="truncate">{selectedRoom?.name ?? "Sala no disponible"}</span>
                <ChevronDown className="ml-auto h-3 w-3 shrink-0 text-slate-400" />
              </button>
              {isRoomSelectorOpen && (
                <div className="action-block-room-select-menu absolute left-0 top-[calc(100%+4px)] z-30 min-w-[190px] overflow-hidden rounded border border-slate-200 bg-white py-1 shadow-lg">
                  {rooms.length === 0 ? (
                    <p className="px-3 py-2 text-xs text-slate-400">Cap sala disponible</p>
                  ) : (
                    rooms.map((room) => {
                      const selected = room.id === action.roomId
                      return (
                        <button
                          key={room.id}
                          type="button"
                          className={`action-block-room-select-option flex w-full items-center gap-1.5 px-2 py-1.5 text-left text-xs ${
                            selected
                              ? "bg-indigo-50 font-medium text-indigo-700"
                              : "text-slate-700 hover:bg-slate-100"
                          }`}
                          onClick={() => {
                            onUpdate({ ...action, roomId: room.id })
                            setIsRoomSelectorOpen(false)
                          }}
                        >
                          <Map className="h-3 w-3 shrink-0 text-slate-400" />
                          <span className="truncate">{room.name}</span>
                          {selected && <Check className="ml-auto h-3 w-3 shrink-0 text-slate-400" />}
                        </button>
                      )
                    })
                  )}
                </div>
              )}
            </div>
            <div ref={roomTransitionSelectorRef} className="action-block-room-transition-select-container relative">
              <button
                type="button"
                className="action-block-room-transition-select-trigger inline-flex h-7 min-w-[128px] items-center gap-1.5 rounded border border-slate-300 bg-white/50 px-2 text-xs text-slate-700 hover:bg-white focus:outline-none"
                onClick={() => {
                  setIsRoomTransitionSelectorOpen((previousOpenState) => !previousOpenState)
                  setIsRoomSelectorOpen(false)
                }}
                aria-expanded={isRoomTransitionSelectorOpen}
                aria-haspopup="listbox"
              >
                <SelectedRoomTransitionIcon className="h-3.5 w-3.5 shrink-0 text-slate-400" />
                <span className="truncate">{GO_TO_ROOM_TRANSITION_LABELS[selectedRoomTransition]}</span>
                <ChevronDown className="ml-auto h-3 w-3 shrink-0 text-slate-400" />
              </button>
              {isRoomTransitionSelectorOpen && (
                <div className="action-block-room-transition-select-menu absolute left-0 top-[calc(100%+4px)] z-30 min-w-[170px] overflow-hidden rounded border border-slate-200 bg-white py-1 shadow-lg">
                  {GO_TO_ROOM_TRANSITIONS.map((transition) => {
                    const selected = selectedRoomTransition === transition
                    const TransitionIcon = GO_TO_ROOM_TRANSITION_ICONS[transition]
                    return (
                      <button
                        key={transition}
                        type="button"
                        className={`action-block-room-transition-select-option flex w-full items-center gap-1.5 px-2 py-1.5 text-left text-xs ${
                          selected
                            ? "bg-indigo-50 font-medium text-indigo-700"
                            : "text-slate-700 hover:bg-slate-100"
                        }`}
                        onClick={() => {
                          onUpdate({ ...action, transition })
                          setIsRoomTransitionSelectorOpen(false)
                        }}
                      >
                        <TransitionIcon className="h-3.5 w-3.5 shrink-0 text-slate-400" />
                        <span className="truncate">{GO_TO_ROOM_TRANSITION_LABELS[transition]}</span>
                        {selected && <Check className="ml-auto h-3 w-3 shrink-0 text-slate-400" />}
                      </button>
                    )
                  })}
                </div>
              )}
            </div>
          </div>
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
                otherInternalVariables={otherInternalVariableOptions}
              allowOtherTarget={allowOtherTarget}
              onChange={(nextValue) => onUpdate({ ...action, durationMs: nextValue as typeof action.durationMs })}
            />
          </div>
        )}

        {action.type === "changeVariable" && normalizedChangeVariableAction && (
          <>
            <VariablePicker
              scope={normalizedChangeVariableAction.scope}
              variableId={normalizedChangeVariableAction.variableId}
              globalVariables={globalVariables}
              objectVariables={selfObjectVariableOptions}
              otherObjectVariables={otherObjectVariableOptionsForPicker}
              showTarget={allowOtherTarget}
              target={normalizedChangeVariableAction.scope === "object" ? (normalizedChangeVariableAction.target ?? "self") : null}
              targetInstanceId={normalizedChangeVariableAction.scope === "object" ? (normalizedChangeVariableAction.targetInstanceId ?? null) : null}
              roomInstances={roomInstances}
              onTargetChange={(nextTarget, nextInstanceId) => {
                onUpdate(
                  normalizeChangeVariableDraft(
                    {
                      ...normalizedChangeVariableAction,
                      target: nextTarget,
                      targetInstanceId: nextInstanceId
                    },
                    variableContext
                  )
                )
              }}
              {...(normalizedChangeVariableAction.operator !== "set"
                ? { filter: (v: { type: string }) => v.type === "number" }
                : {})}
              onChange={(nextScope, nextVariableId) => {
                onUpdate(
                  normalizeChangeVariableDraft(
                    {
                      ...normalizedChangeVariableAction,
                      scope: nextScope,
                      variableId: nextVariableId
                    },
                    variableContext
                  )
                )
              }}
            />
            <select
              className="action-block-operator-select h-7 w-14 rounded border border-slate-300 bg-white/50 px-2 text-xs font-bold text-center"
              value={normalizedChangeVariableAction.operator}
              onChange={(event) => {
                onUpdate(
                  normalizeChangeVariableDraft(
                    {
                      ...normalizedChangeVariableAction,
                      operator: event.target.value as "set" | "add" | "subtract" | "multiply"
                    },
                    variableContext
                  )
                )
              }}
            >
              <option value="set">=</option>
              {normalizedChangeVariableExpectedType === "number" && (
                <>
                  <option value="add">+</option>
                  <option value="subtract">−</option>
                  <option value="multiply">×</option>
                </>
              )}
            </select>
            <RightValuePicker
              value={normalizedChangeVariableAction.value}
              expectedType={normalizedChangeVariableAction.operator === "set" ? normalizedChangeVariableExpectedType : "number"}
              globalVariables={globalVariables}
              internalVariables={internalVariableOptions}
              otherInternalVariables={otherInternalVariableOptions}
              allowOtherTarget={allowOtherTarget}
              onChange={(nextValue) =>
                onUpdate(
                  normalizeChangeVariableDraft(
                    {
                      ...normalizedChangeVariableAction,
                      value: nextValue
                    },
                    variableContext
                  )
                )
              }
            />
          </>
        )}

        {action.type === "copyVariable" && (() => {
          const normalizedCopyAction = normalizeCopyVariableDraft(action, variableContext)
          const isGlobalToObject = normalizedCopyAction.direction === "globalToObject"
          const leftScope = isGlobalToObject ? "global" as const : "object" as const
          const rightScope = isGlobalToObject ? "object" as const : "global" as const
          const leftVarId = isGlobalToObject ? normalizedCopyAction.globalVariableId : normalizedCopyAction.objectVariableId
          const rightVarId = isGlobalToObject ? normalizedCopyAction.objectVariableId : normalizedCopyAction.globalVariableId

          return (
            <>
              {/* Source (A) */}
              <VariablePicker
                scope={leftScope}
                variableId={leftVarId}
                globalVariables={globalVariables}
                objectVariables={compatibleSelfOptionsForCopy}
                otherObjectVariables={compatibleOtherOptionsForCopy}
                showTarget={leftScope === "object" && allowOtherTarget}
                target={leftScope === "object" ? normalizedCopyAction.instanceTarget : null}
                targetInstanceId={leftScope === "object" ? (normalizedCopyAction.instanceTargetId ?? null) : null}
                roomInstances={roomInstances}
                onTargetChange={(nextTarget, nextInstanceId) => {
                  onUpdate(
                    normalizeCopyVariableDraft(
                      {
                        ...normalizedCopyAction,
                        instanceTarget: nextTarget,
                        instanceTargetId: nextInstanceId
                      },
                      variableContext
                    )
                  )
                }}
                onChange={(nextScope, nextVarId) => {
                  if (nextScope === "global") {
                    onUpdate(
                      normalizeCopyVariableDraft(
                        {
                          ...normalizedCopyAction,
                          direction: "globalToObject",
                          globalVariableId: nextVarId
                        },
                        variableContext
                      )
                    )
                  } else {
                    onUpdate(
                      normalizeCopyVariableDraft(
                        {
                          ...normalizedCopyAction,
                          direction: "objectToGlobal",
                          objectVariableId: nextVarId
                        },
                        variableContext
                      )
                    )
                  }
                }}
              />
              <span className="text-[10px] font-bold text-slate-400 shrink-0">→</span>
              {/* Destination (B) */}
              <VariablePicker
                scope={rightScope}
                variableId={rightVarId}
                globalVariables={globalVariables}
                objectVariables={compatibleSelfOptionsForCopy}
                otherObjectVariables={compatibleOtherOptionsForCopy}
                allowedScopes={[rightScope]}
                showTarget={rightScope === "object" && allowOtherTarget}
                target={rightScope === "object" ? normalizedCopyAction.instanceTarget : null}
                targetInstanceId={rightScope === "object" ? (normalizedCopyAction.instanceTargetId ?? null) : null}
                roomInstances={roomInstances}
                onTargetChange={(nextTarget, nextInstanceId) => {
                  onUpdate(
                    normalizeCopyVariableDraft(
                      {
                        ...normalizedCopyAction,
                        instanceTarget: nextTarget,
                        instanceTargetId: nextInstanceId
                      },
                      variableContext
                    )
                  )
                }}
                onChange={(_nextScope, nextVarId) => {
                  if (rightScope === "global") {
                    onUpdate(
                      normalizeCopyVariableDraft(
                        {
                          ...normalizedCopyAction,
                          globalVariableId: nextVarId
                        },
                        variableContext
                      )
                    )
                  } else {
                    onUpdate(
                      normalizeCopyVariableDraft(
                        {
                          ...normalizedCopyAction,
                          objectVariableId: nextVarId
                        },
                        variableContext
                      )
                    )
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
              objectVariables={selfObjectVariableOptions}
              otherObjectVariables={otherObjectVariableOptionsForPicker}
              showTarget={allowOtherTarget}
              target={action.scope === "object" ? (action.target ?? "self") : null}
              targetInstanceId={action.scope === "object" ? (action.targetInstanceId ?? null) : null}
              roomInstances={roomInstances}
              filter={(definition) => definition.type === "number"}
              onTargetChange={(nextTarget, nextInstanceId) => {
                onUpdate(
                  ensureRandomizeVariableDraft({
                    ...action,
                    target: nextTarget,
                    targetInstanceId: nextInstanceId
                  })
                )
              }}
              onChange={(nextScope, nextVariableId) => {
                onUpdate(
                  ensureRandomizeVariableDraft({
                    ...action,
                    scope: nextScope,
                    variableId: nextVariableId
                  })
                )
              }}
            />
            <div className="action-block-random-min-field flex items-center gap-1">
              <label className="text-[10px] font-medium opacity-60">Min</label>
              <RightValuePicker
                value={action.min}
                expectedType="number"
                globalVariables={globalVariables}
                internalVariables={internalVariableOptions}
                otherInternalVariables={otherInternalVariableOptions}
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
                otherInternalVariables={otherInternalVariableOptions}
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
                otherInternalVariables={otherInternalVariableOptions}
                allowOtherTarget={allowOtherTarget}
                onChange={(nextValue) => onUpdate({ ...action, step: nextValue as typeof action.step })}
              />
            </div>
          </>
        )}

        {(action.type === "listPush" ||
          action.type === "listSetAt" ||
          action.type === "listRemoveAt" ||
          action.type === "listClear" ||
          action.type === "mapSet" ||
          action.type === "mapDelete" ||
          action.type === "mapClear") && (() => {
          const normalizedCollectionAction = normalizeCollectionActionDraft(action, variableContext)
          const collectionItemType = resolveCollectionItemType(
            {
              scope: normalizedCollectionAction.scope,
              variableId: normalizedCollectionAction.variableId,
              target: normalizedCollectionAction.scope === "object" ? normalizedCollectionAction.target : undefined
            },
            variableContext
          ) ?? "number"

          return (
            <>
              <CollectionVariablePicker
                scope={normalizedCollectionAction.scope}
                variableId={normalizedCollectionAction.variableId}
                collectionType={
                  normalizedCollectionAction.type === "listPush" ||
                  normalizedCollectionAction.type === "listSetAt" ||
                  normalizedCollectionAction.type === "listRemoveAt" ||
                  normalizedCollectionAction.type === "listClear"
                    ? "list"
                    : "map"
                }
                globalVariables={globalVariables}
                objectVariables={selectedObjectVariables}
                otherObjectVariables={otherObjectVariables}
                allowOtherTarget={allowOtherTarget}
                target={normalizedCollectionAction.scope === "object" ? (normalizedCollectionAction.target ?? "self") : null}
                targetInstanceId={normalizedCollectionAction.scope === "object" ? (normalizedCollectionAction.targetInstanceId ?? null) : null}
                roomInstances={roomInstances}
                onTargetChange={(nextTarget, nextInstanceId) =>
                  onUpdate(
                    normalizeCollectionActionDraft(
                      {
                        ...normalizedCollectionAction,
                        target: nextTarget,
                        targetInstanceId: nextInstanceId
                      },
                      variableContext
                    )
                  )
                }
                onChange={(nextScope, nextVariableId) =>
                  onUpdate(
                    normalizeCollectionActionDraft(
                      {
                        ...normalizedCollectionAction,
                        scope: nextScope,
                        variableId: nextVariableId
                      },
                      variableContext
                    )
                  )
                }
              />

              {(normalizedCollectionAction.type === "listSetAt" || normalizedCollectionAction.type === "listRemoveAt") && (
                <div className="action-block-collection-index-field flex items-center gap-1">
                  <label className="text-[10px] font-medium opacity-60">Idx</label>
                  <RightValuePicker
                    value={normalizedCollectionAction.index}
                    expectedType="number"
                    globalVariables={globalVariables}
                    internalVariables={internalVariableOptions}
                    otherInternalVariables={otherInternalVariableOptions}
                    allowOtherTarget={allowOtherTarget}
                    onChange={(nextValue) =>
                      onUpdate(
                        normalizeCollectionActionDraft(
                          {
                            ...normalizedCollectionAction,
                            index: nextValue as typeof normalizedCollectionAction.index
                          },
                          variableContext
                        )
                      )
                    }
                  />
                </div>
              )}

              {(normalizedCollectionAction.type === "listPush" || normalizedCollectionAction.type === "listSetAt") && (
                <div className="action-block-collection-value-field flex items-center gap-1">
                  <label className="text-[10px] font-medium opacity-60">Val</label>
                  <RightValuePicker
                    value={normalizedCollectionAction.value}
                    expectedType={collectionItemType}
                    globalVariables={globalVariables}
                    internalVariables={internalVariableOptions}
                    otherInternalVariables={otherInternalVariableOptions}
                    allowOtherTarget={allowOtherTarget}
                    onChange={(nextValue) =>
                      onUpdate(
                        normalizeCollectionActionDraft(
                          {
                            ...normalizedCollectionAction,
                            value: nextValue
                          },
                          variableContext
                        )
                      )
                    }
                  />
                </div>
              )}

              {(normalizedCollectionAction.type === "mapSet" || normalizedCollectionAction.type === "mapDelete") && (
                <div className="action-block-collection-key-field flex items-center gap-1">
                  <label className="text-[10px] font-medium opacity-60">Key</label>
                  <RightValuePicker
                    value={normalizedCollectionAction.key}
                    expectedType="string"
                    globalVariables={globalVariables}
                    internalVariables={internalVariableOptions}
                    otherInternalVariables={otherInternalVariableOptions}
                    allowOtherTarget={allowOtherTarget}
                    onChange={(nextValue) =>
                      onUpdate(
                        normalizeCollectionActionDraft(
                          {
                            ...normalizedCollectionAction,
                            key: nextValue as typeof normalizedCollectionAction.key
                          },
                          variableContext
                        )
                      )
                    }
                  />
                </div>
              )}

              {normalizedCollectionAction.type === "mapSet" && (
                <div className="action-block-collection-map-value-field flex items-center gap-1">
                  <label className="text-[10px] font-medium opacity-60">Val</label>
                  <RightValuePicker
                    value={normalizedCollectionAction.value}
                    expectedType={collectionItemType}
                    globalVariables={globalVariables}
                    internalVariables={internalVariableOptions}
                    otherInternalVariables={otherInternalVariableOptions}
                    allowOtherTarget={allowOtherTarget}
                    onChange={(nextValue) =>
                      onUpdate(
                        normalizeCollectionActionDraft(
                          {
                            ...normalizedCollectionAction,
                            value: nextValue
                          },
                          variableContext
                        )
                      )
                    }
                  />
                </div>
              )}

              {(normalizedCollectionAction.type === "listClear" || normalizedCollectionAction.type === "mapClear") && (
                <span className="action-block-collection-clear-note text-[10px] font-medium text-slate-500">
                  Clear
                </span>
              )}
            </>
          )
        })()}

        {action.type === "emitCustomEvent" && (
          <>
            <div className="flex items-center gap-1">
              <label className="text-[10px] font-medium opacity-60">Nom</label>
              <input
                type="text"
                className="h-7 min-w-[100px] rounded border border-slate-300 bg-white/50 px-2 text-xs focus:outline-none"
                value={action.eventName}
                onChange={(event) => onUpdate({ ...action, eventName: event.target.value || "event" })}
                placeholder="event"
              />
            </div>
            <div className="flex items-center gap-1">
              <label className="text-[10px] font-medium opacity-60">Tipus</label>
              <select
                className="h-7 rounded border border-slate-300 bg-white/50 px-2 text-xs"
                value={emitPayloadType}
                onChange={(event) =>
                  onUpdate(
                    normalizeEmitPayloadDraft(
                      action,
                      event.target.value as ScalarType,
                      variableContext
                    )
                  )
                }
              >
                <option value="number">number</option>
                <option value="string">string</option>
                <option value="boolean">boolean</option>
              </select>
            </div>
            <div className="flex items-center gap-1">
              <label className="text-[10px] font-medium opacity-60">Payload</label>
              <RightValuePicker
                value={action.payload}
                expectedType={emitPayloadType}
                globalVariables={globalVariables}
                internalVariables={internalVariableOptions}
                otherInternalVariables={otherInternalVariableOptions}
                allowOtherTarget={allowOtherTarget}
                onChange={(nextValue) =>
                  onUpdate(
                    normalizeEmitPayloadDraft(
                      {
                        ...action,
                        payload: nextValue as typeof action.payload
                      },
                      emitPayloadType,
                      variableContext
                    )
                  )
                }
              />
            </div>
          </>
        )}

        {action.type === "changeSprite" && (
          <>
            <SpriteDropdownPicker
              selectedSpriteId={action.spriteId}
              sprites={selectableSprites}
              folders={spriteFolders}
              onSelect={(spriteId) => onUpdate({ ...action, spriteId })}
            />
            {allowOtherTarget && (
              <div className="flex gap-0.5 rounded border border-slate-200">
                <button
                  type="button"
                  className={`px-1.5 py-0.5 text-[10px] rounded-l ${action.target === "self" ? "bg-indigo-100 text-indigo-700 font-medium" : "text-slate-500 hover:bg-slate-50"}`}
                  onClick={() => onUpdate({ ...action, target: "self" })}
                >
                  self
                </button>
                <button
                  type="button"
                  className={`px-1.5 py-0.5 text-[10px] rounded-r ${action.target === "other" ? "bg-indigo-100 text-indigo-700 font-medium" : "text-slate-500 hover:bg-slate-50"}`}
                  onClick={() => onUpdate({ ...action, target: "other" })}
                >
                  other
                </button>
              </div>
            )}
          </>
        )}

        {action.type === "setSpriteSpeed" && (
          <>
            <div className="flex items-center gap-1">
              <label className="text-[10px] font-medium opacity-60">ms</label>
              <RightValuePicker
                value={action.speedMs}
                expectedType="number"
                globalVariables={globalVariables}
                internalVariables={internalVariableOptions}
                otherInternalVariables={otherInternalVariableOptions}
                allowOtherTarget={allowOtherTarget}
                onChange={(nextValue) => onUpdate({ ...action, speedMs: nextValue as typeof action.speedMs })}
              />
            </div>
            {allowOtherTarget && (
              <div className="flex gap-0.5 rounded border border-slate-200">
                <button
                  type="button"
                  className={`px-1.5 py-0.5 text-[10px] rounded-l ${action.target === "self" ? "bg-indigo-100 text-indigo-700 font-medium" : "text-slate-500 hover:bg-slate-50"}`}
                  onClick={() => onUpdate({ ...action, target: "self" })}
                >
                  self
                </button>
                <button
                  type="button"
                  className={`px-1.5 py-0.5 text-[10px] rounded-r ${action.target === "other" ? "bg-indigo-100 text-indigo-700 font-medium" : "text-slate-500 hover:bg-slate-50"}`}
                  onClick={() => onUpdate({ ...action, target: "other" })}
                >
                  other
                </button>
              </div>
            )}
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
