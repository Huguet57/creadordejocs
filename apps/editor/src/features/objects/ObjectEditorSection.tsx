import { useEffect, useMemo, useState } from "react"
import {
  cloneObjectEventItemForPaste,
  type ObjectActionDraft,
  type ObjectEventItem
} from "@creadordejocs/project-format"
import { isSpriteCompatibleWithObjectSize, type EditorController } from "../editor-state/use-editor-controller.js"
import { SYSTEM_MOUSE_GLOBALS, type IfCondition, type ObjectActionType } from "../editor-state/types.js"
import { ObjectListPanel } from "./ObjectListPanel.js"
import { ObjectVariablesPanel } from "./ObjectVariablesPanel.js"
import { EventListPanel } from "./EventListPanel.js"
import { ActionEditorPanel } from "./ActionEditorPanel.js"
import { buildDefaultIfCondition } from "./if-condition-utils.js"
import { SpritePickerModal } from "../sprites/components/SpritePickerModal.js"
import { resolveSpritePreviewSource } from "../sprites/utils/sprite-preview-source.js"
import { resolveActiveEventMemoryForObject } from "./object-event-selection.js"

type ObjectEditorSectionProps = {
  controller: EditorController
}

function findEventItemByActionId(items: ObjectEventItem[], actionId: string): ObjectEventItem | null {
  for (const item of items) {
    if (item.type === "action" && item.action.id === actionId) {
      return item
    }
    if (item.type === "if") {
      const foundInThen = findEventItemByActionId(item.thenActions, actionId)
      if (foundInThen) {
        return foundInThen
      }
      const foundInElse = findEventItemByActionId(item.elseActions, actionId)
      if (foundInElse) {
        return foundInElse
      }
    }
  }
  return null
}

function findEventItemById(items: ObjectEventItem[], itemId: string): ObjectEventItem | null {
  for (const item of items) {
    if (item.id === itemId) {
      return item
    }
    if (item.type === "if") {
      const foundInThen = findEventItemById(item.thenActions, itemId)
      if (foundInThen) {
        return foundInThen
      }
      const foundInElse = findEventItemById(item.elseActions, itemId)
      if (foundInElse) {
        return foundInElse
      }
    }
  }
  return null
}

export function ObjectEditorSection({ controller }: ObjectEditorSectionProps) {
  const [activeEventIdByObjectId, setActiveEventIdByObjectId] = useState<Record<string, string | null>>({})
  const [selectNewestForObjectId, setSelectNewestForObjectId] = useState<string | null>(null)
  const [resolvedSpriteSources, setResolvedSpriteSources] = useState<Record<string, string>>({})
  const [isSpritePickerOpen, setIsSpritePickerOpen] = useState(false)
  const [eventItemClipboard, setEventItemClipboard] = useState<ObjectEventItem | null>(null)

  const sprites = controller.project.resources.sprites

  useEffect(() => {
    let cancelled = false

    const resolveSprites = async () => {
      const pairs = await Promise.all(
        sprites.map(async (spriteEntry) => {
          const resolved = await resolveSpritePreviewSource(spriteEntry)
          return [spriteEntry.id, resolved] as const
        })
      )
      if (!cancelled) {
        setResolvedSpriteSources(Object.fromEntries(pairs))
      }
    }

    void resolveSprites()

    return () => {
      cancelled = true
    }
  }, [sprites])

  const selectedObject = controller.selectedObject
  const selectableTargetObjects = useMemo(
    () =>
      controller.project.objects
        .filter((objectEntry) => objectEntry.id !== selectedObject?.id)
        .map((objectEntry) => ({
          id: objectEntry.id,
          name: objectEntry.name,
          spriteSrc: objectEntry.spriteId ? (resolvedSpriteSources[objectEntry.spriteId] ?? null) : null
        })),
    [controller.project.objects, resolvedSpriteSources, selectedObject?.id]
  )
  const selectedObjectVariableDefinitions = selectedObject
    ? controller.project.variables.objectByObjectId[selectedObject.id] ?? []
    : []
  const pickerSprites = useMemo(() => {
    if (!selectedObject) return []
    const normalizedObjectWidth = Math.max(
      1,
      Math.round(typeof selectedObject.width === "number" && Number.isFinite(selectedObject.width) ? selectedObject.width : 32)
    )
    const normalizedObjectHeight = Math.max(
      1,
      Math.round(typeof selectedObject.height === "number" && Number.isFinite(selectedObject.height) ? selectedObject.height : 32)
    )

    return sprites.map((spriteEntry) => ({
      id: spriteEntry.id,
      name: spriteEntry.name,
      folderId: spriteEntry.folderId ?? null,
      width: spriteEntry.width,
      height: spriteEntry.height,
      pixelsRgba: spriteEntry.pixelsRgba,
      previewSrc: resolvedSpriteSources[spriteEntry.id] ?? null,
      isCompatible: isSpriteCompatibleWithObjectSize(
        selectedObject.width,
        selectedObject.height,
        spriteEntry.width,
        spriteEntry.height
      ),
      isExactSize:
        normalizedObjectWidth === Math.max(1, Math.round(spriteEntry.width)) &&
        normalizedObjectHeight === Math.max(1, Math.round(spriteEntry.height))
    }))
  }, [resolvedSpriteSources, selectedObject, sprites])
  const globalVariablesWithSystem = [...controller.project.variables.global, ...SYSTEM_MOUSE_GLOBALS]

  const defaultActionFromType = (type: ObjectActionType): ObjectActionDraft | null => {
    if (type === "move") return { type: "move", dx: 0, dy: 0 }
    if (type === "setVelocity") return { type: "setVelocity", speed: 1, direction: 0 }
    if (type === "rotate") return { type: "rotate", angle: 0, mode: "add" }
    if (type === "moveToward") {
      return {
        type: "moveToward",
        targetType: selectableTargetObjects.length > 0 ? "object" : "mouse",
        targetObjectId: selectableTargetObjects[0]?.id ?? null,
        speed: 1
      }
    }
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
    if (type === "randomizeVariable") {
      const firstNumericGlobal = controller.project.variables.global.find((entry) => entry.type === "number")
      const firstNumericObjectVariable = selectedObjectVariableDefinitions.find((entry) => entry.type === "number")
      if (firstNumericGlobal) {
        return {
          type: "randomizeVariable",
          scope: "global",
          variableId: firstNumericGlobal.id,
          min: 0,
          max: 10
        }
      }
      if (!firstNumericObjectVariable) return null
      return {
        type: "randomizeVariable",
        scope: "object",
        variableId: firstNumericObjectVariable.id,
        target: "self",
        targetInstanceId: null,
        min: 0,
        max: 10
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
    if (type === "wait") return { type: "wait", durationMs: 500 }
    if (type === "destroySelf") return { type: "destroySelf" }
    if (type === "destroyOther") return { type: "destroyOther" }
    if (type === "changeScore") return { type: "changeScore", delta: 1 }
    if (type === "endGame") return { type: "endGame", message: "Game over" }
    if (type === "message") return { type: "message", text: "Missatge", durationMs: 2000 }
    if (type === "spawnObject") {
      const target = selectableTargetObjects[0]
      if (!target) return null
      return { type: "spawnObject", objectId: target.id, offsetX: 0, offsetY: 0 }
    }
    return null
  }

  useEffect(() => {
    if (!selectedObject) {
      return
    }
    const objectId = selectedObject.id
    setActiveEventIdByObjectId((previous) => {
      return resolveActiveEventMemoryForObject(previous, objectId, selectedObject.events, {
        preferNewest: selectNewestForObjectId === objectId
      })
    })
    if (selectNewestForObjectId === objectId) {
      setSelectNewestForObjectId(null)
    }
  }, [selectedObject, selectNewestForObjectId])

  const activeEventId = selectedObject ? (activeEventIdByObjectId[selectedObject.id] ?? null) : null
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
        spriteSources={resolvedSpriteSources}
        onSelectObject={(id) => controller.setActiveObjectId(id)}
        onAddObject={(name) => controller.addObject(name)}
        onDeleteObject={() => controller.deleteSelectedObject()}
      />

      {selectedObject ? (
        <>
          <ObjectVariablesPanel
            objectId={selectedObject.id}
            objectName={selectedObject.name}
            spriteSrc={selectedObject.spriteId ? (resolvedSpriteSources[selectedObject.spriteId] ?? null) : null}
            width={selectedObject.width ?? 32}
            height={selectedObject.height ?? 32}
            visible={selectedObject.visible ?? true}
            solid={selectedObject.solid ?? false}
            variables={selectedObjectVariableDefinitions}
            onAddVariable={(objectId, name, type, initialValue) =>
              controller.addObjectVariable(objectId, name, type, initialValue)
            }
            onUpdateVariable={(objectId, variableId, name, initialValue) =>
              controller.updateObjectVariable(objectId, variableId, name, initialValue)
            }
            onRemoveVariable={(objectId, variableId) => controller.removeObjectVariable(objectId, variableId)}
            onUpdateObjectNumber={(key, value) => controller.updateSelectedObjectProperty(key, value)}
            onUpdateObjectFlag={(key, value) => controller.updateSelectedObjectProperty(key, value)}
            onSpriteClick={() => setIsSpritePickerOpen(true)}
          />
          <EventListPanel
            events={selectedObject.events}
            activeEventId={activeEventId}
            collisionTargets={selectableTargetObjects}
            onSelectEvent={(id) => {
              setActiveEventIdByObjectId((previous) => ({
                ...previous,
                [selectedObject.id]: id
              }))
            }}
            onAddEvent={(type, key, keyboardMode, intervalMs) => {
              controller.addObjectEvent(type, key ?? null, keyboardMode ?? null, null, intervalMs ?? null)
              setSelectNewestForObjectId(selectedObject.id)
            }}
            onRemoveEvent={(id) => {
              controller.removeObjectEvent(id)
              if (activeEventId === id) {
                setActiveEventIdByObjectId((previous) => ({
                  ...previous,
                  [selectedObject.id]: null
                }))
              }
            }}
          />
          
          <ActionEditorPanel
            selectedObject={selectedObject}
            activeEvent={activeEvent}
            selectableTargetObjects={selectableTargetObjects}
            globalVariables={globalVariablesWithSystem}
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
            onMoveActionByDrop={(actionId, target) => {
              if (activeEvent) {
                controller.moveObjectEventItem(activeEvent.id, actionId, target)
              }
            }}
            onRemoveAction={(actionId) => {
              if (activeEvent) {
                controller.removeObjectEventAction(activeEvent.id, actionId)
              }
            }}
            onCopyAction={(actionId) => {
              if (!activeEvent) {
                return
              }
              const itemToCopy = findEventItemByActionId(activeEvent.items, actionId)
              if (!itemToCopy) {
                return
              }
              setEventItemClipboard(itemToCopy)
            }}
            onPasteAfterAction={(actionId) => {
              if (!activeEvent || !eventItemClipboard) {
                return
              }
              controller.insertObjectEventItem(activeEvent.id, cloneObjectEventItemForPaste(eventItemClipboard), actionId)
            }}
            onPasteAtEventEnd={() => {
              if (!activeEvent || !eventItemClipboard) {
                return
              }
              controller.insertObjectEventItem(activeEvent.id, cloneObjectEventItemForPaste(eventItemClipboard))
            }}
            canPasteAction={eventItemClipboard !== null}
            onCopyIfBlock={(ifBlockId) => {
              if (!activeEvent) {
                return
              }
              const ifBlockToCopy = findEventItemById(activeEvent.items, ifBlockId)
              if (ifBlockToCopy?.type !== "if") {
                return
              }
              setEventItemClipboard(ifBlockToCopy)
            }}
            onPasteAfterIfBlock={(ifBlockId) => {
              if (!activeEvent || !eventItemClipboard) {
                return
              }
              controller.insertObjectEventItem(activeEvent.id, cloneObjectEventItemForPaste(eventItemClipboard), ifBlockId)
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
      {selectedObject && (
        <SpritePickerModal
          isOpen={isSpritePickerOpen}
          objectName={selectedObject.name}
          objectWidth={selectedObject.width ?? 32}
          objectHeight={selectedObject.height ?? 32}
          selectedObjectSpriteId={selectedObject.spriteId}
          availableSprites={pickerSprites}
          spriteFolders={(controller.project.resources.spriteFolders ?? []).map((folderEntry) => ({
            id: folderEntry.id,
            name: folderEntry.name,
            parentId: folderEntry.parentId ?? null
          }))}
          onClose={() => setIsSpritePickerOpen(false)}
          onSelectExisting={(spriteId) => {
            const assigned = controller.assignSelectedObjectSprite(spriteId)
            if (assigned) {
              setIsSpritePickerOpen(false)
            }
          }}
          onEditSprite={(spriteId) => {
            controller.openSpriteEditor(spriteId)
            setIsSpritePickerOpen(false)
          }}
          onCreateNewSprite={() => {
            const createdSpriteId = controller.createSpriteForSelectedObject(selectedObject.name)
            controller.openSpriteEditor(createdSpriteId)
            setIsSpritePickerOpen(false)
          }}
        />
      )}
    </div>
  )
}

