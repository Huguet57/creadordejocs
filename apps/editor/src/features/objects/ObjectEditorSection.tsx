import { useEffect, useMemo, useState } from "react"
import type { ObjectActionDraft } from "@creadordejocs/project-format"
import type { EditorController } from "../editor-state/use-editor-controller.js"
import { type IfCondition, type ObjectActionType } from "../editor-state/types.js"
import { ObjectListPanel } from "./ObjectListPanel.js"
import { ObjectVariablesPanel } from "./ObjectVariablesPanel.js"
import { EventListPanel } from "./EventListPanel.js"
import { ActionEditorPanel } from "./ActionEditorPanel.js"
import { buildDefaultIfCondition } from "./if-condition-utils.js"

type ObjectEditorSectionProps = {
  controller: EditorController
}

export function ObjectEditorSection({ controller }: ObjectEditorSectionProps) {
  const [activeEventId, setActiveEventId] = useState<string | null>(null)
  const [selectNewestListener, setSelectNewestListener] = useState(false)

  const selectedObject = controller.selectedObject
  const selectableTargetObjects = useMemo(
    () => controller.project.objects.filter((objectEntry) => objectEntry.id !== selectedObject?.id),
    [controller.project.objects, selectedObject?.id]
  )
  const selectedObjectVariableDefinitions = selectedObject
    ? controller.project.variables.objectByObjectId[selectedObject.id] ?? []
    : []

  const defaultActionFromType = (type: ObjectActionType): ObjectActionDraft | null => {
    if (type === "move") return { type: "move", dx: 0, dy: 0 }
    if (type === "setVelocity") return { type: "setVelocity", speed: 1, direction: 0 }
    if (type === "clampToRoom") return { type: "clampToRoom" }
    if (type === "teleport") return { type: "teleport", mode: "position", x: 0, y: 0 }
    if (type === "changeVariable") {
      const firstGlobal = controller.project.variables.global[0]
      const firstObjectVariable = selectedObjectVariableDefinitions[0]
      if (firstGlobal) {
        return {
          type: "changeVariable",
          scope: "global",
          variableId: firstGlobal.id,
          operator: "set",
          value: firstGlobal.initialValue
        }
      }
      if (!firstObjectVariable) return null
      return {
        type: "changeVariable",
        scope: "object",
        variableId: firstObjectVariable.id,
        operator: "set",
        target: "self",
        targetInstanceId: null,
        value: firstObjectVariable.initialValue
      }
    }
    if (type === "copyVariable") {
      const firstObjectVariable = selectedObjectVariableDefinitions[0]
      const firstGlobal = controller.project.variables.global[0]
      if (!firstObjectVariable || !firstGlobal) return null
      return {
        type: "copyVariable",
        direction: "globalToObject",
        globalVariableId: firstGlobal.id,
        objectVariableId: firstObjectVariable.id,
        instanceTarget: "self",
        instanceTargetId: null
      }
    }
    if (type === "goToRoom") {
      const firstRoom = controller.project.rooms[0]
      if (!firstRoom) return null
      return { type: "goToRoom", roomId: firstRoom.id }
    }
    if (type === "restartRoom") return { type: "restartRoom" }
    if (type === "destroySelf") return { type: "destroySelf" }
    if (type === "destroyOther") return { type: "destroyOther" }
    if (type === "changeScore") return { type: "changeScore", delta: 1 }
    if (type === "endGame") return { type: "endGame", message: "Game over" }
    if (type === "spawnObject") {
      const target = selectableTargetObjects[0]
      if (!target) return null
      return { type: "spawnObject", objectId: target.id, offsetX: 0, offsetY: 0 }
    }
    if (type === "playSound") {
      const sound = controller.project.resources.sounds[0]
      if (!sound) return null
      return { type: "playSound", soundId: sound.id }
    }
    return null
  }

  useEffect(() => {
    if (!selectedObject) {
      setActiveEventId(null)
      return
    }

    if (selectNewestListener) {
      setActiveEventId(selectedObject.events[selectedObject.events.length - 1]?.id ?? null)
      setSelectNewestListener(false)
      return
    }

    if (!activeEventId || !selectedObject.events.some((eventEntry) => eventEntry.id === activeEventId)) {
      setActiveEventId(selectedObject.events[0]?.id ?? null)
    }
  }, [selectedObject, activeEventId, selectNewestListener])

  const activeEvent = selectedObject?.events.find((eventEntry) => eventEntry.id === activeEventId) ?? null

  const handleAddAction = (type: ObjectActionType) => {
    if (!activeEvent) return
    const action = defaultActionFromType(type)
    if (action) {
      controller.addObjectEventAction(activeEvent.id, action)
    }
  }

  const defaultIfCondition = (): IfCondition => {
    return (
      buildDefaultIfCondition(controller.project.variables.global, selectedObjectVariableDefinitions) ?? {
        left: { scope: "global", variableId: "" },
        operator: "==",
        right: 0
      }
    )
  }

  return (
    <div className="mvp15-object-editor-container flex h-[600px] w-full overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
      <ObjectListPanel
        objects={controller.project.objects}
        activeObjectId={controller.activeObjectId}
        onSelectObject={(id) => controller.setActiveObjectId(id)}
        onAddObject={(name) => controller.addObject(name)}
        onDeleteObject={() => controller.deleteSelectedObject()}
      />

      {selectedObject ? (
        <>
          <ObjectVariablesPanel
            objectId={selectedObject.id}
            variables={selectedObjectVariableDefinitions}
            onAddVariable={(objectId, name, type, initialValue) =>
              controller.addObjectVariable(objectId, name, type, initialValue)
            }
            onUpdateVariable={(objectId, variableId, name, initialValue) =>
              controller.updateObjectVariable(objectId, variableId, name, initialValue)
            }
            onRemoveVariable={(objectId, variableId) => controller.removeObjectVariable(objectId, variableId)}
          />
          <EventListPanel
            events={selectedObject.events}
            activeEventId={activeEventId}
            onSelectEvent={setActiveEventId}
            onAddEvent={(type, key, keyboardMode, intervalMs) => {
              controller.addObjectEvent(type, key ?? null, keyboardMode ?? null, null, intervalMs ?? null)
              setSelectNewestListener(true)
            }}
            onRemoveEvent={(id) => {
              controller.removeObjectEvent(id)
              if (activeEventId === id) setActiveEventId(null)
            }}
          />
          
          <ActionEditorPanel
            selectedObject={selectedObject}
            activeEvent={activeEvent}
            selectableTargetObjects={selectableTargetObjects}
            sounds={controller.project.resources.sounds}
            globalVariables={controller.project.variables.global}
            selectedObjectVariables={selectedObjectVariableDefinitions}
            objectVariablesByObjectId={controller.project.variables.objectByObjectId}
            roomInstances={controller.activeRoom?.instances ?? []}
            allObjects={controller.project.objects}
            rooms={controller.project.rooms}
            onUpdateEventConfig={(key, keyboardMode, targetId, intervalMs) => {
              if (activeEvent) {
                controller.updateObjectEventConfig(activeEvent.id, key, keyboardMode, targetId, intervalMs)
              }
            }}
            onAddAction={handleAddAction}
            onUpdateAction={(actionId, action) => {
              if (activeEvent) {
                controller.updateObjectEventAction(activeEvent.id, actionId, action)
              }
            }}
            onMoveAction={(actionId, direction) => {
              if (activeEvent) {
                controller.moveObjectEventAction(activeEvent.id, actionId, direction)
              }
            }}
            onRemoveAction={(actionId) => {
              if (activeEvent) {
                controller.removeObjectEventAction(activeEvent.id, actionId)
              }
            }}
            onAddIfBlock={(condition, parentIfBlockId, parentBranch) => {
              if (activeEvent) {
                controller.addObjectEventIfBlock(activeEvent.id, condition ?? defaultIfCondition(), parentIfBlockId, parentBranch)
              }
            }}
            onUpdateIfCondition={(ifBlockId, condition) => {
              if (activeEvent) {
                controller.updateObjectEventIfBlockCondition(activeEvent.id, ifBlockId, condition)
              }
            }}
            onRemoveIfBlock={(ifBlockId) => {
              if (activeEvent) {
                controller.removeObjectEventIfBlock(activeEvent.id, ifBlockId)
              }
            }}
            onAddIfAction={(ifBlockId, type, branch) => {
              if (!activeEvent) return
              const action = defaultActionFromType(type)
              if (action) {
                controller.addObjectEventIfAction(activeEvent.id, ifBlockId, action, branch)
              }
            }}
            onUpdateIfAction={(ifBlockId, actionId, action, branch) => {
              if (activeEvent) {
                controller.updateObjectEventIfAction(activeEvent.id, ifBlockId, actionId, action, branch)
              }
            }}
            onRemoveIfAction={(ifBlockId, actionId, branch) => {
              if (activeEvent) {
                controller.removeObjectEventIfAction(activeEvent.id, ifBlockId, actionId, branch)
              }
            }}
          />
        </>
      ) : (
        <div className="flex flex-1 items-center justify-center bg-slate-50 text-slate-400">
          <p>Select an object to start editing</p>
        </div>
      )}
    </div>
  )
}

