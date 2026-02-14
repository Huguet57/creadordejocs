import { useEffect, useMemo, useState } from "react"
import type { ObjectActionDraft } from "@creadordejocs/project-format"
import type { EditorController } from "../editor-state/use-editor-controller.js"
import { type ObjectActionType } from "../editor-state/types.js"
import { ObjectListPanel } from "./ObjectListPanel.js"
import { ObjectVariablesPanel } from "./ObjectVariablesPanel.js"
import { EventListPanel } from "./EventListPanel.js"
import { ActionEditorPanel } from "./ActionEditorPanel.js"

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
    if (type === "jumpToPosition") return { type: "jumpToPosition", x: 0, y: 0 }
    if (type === "jumpToStart") return { type: "jumpToStart" }
    if (type === "setGlobalVariable") {
      const firstGlobal = controller.project.variables.global[0]
      if (!firstGlobal) return null
      return { type: "setGlobalVariable", variableId: firstGlobal.id, value: firstGlobal.initialValue }
    }
    if (type === "setObjectVariable") {
      const firstObjectVariable = selectedObjectVariableDefinitions[0]
      if (!firstObjectVariable) return null
      return {
        type: "setObjectVariable",
        variableId: firstObjectVariable.id,
        target: "self",
        targetInstanceId: null,
        value: firstObjectVariable.initialValue
      }
    }
    if (type === "setObjectVariableFromGlobal") {
      const firstObjectVariable = selectedObjectVariableDefinitions[0]
      const firstGlobal = controller.project.variables.global[0]
      if (!firstObjectVariable || !firstGlobal) return null
      return {
        type: "setObjectVariableFromGlobal",
        variableId: firstObjectVariable.id,
        target: "self",
        targetInstanceId: null,
        globalVariableId: firstGlobal.id
      }
    }
    if (type === "setGlobalVariableFromObject") {
      const firstObjectVariable = selectedObjectVariableDefinitions[0]
      const firstGlobal = controller.project.variables.global[0]
      if (!firstObjectVariable || !firstGlobal) return null
      return {
        type: "setGlobalVariableFromObject",
        globalVariableId: firstGlobal.id,
        source: "self",
        sourceInstanceId: null,
        objectVariableId: firstObjectVariable.id
      }
    }
    if (type === "goToRoom") {
      const firstRoom = controller.project.rooms[0]
      if (!firstRoom) return null
      return { type: "goToRoom", roomId: firstRoom.id }
    }
    if (type === "restartRoom") return { type: "restartRoom" }
    if (type === "addGlobalVariable" || type === "subtractGlobalVariable" || type === "multiplyGlobalVariable") {
      const firstNumberGlobal = controller.project.variables.global.find((definition) => definition.type === "number")
      if (!firstNumberGlobal) return null
      return { type, variableId: firstNumberGlobal.id, value: 1 }
    }
    if (type === "addObjectVariable" || type === "subtractObjectVariable" || type === "multiplyObjectVariable") {
      const firstNumberObjectVariable = selectedObjectVariableDefinitions.find((definition) => definition.type === "number")
      if (!firstNumberObjectVariable) return null
      return {
        type,
        variableId: firstNumberObjectVariable.id,
        target: "self",
        targetInstanceId: null,
        value: 1
      }
    }
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
            onAddEvent={(type, key, intervalMs) => {
              controller.addObjectEvent(type, key ?? null, null, intervalMs ?? null)
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
            objectVariablesByObjectId={controller.project.variables.objectByObjectId}
            roomInstances={controller.activeRoom?.instances ?? []}
            allObjects={controller.project.objects}
            rooms={controller.project.rooms}
            onUpdateEventConfig={(key, targetId, intervalMs) => {
              if (activeEvent) {
                controller.updateObjectEventConfig(activeEvent.id, key, targetId, intervalMs)
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

