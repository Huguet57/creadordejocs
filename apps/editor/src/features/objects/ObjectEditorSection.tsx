import { useEffect, useMemo, useRef, useState } from "react"
import {
  createEditorDefaultAction,
  cloneObjectEventItemForPaste,
  type ObjectActionDraft,
  type ObjectEventItem
} from "@creadordejocs/project-format"
import { isSpriteCompatibleWithObjectSize, type EditorController } from "../editor-state/use-editor-controller.js"
import { type ObjectActionType } from "../editor-state/types.js"
import { ObjectListPanel } from "./ObjectListPanel.js"
import { ObjectTabBar } from "./ObjectTabBar.js"
import { ObjectVariablesPanel } from "./ObjectVariablesPanel.js"
import { EventListPanel } from "./EventListPanel.js"
import { ActionEditorPanel } from "./ActionEditorPanel.js"
import { SpritePickerModal } from "../sprites/components/SpritePickerModal.js"
import { resolveSpritePreviewSource } from "../sprites/utils/sprite-preview-source.js"
import { hasVisibleSpritePixels } from "../sprites/utils/has-visible-pixels.js"
import { resolveActiveEventMemoryForObject } from "./object-event-selection.js"
import { EventSelectorPanel } from "./EventSelectorPanel.js"

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
  const [openTabs, setOpenTabs] = useState<{ id: string; pinned: boolean }[]>([])
  const objectStateSignatureByIdRef = useRef<Record<string, string>>({})
  const [activeEventIdByObjectId, setActiveEventIdByObjectId] = useState<Record<string, string | null>>({})
  const [selectNewestForObjectId, setSelectNewestForObjectId] = useState<string | null>(null)
  const [resolvedSpriteSources, setResolvedSpriteSources] = useState<Record<string, string>>({})
  const [isSpritePickerOpen, setIsSpritePickerOpen] = useState(false)
  const [eventItemClipboard, setEventItemClipboard] = useState<ObjectEventItem | null>(null)
  const [isEventSelectorOpen, setIsEventSelectorOpen] = useState(false)

  const sprites = controller.project.resources.sprites
  const projectObjects = controller.project.objects

  // Clean up tabs when objects are removed (deletion, template import, etc.)
  useEffect(() => {
    const currentObjectIds = new Set(projectObjects.map((o) => o.id))
    setOpenTabs((prev) => {
      const cleaned = prev.filter((tabEntry) => currentObjectIds.has(tabEntry.id))
      return cleaned.length === prev.length ? prev : cleaned
    })
  }, [projectObjects])

  // Ensure active object is visible in tabs (preview if not opened yet).
  useEffect(() => {
    if (controller.activeObjectId) {
      const activeObjectId = controller.activeObjectId
      setOpenTabs((prev) => {
        if (prev.some((tabEntry) => tabEntry.id === activeObjectId)) {
          return prev
        }
        return [...prev.filter((tabEntry) => tabEntry.pinned), { id: activeObjectId, pinned: false }]
      })
    }
  }, [controller.activeObjectId])

  // VSCode-like behavior: if a preview tab has edits, promote it to pinned.
  useEffect(() => {
    const currentSignatures: Record<string, string> = {}
    for (const objectEntry of projectObjects) {
      const objectVariables = controller.project.variables.objectByObjectId[objectEntry.id] ?? []
      currentSignatures[objectEntry.id] = JSON.stringify({
        object: objectEntry,
        objectVariables
      })
    }

    const activeObjectId = controller.activeObjectId
    if (activeObjectId) {
      const previousSignature = objectStateSignatureByIdRef.current[activeObjectId]
      const currentSignature = currentSignatures[activeObjectId]
      if (previousSignature && currentSignature && previousSignature !== currentSignature) {
        setOpenTabs((prev) =>
          prev.map((tabEntry) =>
            tabEntry.id === activeObjectId && !tabEntry.pinned ? { ...tabEntry, pinned: true } : tabEntry
          )
        )
      }
    }

    objectStateSignatureByIdRef.current = currentSignatures
  }, [controller.activeObjectId, controller.project.variables.objectByObjectId, projectObjects])

  const handleSelectObject = (id: string) => {
    controller.setActiveObjectId(id)
    setOpenTabs((prev) => {
      const existing = prev.find((tabEntry) => tabEntry.id === id)
      const pinnedTabs = prev.filter((tabEntry) => tabEntry.pinned)
      if (existing?.pinned) {
        return [...pinnedTabs]
      }
      return [...pinnedTabs, { id, pinned: false }]
    })
  }

  const handlePinObject = (id: string) => {
    controller.setActiveObjectId(id)
    setOpenTabs((prev) => {
      const tabIndex = prev.findIndex((tabEntry) => tabEntry.id === id)
      if (tabIndex === -1) {
        return [...prev, { id, pinned: true }]
      }
      return prev.map((tabEntry, index) => (index === tabIndex ? { ...tabEntry, pinned: true } : tabEntry))
    })
  }

  const handleCloseTab = (tabId: string) => {
    const currentIndex = openTabs.findIndex((tabEntry) => tabEntry.id === tabId)
    const remainingTabs = openTabs.filter((tabEntry) => tabEntry.id !== tabId)
    setOpenTabs(remainingTabs)

    if (controller.activeObjectId === tabId) {
      const nextTabId =
        remainingTabs.length > 0 ? (remainingTabs[Math.min(currentIndex, remainingTabs.length - 1)]?.id ?? null) : null
      controller.setActiveObjectId(nextTabId)
    }
  }

  const handleDeleteObjectById = (objectId: string) => {
    const targetObject = projectObjects.find((o) => o.id === objectId)
    if (!targetObject) return

    const currentIndex = openTabs.findIndex((tabEntry) => tabEntry.id === objectId)
    const remainingTabs = openTabs.filter((tabEntry) => tabEntry.id !== objectId)

    controller.deleteObjectById(objectId)

    setOpenTabs(remainingTabs)
    if (controller.activeObjectId === objectId && remainingTabs.length > 0) {
      const nextTabId = remainingTabs[Math.min(currentIndex, remainingTabs.length - 1)]?.id ?? null
      controller.setActiveObjectId(nextTabId)
    }
  }

  useEffect(() => {
    let cancelled = false

    const resolveSprites = async () => {
      const pairs = await Promise.all(
        sprites.map(async (spriteEntry) => {
          if (!hasVisibleSpritePixels(spriteEntry.pixelsRgba)) {
            return null
          }
          const resolved = await resolveSpritePreviewSource(spriteEntry)
          return [spriteEntry.id, resolved] as const
        })
      )
      if (!cancelled) {
        setResolvedSpriteSources(Object.fromEntries(pairs.filter((entry): entry is readonly [string, string] => entry !== null)))
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

    const objectNamesBySpriteId = new Map<string, string[]>()
    for (const objectEntry of projectObjects) {
      const spriteId = objectEntry.spriteId
      if (!spriteId) continue
      const names = objectNamesBySpriteId.get(spriteId) ?? []
      names.push(objectEntry.name)
      objectNamesBySpriteId.set(spriteId, names)
    }

    return sprites.map((spriteEntry) => ({
      id: spriteEntry.id,
      name: spriteEntry.name,
      folderId: spriteEntry.folderId ?? null,
      width: spriteEntry.width,
      height: spriteEntry.height,
      pixelsRgba: spriteEntry.pixelsRgba,
      previewSrc: resolvedSpriteSources[spriteEntry.id] ?? null,
      isEmpty: !hasVisibleSpritePixels(spriteEntry.pixelsRgba),
      objectNames: objectNamesBySpriteId.get(spriteEntry.id) ?? [],
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
  }, [projectObjects, resolvedSpriteSources, selectedObject, sprites])
  const defaultActionFromType = (type: ObjectActionType): ObjectActionDraft | null => {
    const actionDraft = createEditorDefaultAction(type, {
      selectableTargetObjectIds: selectableTargetObjects.map((objectEntry) => objectEntry.id),
      globalVariables: controller.project.variables.global,
      objectVariables: selectedObjectVariableDefinitions,
      roomIds: controller.project.rooms.map((roomEntry) => roomEntry.id),
      soundIds: controller.project.resources.sounds.map((soundEntry) => soundEntry.id),
      spriteIds: sprites.map((spriteEntry) => spriteEntry.id)
    })
    return actionDraft as ObjectActionDraft | null
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

  useEffect(() => {
    setIsEventSelectorOpen(false)
  }, [selectedObject?.id])

  const activeEventId = selectedObject ? (activeEventIdByObjectId[selectedObject.id] ?? null) : null
  const activeEvent = selectedObject?.events.find((eventEntry) => eventEntry.id === activeEventId) ?? null

  const handleAddAction = (type: ObjectActionType) => {
    if (!activeEvent) return
    const action = defaultActionFromType(type)
    if (action) {
      controller.addObjectEventAction(activeEvent.id, action)
    }
  }

  const tabData = useMemo(
    () =>
      openTabs
        .map((tabEntry) => {
          const obj = projectObjects.find((o) => o.id === tabEntry.id)
          if (!obj) return null
          return {
            id: obj.id,
            name: obj.name,
            spriteSrc: obj.spriteId ? (resolvedSpriteSources[obj.spriteId] ?? null) : null,
            pinned: tabEntry.pinned
          }
        })
        .filter((t): t is NonNullable<typeof t> => t !== null),
    [openTabs, projectObjects, resolvedSpriteSources]
  )

  return (
    <div className="mvp15-object-editor-container flex h-[600px] w-full overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
      <ObjectListPanel
        objects={projectObjects}
        objectFolders={controller.project.resources.objectFolders ?? []}
        activeObjectId={controller.activeObjectId}
        spriteSources={resolvedSpriteSources}
        onSelectObject={handleSelectObject}
        onPinObject={handlePinObject}
        onOpenInNewTab={handlePinObject}
        onAddObject={(name, folderId) => controller.addObject(name, folderId)}
        onDeleteObject={handleDeleteObjectById}
        onCreateFolder={(name, parentId) => controller.createObjectFolder(name, parentId)}
        onRenameFolder={(folderId, name) => controller.renameObjectFolder(folderId, name)}
        onDeleteFolder={(folderId) => controller.deleteObjectFolder(folderId)}
        onMoveFolder={(folderId, newParentId) => controller.moveObjectFolder(folderId, newParentId)}
        onMoveObjectToFolder={(objectId, folderId) => controller.moveObjectToFolder(objectId, folderId)}
      />

      <div className="objtabs-editor-area flex min-w-0 flex-1 flex-col border-l border-slate-200">
        <ObjectTabBar
          tabs={tabData}
          activeTabId={controller.activeObjectId}
          onSelectTab={(id) => controller.setActiveObjectId(id)}
          onCloseTab={handleCloseTab}
          onPinTab={handlePinObject}
        />

        {selectedObject ? (
          <div className="objtabs-editor-content flex min-h-0 flex-1 overflow-hidden">
            <ObjectVariablesPanel
              objectId={selectedObject.id}
              objectName={selectedObject.name}
              spriteSrc={selectedObject.spriteId ? (resolvedSpriteSources[selectedObject.spriteId] ?? null) : null}
              width={selectedObject.width ?? 32}
              height={selectedObject.height ?? 32}
              visible={selectedObject.visible ?? true}
              solid={selectedObject.solid ?? false}
              variables={selectedObjectVariableDefinitions}
              onAddVariable={(objectId, name, type, initialValue, itemType) =>
                controller.addObjectVariable(objectId, name, type, initialValue, itemType)
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
              isAddingEvent={isEventSelectorOpen}
              onSelectEvent={(id) => {
                setIsEventSelectorOpen(false)
                setActiveEventIdByObjectId((previous) => ({
                  ...previous,
                  [selectedObject.id]: id
                }))
              }}
              onStartAddEvent={() => {
                setIsEventSelectorOpen(true)
                setActiveEventIdByObjectId((previous) => ({
                  ...previous,
                  [selectedObject.id]: null
                }))
              }}
              onCancelAddEvent={() => setIsEventSelectorOpen(false)}
              onDuplicateEvent={(id) => {
                controller.duplicateObjectEvent(id)
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
            {isEventSelectorOpen ? (
              <EventSelectorPanel
                classNamePrefix="mvp24-event-picker"
                onSelectEvent={(type, key, keyboardMode, mouseMode, intervalMs, eventName) => {
                  setIsEventSelectorOpen(false)
                  controller.addObjectEvent(type, key ?? null, keyboardMode ?? null, mouseMode ?? null, null, intervalMs ?? null, eventName ?? null)
                  setSelectNewestForObjectId(selectedObject.id)
                }}
                onClose={() => setIsEventSelectorOpen(false)}
              />
            ) : (
              <ActionEditorPanel
                selectedObject={selectedObject}
                activeEvent={activeEvent}
                selectableTargetObjects={selectableTargetObjects}
                selectableSprites={sprites.map((s) => ({ id: s.id, name: s.name }))}
                globalVariables={controller.project.variables.global}
                selectedObjectVariables={selectedObjectVariableDefinitions}
                objectVariablesByObjectId={controller.project.variables.objectByObjectId}
                roomInstances={controller.activeRoom?.instances ?? []}
                allObjects={controller.project.objects}
                rooms={controller.project.rooms}
                onUpdateEventConfig={(key, keyboardMode, mouseMode, targetId, intervalMs) => {
                  if (activeEvent) {
                    controller.updateObjectEventConfig(activeEvent.id, key, keyboardMode, mouseMode, targetId, intervalMs)
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
                onAddBlock={(block, parentBlockId, parentBranch) => {
                  if (activeEvent) {
                    controller.addObjectEventBlock(activeEvent.id, block, parentBlockId, parentBranch)
                  }
                }}
                onUpdateBlock={(blockId, updates) => {
                  if (activeEvent) {
                    controller.updateObjectEventBlock(activeEvent.id, blockId, updates)
                  }
                }}
                onUpdateIfCondition={(ifBlockId, condition) => {
                  if (activeEvent) {
                    controller.updateObjectEventIfBlockCondition(activeEvent.id, ifBlockId, condition)
                  }
                }}
                onRemoveBlock={(blockId) => {
                  if (activeEvent) {
                    controller.removeObjectEventBlock(activeEvent.id, blockId)
                  }
                }}
                onAddBlockAction={(blockId, type, branch) => {
                  if (!activeEvent) return
                  const action = defaultActionFromType(type)
                  if (action) {
                    controller.addBlockAction(activeEvent.id, blockId, action, branch)
                  }
                }}
                onUpdateBlockAction={(blockId, actionId, action, branch) => {
                  if (activeEvent) {
                    controller.updateBlockAction(activeEvent.id, blockId, actionId, action, branch)
                  }
                }}
                onRemoveBlockAction={(blockId, actionId, branch) => {
                  if (activeEvent) {
                    controller.removeBlockAction(activeEvent.id, blockId, actionId, branch)
                  }
                }}
              />
            )}
          </div>
        ) : (
          <div className="flex flex-1 items-center justify-center bg-slate-50 text-slate-400">
            <p>Select an object to start editing</p>
          </div>
        )}
      </div>

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

