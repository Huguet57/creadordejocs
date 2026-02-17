import {
  Box,
  Check,
  ChevronDown,
  GitBranch,
  List,
  Map,
  Plus,
  RotateCcw,
} from "lucide-react"
import { useEffect, useRef, useState } from "react"
import { Button } from "../../components/ui/button.js"
import { Label } from "../../components/ui/label.js"
import {
  EVENT_DISPLAY_NAMES,
  OBJECT_EVENT_KEYS,
  type IfCondition,
  type ObjectActionDraft,
  type ObjectActionType,
  type ObjectEventEntry,
  type ObjectEventKey,
  type ObjectKeyboardMode,
  type ObjectMouseMode
} from "../editor-state/types.js"
import { ActionBlock } from "./ActionBlock.js"
import { ControlBlock } from "./ControlBlock.js"
import { ActionSelectorPanel } from "./ActionSelectorPanel.js"
import { BlockSelectorPanel, type ControlBlockType } from "./BlockSelectorPanel.js"
import type { ActionDropTarget } from "./action-dnd.js"
import type { ProjectV1, ObjectControlBlockItem } from "@creadordejocs/project-format"
import { generateUUID } from "@creadordejocs/project-format"
import { buildDefaultIfCondition } from "./if-condition-utils.js"

type ActionEditorPanelProps = {
  selectedObject: ProjectV1["objects"][0] | null
  activeEvent: ObjectEventEntry | null
  selectableTargetObjects: { id: string; name: string; spriteSrc: string | null }[]
  globalVariables: ProjectV1["variables"]["global"]
  selectedObjectVariables: ProjectV1["variables"]["global"]
  objectVariablesByObjectId: ProjectV1["variables"]["objectByObjectId"]
  roomInstances: ProjectV1["rooms"][number]["instances"]
  allObjects: ProjectV1["objects"]
  rooms: ProjectV1["rooms"]
  onUpdateEventConfig: (
    key: ObjectEventKey | null,
    keyboardMode: ObjectKeyboardMode | null,
    mouseMode: ObjectMouseMode | null,
    targetId: string | null,
    intervalMs: number | null
  ) => void
  onAddAction: (type: ObjectActionType) => void
  onUpdateAction: (actionId: string, action: ObjectActionDraft) => void
  onMoveAction: (actionId: string, direction: "up" | "down") => void
  onMoveActionByDrop: (actionId: string, target: ActionDropTarget) => void
  onRemoveAction: (actionId: string) => void
  onCopyAction: (actionId: string) => void
  onPasteAfterAction: (actionId: string) => void
  onPasteAtEventEnd: () => void
  canPasteAction: boolean
  onCopyIfBlock: (ifBlockId: string) => void
  onPasteAfterIfBlock: (ifBlockId: string) => void
  onAddBlock: (block: ObjectControlBlockItem, parentBlockId?: string, parentBranch?: "then" | "else") => void
  onUpdateBlock: (blockId: string, updates: Partial<ObjectControlBlockItem>) => void
  onUpdateIfCondition: (ifBlockId: string, condition: IfCondition) => void
  onRemoveBlock: (blockId: string) => void
  onAddBlockAction: (blockId: string, type: ObjectActionType, branch: "then" | "else") => void
  onUpdateBlockAction: (blockId: string, actionId: string, action: ObjectActionDraft, branch: "then" | "else") => void
  onRemoveBlockAction: (blockId: string, actionId: string, branch: "then" | "else") => void
}

type ActionPickerTarget =
  | { kind: "event" }
  | { kind: "blockBranch"; blockId: string; branch: "then" | "else" }
  | null

type BlockPickerTarget =
  | { kind: "event" }
  | { kind: "blockBranch"; blockId: string; branch: "then" | "else" }
  | null

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
  onMoveActionByDrop,
  onRemoveAction,
  onCopyAction,
  onPasteAfterAction,
  onPasteAtEventEnd,
  canPasteAction,
  onCopyIfBlock,
  onPasteAfterIfBlock,
  onAddBlock,
  onUpdateBlock,
  onUpdateIfCondition,
  onRemoveBlock,
  onAddBlockAction,
  onUpdateBlockAction,
  onRemoveBlockAction
}: ActionEditorPanelProps) {
  const [actionPickerTarget, setActionPickerTarget] = useState<ActionPickerTarget>(null)
  const [blockPickerTarget, setBlockPickerTarget] = useState<BlockPickerTarget>(null)
  const [footerBlockPickerOpen, setFooterBlockPickerOpen] = useState(false)
  const footerBlockPickerRef = useRef<HTMLDivElement>(null)
  const [backgroundContextMenu, setBackgroundContextMenu] = useState<{ x: number; y: number } | null>(null)
  const [isCollisionTargetMenuOpen, setIsCollisionTargetMenuOpen] = useState(false)
  const [draggedActionId, setDraggedActionId] = useState<string | null>(null)
  const [dropTarget, setDropTarget] = useState<ActionDropTarget | null>(null)
  const collisionTargetSelectorRef = useRef<HTMLDivElement | null>(null)
  const collisionTargetName = activeEvent?.type === "Collision" && activeEvent.targetObjectId
    ? selectableTargetObjects.find((obj) => obj.id === activeEvent.targetObjectId)?.name ?? null
    : null
  const collisionTargetSelection = activeEvent?.type === "Collision" && activeEvent.targetObjectId
    ? selectableTargetObjects.find((obj) => obj.id === activeEvent.targetObjectId) ?? null
    : null
  const isMouseButtonEvent = activeEvent?.type === "Mouse"
  const mouseModeValue: ObjectMouseMode = activeEvent?.mouseMode ?? "down"
  const scalarGlobalVariables = globalVariables.filter(
    (variableEntry): variableEntry is Extract<typeof globalVariables[number], { type: "number" | "string" | "boolean" }> =>
      variableEntry.type === "number" || variableEntry.type === "string" || variableEntry.type === "boolean"
  )
  const scalarSelectedObjectVariables = selectedObjectVariables.filter(
    (
      variableEntry
    ): variableEntry is Extract<typeof selectedObjectVariables[number], { type: "number" | "string" | "boolean" }> =>
      variableEntry.type === "number" || variableEntry.type === "string" || variableEntry.type === "boolean"
  )
  const collisionOtherObjectIds =
    activeEvent?.type !== "Collision"
      ? []
      : activeEvent.targetObjectId
        ? [activeEvent.targetObjectId]
        : selectableTargetObjects.map((targetObject) => targetObject.id)
  const otherVariablesForCollision = collisionOtherObjectIds.flatMap((objectId) => objectVariablesByObjectId[objectId] ?? [])
  const hasListActionsAvailable =
    globalVariables.some((variableEntry) => variableEntry.type === "list") ||
    selectedObjectVariables.some((variableEntry) => variableEntry.type === "list") ||
    otherVariablesForCollision.some((variableEntry) => variableEntry.type === "list")
  const hasMapActionsAvailable =
    globalVariables.some((variableEntry) => variableEntry.type === "map") ||
    selectedObjectVariables.some((variableEntry) => variableEntry.type === "map") ||
    otherVariablesForCollision.some((variableEntry) => variableEntry.type === "map")

  useEffect(() => {
    if (!backgroundContextMenu) {
      return
    }
    const closeContextMenu = () => setBackgroundContextMenu(null)
    window.addEventListener("mousedown", closeContextMenu)
    return () => window.removeEventListener("mousedown", closeContextMenu)
  }, [backgroundContextMenu])

  useEffect(() => {
    if (!isCollisionTargetMenuOpen) {
      return
    }
    const closeCollisionTargetMenu = (event: MouseEvent) => {
      const clickedNode = event.target as Node | null
      if (collisionTargetSelectorRef.current && clickedNode && !collisionTargetSelectorRef.current.contains(clickedNode)) {
        setIsCollisionTargetMenuOpen(false)
      }
    }
    window.addEventListener("mousedown", closeCollisionTargetMenu)
    return () => window.removeEventListener("mousedown", closeCollisionTargetMenu)
  }, [isCollisionTargetMenuOpen])

  useEffect(() => {
    if (activeEvent?.type !== "Collision") {
      setIsCollisionTargetMenuOpen(false)
    }
  }, [activeEvent?.type])

  useEffect(() => {
    if (!footerBlockPickerOpen) return
    function handleMouseDown(event: MouseEvent) {
      if (footerBlockPickerRef.current && !footerBlockPickerRef.current.contains(event.target as Node)) {
        setFooterBlockPickerOpen(false)
      }
    }
    document.addEventListener("mousedown", handleMouseDown)
    return () => document.removeEventListener("mousedown", handleMouseDown)
  }, [footerBlockPickerOpen])

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

  const handleSelectAction = (type: ObjectActionType) => {
    if (!actionPickerTarget) {
      return
    }
    if (actionPickerTarget.kind === "event") {
      onAddAction(type)
    } else {
      onAddBlockAction(actionPickerTarget.blockId, type, actionPickerTarget.branch)
    }
    setActionPickerTarget(null)
  }

  const handleSelectBlock = (type: ControlBlockType) => {
    const block = createDefaultBlock(type)
    if (!block) {
      setBlockPickerTarget(null)
      return
    }
    if (!blockPickerTarget || blockPickerTarget.kind === "event") {
      onAddBlock(block)
    } else {
      onAddBlock(block, blockPickerTarget.blockId, blockPickerTarget.branch)
    }
    setBlockPickerTarget(null)
  }

  function createDefaultBlock(type: ControlBlockType): ObjectControlBlockItem | null {
    if (type === "if") {
      if (!defaultIfCondition) return null
      return { id: `if-${generateUUID()}`, type: "if", condition: defaultIfCondition, thenActions: [], elseActions: [] }
    }
    if (type === "repeat") {
      return { id: `repeat-${generateUUID()}`, type: "repeat", count: 3, actions: [] }
    }
    if (type === "forEachList") {
      const firstGlobalList = globalVariables.find((v) => v.type === "list")
      if (firstGlobalList) {
        return {
          id: `forEach-${generateUUID()}`,
          type: "forEachList",
          scope: "global",
          variableId: firstGlobalList.id,
          itemLocalVarName: "item",
          indexLocalVarName: "index",
          actions: []
        }
      }
      const firstObjectList = selectedObjectVariables.find((v) => v.type === "list")
      if (!firstObjectList) return null
      return {
        id: `forEach-${generateUUID()}`,
        type: "forEachList",
        scope: "object",
        variableId: firstObjectList.id,
        target: "self",
        targetInstanceId: null,
        itemLocalVarName: "item",
        indexLocalVarName: "index",
        actions: []
      }
    }
    if (type === "forEachMap") {
      const firstGlobalMap = globalVariables.find((v) => v.type === "map")
      if (firstGlobalMap) {
        return {
          id: `forEachMap-${generateUUID()}`,
          type: "forEachMap",
          scope: "global",
          variableId: firstGlobalMap.id,
          keyLocalVarName: "key",
          valueLocalVarName: "value",
          actions: []
        }
      }
      const firstObjectMap = selectedObjectVariables.find((v) => v.type === "map")
      if (!firstObjectMap) return null
      return {
        id: `forEachMap-${generateUUID()}`,
        type: "forEachMap",
        scope: "object",
        variableId: firstObjectMap.id,
        target: "self",
        targetInstanceId: null,
        keyLocalVarName: "key",
        valueLocalVarName: "value",
        actions: []
      }
    }
    return null
  }

  const defaultIfCondition = buildDefaultIfCondition(scalarGlobalVariables, scalarSelectedObjectVariables)
  const getCanonicalDropTarget = (
    hoveredActionId: string,
    hoveredPosition: "top" | "bottom"
  ): { actionId: string; position: "top" | "bottom" } => {
    const actionIds = activeEvent.items
      .filter((itemEntry) => itemEntry.type === "action")
      .map((itemEntry) => itemEntry.action.id)
    const hoveredIndex = actionIds.findIndex((actionId) => actionId === hoveredActionId)
    if (hoveredIndex < 0) {
      return { actionId: hoveredActionId, position: hoveredPosition }
    }
    if (hoveredPosition === "bottom") {
      const nextActionId = actionIds[hoveredIndex + 1]
      if (nextActionId) {
        // Normalize "between two actions" to one visual target: top of the next action.
        return { actionId: nextActionId, position: "top" }
      }
    }
    return { actionId: hoveredActionId, position: hoveredPosition }
  }
  const moveActionToDropTarget = (sourceActionId: string, target: ActionDropTarget) => {
    onMoveActionByDrop(sourceActionId, target)
  }

  return (
    <div className="mvp3-action-editor-panel flex flex-1 flex-col bg-white">
      <div className="flex h-12 items-center justify-between border-b border-slate-200 px-4">
        <h3 className="text-sm text-slate-800">
          When <span className="font-semibold text-slate-900">{EVENT_DISPLAY_NAMES[activeEvent.type] ?? activeEvent.type}</span>
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
                  activeEvent.mouseMode ?? null,
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
                  activeEvent.mouseMode ?? null,
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

        {isMouseButtonEvent && (
          <div className="mvp25-mouse-event-config flex items-center gap-2">
            <Label className="text-xs text-slate-400">Mode</Label>
            <select
              className="h-7 rounded border border-slate-200 bg-slate-50 px-2 text-xs text-slate-700 focus:border-slate-400 focus:outline-none"
              value={mouseModeValue}
              onChange={(event) =>
                onUpdateEventConfig(
                  activeEvent.key,
                  activeEvent.keyboardMode ?? null,
                  event.target.value as ObjectMouseMode,
                  activeEvent.targetObjectId,
                  activeEvent.intervalMs
                )
              }
            >
              <option value="down">Held</option>
              <option value="press">Pressed</option>
            </select>
          </div>
        )}

        {activeEvent.type === "Collision" && (
          <div className="mvp20-collision-target-config-row flex items-center gap-2">
            <Label className="text-xs text-slate-400">with</Label>
            <div ref={collisionTargetSelectorRef} className="mvp20-collision-target-selector relative">
              <button
                type="button"
                className="mvp20-collision-target-selector-trigger inline-flex h-7 min-w-[170px] items-center gap-1.5 rounded border border-slate-200 bg-slate-50 px-2 text-xs text-slate-700 focus:border-slate-400 focus:outline-none"
                onClick={() => setIsCollisionTargetMenuOpen((previousOpenState) => !previousOpenState)}
                aria-expanded={isCollisionTargetMenuOpen}
                aria-haspopup="listbox"
              >
                {collisionTargetSelection?.spriteSrc ? (
                  <img
                    src={collisionTargetSelection.spriteSrc}
                    alt=""
                    className="mvp20-collision-target-selector-trigger-icon h-3.5 w-3.5 object-contain"
                    style={{ imageRendering: "pixelated" }}
                  />
                ) : (
                  <Box className="mvp20-collision-target-selector-trigger-fallback h-3 w-3 text-slate-400" />
                )}
                <span className="truncate">{collisionTargetSelection?.name ?? "Any object"}</span>
                <ChevronDown className="mvp20-collision-target-selector-trigger-chevron ml-auto h-3 w-3 text-slate-400" />
              </button>
              {isCollisionTargetMenuOpen && (
                <div className="mvp20-collision-target-selector-menu absolute top-[calc(100%+4px)] right-0 z-30 min-w-[190px] overflow-hidden rounded border border-slate-200 bg-white shadow-lg">
                  <button
                    type="button"
                    className="mvp20-collision-target-selector-option flex w-full items-center gap-1.5 px-2 py-1.5 text-left text-xs text-slate-700 hover:bg-slate-50"
                    onClick={() => {
                      onUpdateEventConfig(
                        activeEvent.key,
                        activeEvent.keyboardMode ?? null,
                        activeEvent.mouseMode ?? null,
                        null,
                        activeEvent.intervalMs
                      )
                      setIsCollisionTargetMenuOpen(false)
                    }}
                  >
                    <Box className="h-3 w-3 text-slate-400" />
                    <span className="truncate">Any object</span>
                    {!activeEvent.targetObjectId && (
                      <Check className="ml-auto h-3 w-3 text-slate-400" />
                    )}
                  </button>
                  {selectableTargetObjects.map((targetObject) => (
                    <button
                      key={targetObject.id}
                      type="button"
                      className="mvp20-collision-target-selector-option flex w-full items-center gap-1.5 px-2 py-1.5 text-left text-xs text-slate-700 hover:bg-slate-50"
                      onClick={() => {
                        onUpdateEventConfig(
                          activeEvent.key,
                          activeEvent.keyboardMode ?? null,
                          activeEvent.mouseMode ?? null,
                          targetObject.id,
                          activeEvent.intervalMs
                        )
                        setIsCollisionTargetMenuOpen(false)
                      }}
                    >
                      {targetObject.spriteSrc ? (
                        <img
                          src={targetObject.spriteSrc}
                          alt=""
                          className="mvp20-collision-target-selector-option-icon h-3.5 w-3.5 object-contain"
                          style={{ imageRendering: "pixelated" }}
                        />
                      ) : (
                        <Box className="mvp20-collision-target-selector-option-fallback h-3 w-3 text-slate-400" />
                      )}
                      <span className="truncate">{targetObject.name}</span>
                      {targetObject.id === activeEvent.targetObjectId && (
                        <Check className="ml-auto h-3 w-3 text-slate-400" />
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>
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
                  activeEvent.mouseMode ?? null,
                  activeEvent.targetObjectId,
                  Math.max(1, Number(e.target.value) || 1)
                )
              }
            />
          </div>
        )}
      </div>

      {!actionPickerTarget && !blockPickerTarget ? (
        <>
          <div
            className="flex-1 overflow-y-auto p-4"
            onContextMenu={(event) => {
              const target = event.target as HTMLElement
              if (target.closest(".action-block-container, .if-block-header")) {
                return
              }
              event.preventDefault()
              setBackgroundContextMenu({
                x: event.clientX,
                y: event.clientY
              })
            }}
          >
            <div className={`mx-auto max-w-3xl flex flex-col ${activeEvent.items.length > 0 ? "gap-px bg-slate-200" : ""}`}>
              {activeEvent.items.length === 0 && (
                <div
                  className={`mvp22-empty-root-dropzone py-6 text-center ${
                    draggedActionId &&
                    dropTarget &&
                    dropTarget.targetIfBlockId === undefined &&
                    dropTarget.targetBranch === undefined &&
                    dropTarget.targetActionId === undefined
                      ? "ring-1 ring-blue-300 bg-blue-50/40"
                      : ""
                  }`}
                  onDragOver={(event) => {
                    if (!draggedActionId) {
                      return
                    }
                    event.preventDefault()
                    setDropTarget({})
                  }}
                  onDrop={(event) => {
                    if (!draggedActionId) {
                      return
                    }
                    event.preventDefault()
                    moveActionToDropTarget(draggedActionId, {})
                    setDraggedActionId(null)
                    setDropTarget(null)
                  }}
                >
                  <p className="text-sm text-slate-400">No actions yet.</p>
                  <p className="text-xs text-slate-400 mt-1">Add an action below to define what happens.</p>
                </div>
              )}

              {(() => {
                let hasDestroySelfBefore = false
                return activeEvent.items.map((item, index) => {
                  const isVisuallyUnreachable = hasDestroySelfBefore
                  if (item.type === "action" && item.action.type === "destroySelf") {
                    hasDestroySelfBefore = true
                  }

                  const itemContainerClassName = isVisuallyUnreachable ? "mvp21-unreachable-action opacity-40" : ""

                  if (item.type === "action") {
                    return (
                      <div key={item.id} className={itemContainerClassName}>
                        <ActionBlock
                          action={item.action}
                          index={index}
                          isFirst={index === 0}
                          isLast={index === activeEvent.items.length - 1}
                          onUpdate={(updatedAction) => onUpdateAction(item.action.id, updatedAction)}
                          onMoveUp={() => onMoveAction(item.action.id, "up")}
                          onMoveDown={() => onMoveAction(item.action.id, "down")}
                          onRemove={() => onRemoveAction(item.action.id)}
                          onCopy={() => onCopyAction(item.action.id)}
                          onPaste={() => onPasteAfterAction(item.action.id)}
                          canPaste={canPasteAction}
                          selectableObjects={selectableTargetObjects}
                          globalVariables={globalVariables}
                          objectVariablesByObjectId={objectVariablesByObjectId}
                          roomInstances={roomInstances}
                          allObjects={allObjects}
                          rooms={rooms}
                          selectedObjectVariables={selectedObjectVariables}
                          eventType={activeEvent.type}
                          collisionTargetName={collisionTargetName}
                          isDragging={draggedActionId === item.action.id}
                          dropIndicator={
                            dropTarget?.targetIfBlockId === undefined && dropTarget?.targetActionId === item.action.id
                              ? (dropTarget.position ?? null)
                              : null
                          }
                          onDragStartAction={(actionId) => {
                            setDraggedActionId(actionId)
                            setDropTarget(null)
                          }}
                          onDragOverAction={(actionId, position) => {
                            if (draggedActionId && draggedActionId !== actionId) {
                              const canonicalDropTarget = getCanonicalDropTarget(actionId, position)
                              setDropTarget({
                                targetActionId: canonicalDropTarget.actionId,
                                position: canonicalDropTarget.position
                              })
                            }
                          }}
                          onDropOnAction={(targetActionId, position) => {
                            if (!draggedActionId) {
                              return
                            }
                            const canonicalDropTarget = getCanonicalDropTarget(targetActionId, position)
                            moveActionToDropTarget(draggedActionId, {
                              targetActionId: canonicalDropTarget.actionId,
                              position: canonicalDropTarget.position
                            })
                            setDraggedActionId(null)
                            setDropTarget(null)
                          }}
                          onDragEndAction={() => {
                            setDraggedActionId(null)
                            setDropTarget(null)
                          }}
                        />
                      </div>
                    )
                  }

                  if (item.type === "if" || item.type === "repeat" || item.type === "forEachList" || item.type === "forEachMap") {
                    return (
                      <div key={item.id} className={itemContainerClassName}>
                        <ControlBlock
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
                          onUpdateBlock={onUpdateBlock}
                          onUpdateIfCondition={onUpdateIfCondition}
                          onRemoveBlock={onRemoveBlock}
                          onAddBlock={onAddBlock}
                          onOpenActionPickerForBranch={(blockId, branch) =>
                            setActionPickerTarget({ kind: "blockBranch", blockId, branch })
                          }
                          onMoveAction={onMoveAction}
                          onCopyAction={onCopyAction}
                          onPasteAfterAction={onPasteAfterAction}
                          canPasteAction={canPasteAction}
                          onCopyBlock={onCopyIfBlock}
                          onPasteAfterBlock={onPasteAfterIfBlock}
                          onUpdateBlockAction={onUpdateBlockAction}
                          onRemoveBlockAction={onRemoveBlockAction}
                          draggedActionId={draggedActionId}
                          dropTarget={dropTarget}
                          onDragStartAction={(actionId) => {
                            setDraggedActionId(actionId)
                            setDropTarget(null)
                          }}
                          onDragOverAction={(target) => {
                            if (!draggedActionId) return
                            if (target.targetActionId && target.targetActionId === draggedActionId) return
                            setDropTarget(target)
                          }}
                          onDropOnAction={(target) => {
                            if (!draggedActionId) return
                            moveActionToDropTarget(draggedActionId, target)
                            setDraggedActionId(null)
                            setDropTarget(null)
                          }}
                          onDragEndAction={() => {
                            setDraggedActionId(null)
                            setDropTarget(null)
                          }}
                        />
                      </div>
                    )
                  }

                  return null
                })
              })()}
            </div>
            {backgroundContextMenu && (
              <div
                className="mvp17-actions-background-context-menu fixed z-30 min-w-[180px] overflow-hidden rounded-md border border-slate-200 bg-white shadow-xl"
                style={{ left: `${backgroundContextMenu.x}px`, top: `${backgroundContextMenu.y}px` }}
                onMouseDown={(event) => event.stopPropagation()}
              >
                <button
                  type="button"
                  className="mvp17-actions-background-context-menu-item-paste flex w-full items-center justify-start px-3 py-2 text-xs text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:text-slate-300 disabled:hover:bg-white"
                  onClick={() => {
                    onPasteAtEventEnd()
                    setBackgroundContextMenu(null)
                  }}
                  disabled={!canPasteAction}
                >
                  Paste
                </button>
              </div>
            )}
          </div>

          <div className="mvp3-action-picker border-t border-slate-200 p-3">
            <div className="mvp16-actions-footer-grid grid grid-cols-2 gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="mvp3-action-picker-toggle h-8 w-full justify-start text-xs"
                onClick={() => setActionPickerTarget({ kind: "event" })}
              >
                <Plus className="mr-2 h-3.5 w-3.5" />
                Add Action
              </Button>
              <div className="relative" ref={footerBlockPickerRef}>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="control-block-add-block h-8 w-full justify-start text-xs"
                  onClick={() => setFooterBlockPickerOpen(!footerBlockPickerOpen)}
                >
                  <Plus className="mr-2 h-3.5 w-3.5" />
                  Add Block
                </Button>
                {footerBlockPickerOpen && (
                  <div className="control-block-footer-block-picker absolute bottom-full left-0 z-50 mb-1 min-w-[160px] rounded-lg border border-slate-200 bg-white shadow-lg">
                    {[
                      { type: "if" as const, label: "If", icon: GitBranch },
                      { type: "repeat" as const, label: "Repeat", icon: RotateCcw },
                      { type: "forEachList" as const, label: "Each list", icon: List },
                      { type: "forEachMap" as const, label: "Each map", icon: Map }
                    ].map(({ type: blockType, label, icon: Icon }) => (
                      <button
                        key={blockType}
                        type="button"
                        className="control-block-footer-block-option flex items-center gap-2 w-full px-3 py-1.5 text-xs text-left text-slate-600 hover:bg-purple-50 hover:text-purple-700 transition-colors"
                        onClick={() => {
                          handleSelectBlock(blockType)
                          setFooterBlockPickerOpen(false)
                        }}
                      >
                        <Icon className="h-3.5 w-3.5 shrink-0" />
                        <span>{label}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </>
      ) : blockPickerTarget ? (
        <BlockSelectorPanel
          onSelectBlock={handleSelectBlock}
          onClose={() => setBlockPickerTarget(null)}
        />
      ) : (
        <ActionSelectorPanel
          classNamePrefix="mvp3-action-picker"
          onSelectAction={handleSelectAction}
          onClose={() => setActionPickerTarget(null)}
          hasListActions={hasListActionsAvailable}
          hasMapActions={hasMapActionsAvailable}
        />
      )}
    </div>
  )
}
