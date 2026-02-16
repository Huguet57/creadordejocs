import { describe, expect, it } from "vitest"
import {
  addRoomInstance,
  addObjectEvent,
  addObjectEventAction,
  addObjectEventIfAction,
  addObjectEventIfBlock,
  createSpriteFolder,
  createEmptyProjectV1,
  createRoom,
  deleteSprite,
  deleteSpriteFolder,
  moveObjectEventAction,
  moveObjectEventItem,
  cloneObjectEventItemForPaste,
  insertObjectEventItem,
  moveSpriteFolder,
  moveSpriteToFolder,
  moveRoomInstance,
  renameSprite,
  renameSpriteFolder,
  removeObjectEventIfAction,
  removeObjectEventIfBlock,
  removeObjectEventAction,
  removeObjectEvent,
  addGlobalVariable,
  updateGlobalVariable,
  removeGlobalVariable,
  addObjectVariable,
  updateObjectVariable,
  removeObjectVariable,
  quickCreateObject,
  quickCreateSound,
  quickCreateSprite,
  quickCreateSpriteWithSize,
  updateObjectSpriteId,
  updateObjectEventIfAction,
  updateObjectEventIfBlockCondition,
  updateObjectEventAction,
  updateObjectEventConfig,
  updateSoundAssetSource,
  updateSpritePixelsRgba,
  updateSpriteAssetSource,
  updateObjectProperties
} from "../src/index.js"

describe("editor model helpers", () => {
  it("quick creates sprite, sound and object with defaults", () => {
    const initial = createEmptyProjectV1("Editor model")
    const spriteResult = quickCreateSprite(initial, "Hero")
    const soundResult = quickCreateSound(spriteResult.project, "Jump")
    const objectResult = quickCreateObject(soundResult.project, { name: "Player", spriteId: spriteResult.spriteId })

    expect(objectResult.project.resources.sprites).toHaveLength(1)
    expect(objectResult.project.resources.sounds).toHaveLength(1)
    expect(objectResult.project.objects[0]?.name).toBe("Player")
    expect(objectResult.project.objects[0]?.spriteId).toBe(spriteResult.spriteId)
    expect(objectResult.project.resources.sprites[0]?.uploadStatus).toBe("notConnected")
    expect(objectResult.project.resources.sprites[0]?.width).toBe(32)
    expect(objectResult.project.resources.sprites[0]?.height).toBe(32)
    expect(objectResult.project.resources.sprites[0]?.pixelsRgba).toHaveLength(32 * 32)
    expect(objectResult.project.objects[0]?.events).toEqual([])
    expect(objectResult.project.objects[0]?.width).toBe(32)
    expect(objectResult.project.objects[0]?.height).toBe(32)
    expect((objectResult.project.objects[0] as { visible?: boolean } | undefined)?.visible).toBe(true)
    expect((objectResult.project.objects[0] as { solid?: boolean } | undefined)?.solid).toBe(false)
  })

  it("creates a room and moves an instance inside it", () => {
    const initial = createEmptyProjectV1("Room flow")
    const objectResult = quickCreateObject(initial, { name: "Enemy", x: 10, y: 10, speed: 2, direction: 90 })
    const roomResult = createRoom(objectResult.project, "Main room")
    const instanceResult = addRoomInstance(roomResult.project, {
      roomId: roomResult.roomId,
      objectId: objectResult.objectId,
      x: 24,
      y: 48
    })
    const moved = moveRoomInstance(instanceResult.project, {
      roomId: roomResult.roomId,
      instanceId: instanceResult.instanceId,
      x: 40,
      y: 88
    })
    const updated = updateObjectProperties(moved, {
      objectId: objectResult.objectId,
      x: 5,
      y: 6,
      speed: 7,
      direction: 180,
      width: 96,
      height: 48,
      visible: false,
      solid: true
    })

    expect(updated.rooms[0]?.instances[0]?.x).toBe(40)
    expect(updated.rooms[0]?.instances[0]?.y).toBe(88)
    expect(updated.objects[0]?.x).toBe(5)
    expect(updated.objects[0]?.speed).toBe(7)
    expect(updated.objects[0]?.direction).toBe(180)
    expect(updated.objects[0]?.width).toBe(96)
    expect(updated.objects[0]?.height).toBe(48)
    expect((updated.objects[0] as { visible?: boolean } | undefined)?.visible).toBe(false)
    expect((updated.objects[0] as { solid?: boolean } | undefined)?.solid).toBe(true)
  })

  it("updates upload-ready asset source metadata", () => {
    const initial = createEmptyProjectV1("Assets")
    const spriteResult = quickCreateSprite(initial, "Coin")
    const soundResult = quickCreateSound(spriteResult.project, "CoinSound")
    const withSpriteSource = updateSpriteAssetSource(soundResult.project, spriteResult.spriteId, "/assets/coin.png")
    const withSoundSource = updateSoundAssetSource(withSpriteSource, soundResult.soundId, "/assets/coin.wav")

    expect(withSoundSource.resources.sprites[0]?.assetSource).toBe("/assets/coin.png")
    expect(withSoundSource.resources.sprites[0]?.uploadStatus).toBe("ready")
    expect(withSoundSource.resources.sounds[0]?.assetSource).toBe("/assets/coin.wav")
    expect(withSoundSource.resources.sounds[0]?.uploadStatus).toBe("ready")
  })

  it("creates sized sprites and updates sprite pixel map", () => {
    const initial = createEmptyProjectV1("Sized sprites")
    const spriteResult = quickCreateSpriteWithSize(initial, "Hero 16", 16, 16)

    expect(spriteResult.project.resources.sprites[0]?.width).toBe(16)
    expect(spriteResult.project.resources.sprites[0]?.height).toBe(16)
    expect(spriteResult.project.resources.sprites[0]?.pixelsRgba).toHaveLength(16 * 16)
    expect(spriteResult.project.resources.sprites[0]?.pixelsRgba[0]).toBe("#00000000")

    const customPixels = Array.from({ length: 16 * 16 }, (_, index) => (index === 0 ? "#FF0000FF" : "#00000000"))
    const withPixels = updateSpritePixelsRgba(spriteResult.project, spriteResult.spriteId, customPixels)

    expect(withPixels.resources.sprites[0]?.pixelsRgba[0]).toBe("#FF0000FF")
    expect(withPixels.resources.sprites[0]?.pixelsRgba).toHaveLength(16 * 16)
  })

  it("assigns sprite id to existing object", () => {
    const initial = createEmptyProjectV1("Object sprite assignment")
    const spriteResult = quickCreateSpriteWithSize(initial, "Coin", 8, 8)
    const objectResult = quickCreateObject(spriteResult.project, { name: "Pickup", spriteId: null })
    const assigned = updateObjectSpriteId(objectResult.project, objectResult.objectId, spriteResult.spriteId)

    expect(assigned.objects[0]?.spriteId).toBe(spriteResult.spriteId)
  })

  it("creates and renames sprite folders with sibling uniqueness", () => {
    const initial = createEmptyProjectV1("Sprite folders")
    const withRootFolder = createSpriteFolder(initial, "Characters")
    const rootFolderId = withRootFolder.folderId
    if (!rootFolderId) {
      throw new Error("Expected root sprite folder to be created")
    }
    const withChildFolder = createSpriteFolder(withRootFolder.project, "Enemies", rootFolderId)
    const childFolderId = withChildFolder.folderId
    if (!childFolderId) {
      throw new Error("Expected nested sprite folder to be created")
    }

    const duplicateInSameParent = createSpriteFolder(withChildFolder.project, "characters")
    expect(duplicateInSameParent.folderId).toBeNull()

    const withSiblingFolder = createSpriteFolder(withChildFolder.project, "Pickups")
    const siblingFolderId = withSiblingFolder.folderId
    if (!siblingFolderId) {
      throw new Error("Expected sibling sprite folder to be created")
    }
    const renamed = renameSpriteFolder(withSiblingFolder.project, siblingFolderId, "Collectibles")
    expect((renamed.resources.spriteFolders ?? []).find((folder) => folder.id === siblingFolderId)?.name).toBe("Collectibles")

    const conflictingRename = renameSpriteFolder(renamed, siblingFolderId, "Characters")
    expect((conflictingRename.resources.spriteFolders ?? []).find((folder) => folder.id === siblingFolderId)?.name).toBe(
      "Collectibles"
    )
  })

  it("moves sprites into folders and validates rename collisions per folder", () => {
    const initial = createEmptyProjectV1("Sprite organization")
    const folderResult = createSpriteFolder(initial, "Player")
    const folderId = folderResult.folderId
    if (!folderId) {
      throw new Error("Expected sprite folder")
    }
    const firstSpriteResult = quickCreateSprite(folderResult.project, "Idle")
    const secondSpriteResult = quickCreateSprite(firstSpriteResult.project, "Run")
    const movedSpriteProject = moveSpriteToFolder(secondSpriteResult.project, secondSpriteResult.spriteId, folderId)
    expect(
      movedSpriteProject.resources.sprites.find((spriteEntry) => spriteEntry.id === secondSpriteResult.spriteId)?.folderId
    ).toBe(folderId)

    const movedFirstSprite = moveSpriteToFolder(movedSpriteProject, firstSpriteResult.spriteId, folderId)
    const conflictingRename = renameSprite(movedFirstSprite, secondSpriteResult.spriteId, "idle")
    expect(conflictingRename.resources.sprites.find((spriteEntry) => spriteEntry.id === secondSpriteResult.spriteId)?.name).toBe(
      "Run"
    )

    const successfulRename = renameSprite(movedFirstSprite, secondSpriteResult.spriteId, "Jump")
    expect(successfulRename.resources.sprites.find((spriteEntry) => spriteEntry.id === secondSpriteResult.spriteId)?.name).toBe(
      "Jump"
    )
  })

  it("deletes folders and rehomes child sprites and nested folders to root", () => {
    const initial = createEmptyProjectV1("Folder delete")
    const rootFolderResult = createSpriteFolder(initial, "Characters")
    const rootFolderId = rootFolderResult.folderId
    if (!rootFolderId) {
      throw new Error("Expected root sprite folder")
    }
    const childFolderResult = createSpriteFolder(rootFolderResult.project, "Enemies", rootFolderId)
    const childFolderId = childFolderResult.folderId
    if (!childFolderId) {
      throw new Error("Expected child sprite folder")
    }
    const spriteResult = quickCreateSprite(childFolderResult.project, "Bat")
    const spriteInChildFolder = moveSpriteToFolder(spriteResult.project, spriteResult.spriteId, childFolderId)
    const afterDelete = deleteSpriteFolder(spriteInChildFolder, rootFolderId)

    expect((afterDelete.resources.spriteFolders ?? []).find((entry) => entry.id === rootFolderId)).toBeUndefined()
    expect((afterDelete.resources.spriteFolders ?? []).find((entry) => entry.id === childFolderId)?.parentId).toBeNull()
    expect(afterDelete.resources.sprites.find((entry) => entry.id === spriteResult.spriteId)?.folderId).toBeNull()
  })

  it("moves a folder to a new parent and prevents cycles", () => {
    const initial = createEmptyProjectV1("Folder move")
    const folderA = createSpriteFolder(initial, "A")
    if (!folderA.folderId) throw new Error("Expected folder A")
    const folderB = createSpriteFolder(folderA.project, "B")
    if (!folderB.folderId) throw new Error("Expected folder B")
    const folderC = createSpriteFolder(folderB.project, "C", folderB.folderId)
    if (!folderC.folderId) throw new Error("Expected folder C")

    const movedBIntoA = moveSpriteFolder(folderC.project, folderB.folderId, folderA.folderId)
    expect(
      (movedBIntoA.resources.spriteFolders ?? []).find((entry) => entry.id === folderB.folderId)?.parentId
    ).toBe(folderA.folderId)

    const cyclicMoveAIntoC = moveSpriteFolder(movedBIntoA, folderA.folderId, folderC.folderId)
    expect(
      (cyclicMoveAIntoC.resources.spriteFolders ?? []).find((entry) => entry.id === folderA.folderId)?.parentId
    ).toBeNull()

    const movedToRoot = moveSpriteFolder(movedBIntoA, folderB.folderId, null)
    expect(
      (movedToRoot.resources.spriteFolders ?? []).find((entry) => entry.id === folderB.folderId)?.parentId
    ).toBeNull()
  })

  it("deletes a sprite and clears object sprite references", () => {
    const initial = createEmptyProjectV1("Sprite delete")
    const spriteResult = quickCreateSprite(initial, "Coin")
    const objectResult = quickCreateObject(spriteResult.project, { name: "Pickup", spriteId: spriteResult.spriteId })
    const verifiedAssignment = updateObjectSpriteId(objectResult.project, objectResult.objectId, spriteResult.spriteId)
    const afterDelete = deleteSprite(verifiedAssignment, spriteResult.spriteId)

    expect(afterDelete.resources.sprites).toHaveLength(0)
    expect(afterDelete.objects.find((entry) => entry.id === objectResult.objectId)?.spriteId).toBeNull()
  })

  it("adds and edits object events", () => {
    const initial = createEmptyProjectV1("Events")
    const objectResult = quickCreateObject(initial, { name: "Player" })
    const enemyResult = quickCreateObject(objectResult.project, { name: "Enemy" })
    const withEvent = addObjectEvent(enemyResult.project, {
      objectId: objectResult.objectId,
      type: "Collision",
      targetObjectId: enemyResult.objectId
    })
    const eventId = withEvent.objects[0]?.events[0]?.id
    if (!eventId) {
      throw new Error("Expected Create event to be created")
    }
    const withMoveAction = addObjectEventAction(withEvent, {
      objectId: objectResult.objectId,
      eventId,
      action: { type: "changeScore", delta: 10 }
    })
    const withSecondAction = addObjectEventAction(withMoveAction, {
      objectId: objectResult.objectId,
      eventId,
      action: { type: "endGame", message: "Game Over" }
    })
    const actionItems = withSecondAction.objects[0]?.events[0]?.items.filter((item) => item.type === "action") ?? []
    const firstActionId = actionItems[0]?.action.id
    const secondActionId = actionItems[1]?.action.id
    if (!firstActionId || !secondActionId) {
      throw new Error("Expected actions to be created")
    }
    const withUpdatedAction = updateObjectEventAction(withSecondAction, {
      objectId: objectResult.objectId,
      eventId,
      actionId: secondActionId,
      action: { type: "changeScore", delta: -3 }
    })
    const withMovedAction = moveObjectEventAction(withUpdatedAction, {
      objectId: objectResult.objectId,
      eventId,
      actionId: secondActionId,
      direction: "up"
    })
    const withRemovedAction = removeObjectEventAction(withMovedAction, {
      objectId: objectResult.objectId,
      eventId,
      actionId: firstActionId
    })
    const withConfig = updateObjectEventConfig(withRemovedAction, {
      objectId: objectResult.objectId,
      eventId,
      targetObjectId: null
    })
    const withoutEvent = removeObjectEvent(withConfig, { objectId: objectResult.objectId, eventId })

    const movedActionItems = withMovedAction.objects[0]?.events[0]?.items.filter((item) => item.type === "action") ?? []
    const removedActionItems = withRemovedAction.objects[0]?.events[0]?.items.filter((item) => item.type === "action") ?? []
    expect(movedActionItems[0]?.action.id).toBe(secondActionId)
    expect(removedActionItems).toHaveLength(1)
    expect(withConfig.objects[0]?.events[0]?.targetObjectId).toBeNull()
    expect(withoutEvent.objects[0]?.events).toHaveLength(0)
  })

  it("manages if blocks and nested actions inside object events", () => {
    const initial = createEmptyProjectV1("If blocks")
    const objectResult = quickCreateObject(initial, { name: "Player" })
    const withEvent = addObjectEvent(objectResult.project, { objectId: objectResult.objectId, type: "Step" })
    const eventId = withEvent.objects[0]?.events[0]?.id
    if (!eventId) {
      throw new Error("Expected event to be created")
    }

    const withIf = addObjectEventIfBlock(withEvent, {
      objectId: objectResult.objectId,
      eventId,
      condition: {
        left: { scope: "global", variableId: "gv-score" },
        operator: ">=",
        right: 1
      }
    })
    const ifBlock = withIf.objects[0]?.events[0]?.items.find((item) => item.type === "if")
    if (ifBlock?.type !== "if") {
      throw new Error("Expected if block")
    }

    const withNestedAction = addObjectEventIfAction(withIf, {
      objectId: objectResult.objectId,
      eventId,
      ifBlockId: ifBlock.id,
      action: { type: "changeScore", delta: 2 }
    })
    const withNestedActionItems = withNestedAction.objects[0]?.events[0]?.items
    const nestedActionId = withNestedActionItems?.find((item) => item.type === "if" && item.id === ifBlock.id)
    if (nestedActionId?.type !== "if" || nestedActionId.thenActions[0]?.type !== "action") {
      throw new Error("Expected nested action")
    }
    const nestedIfActionId = nestedActionId.thenActions[0].action.id

    const withUpdatedCondition = updateObjectEventIfBlockCondition(withNestedAction, {
      objectId: objectResult.objectId,
      eventId,
      ifBlockId: ifBlock.id,
      condition: {
        left: { scope: "object", variableId: "ov-health" },
        operator: "==",
        right: 5
      }
    })
    const withUpdatedNested = updateObjectEventIfAction(withUpdatedCondition, {
      objectId: objectResult.objectId,
      eventId,
      ifBlockId: ifBlock.id,
      actionId: nestedIfActionId,
      action: { type: "changeScore", delta: 4 }
    })
    const withRemovedNested = removeObjectEventIfAction(withUpdatedNested, {
      objectId: objectResult.objectId,
      eventId,
      ifBlockId: ifBlock.id,
      actionId: nestedIfActionId
    })
    const withoutIf = removeObjectEventIfBlock(withRemovedNested, {
      objectId: objectResult.objectId,
      eventId,
      ifBlockId: ifBlock.id
    })

    const withUpdatedNestedItems = withUpdatedNested.objects[0]?.events[0]?.items
    const updatedIf = withUpdatedNestedItems?.find((item) => item.type === "if" && item.id === ifBlock.id)
    expect(updatedIf?.type).toBe("if")
    if (updatedIf?.type === "if") {
      expect(
        "left" in updatedIf.condition &&
          typeof updatedIf.condition.left === "object" &&
          updatedIf.condition.left !== null &&
          "scope" in updatedIf.condition.left
          ? updatedIf.condition.left.scope
          : null
      ).toBe("object")
      expect(updatedIf.thenActions[0]?.type).toBe("action")
      if (updatedIf.thenActions[0]?.type === "action" && updatedIf.thenActions[0].action.type === "changeScore") {
        expect(updatedIf.thenActions[0].action.delta).toBe(4)
      }
    }
    const withRemovedNestedItems = withRemovedNested.objects[0]?.events[0]?.items
    const remainingIf = withRemovedNestedItems?.find((item) => item.type === "if" && item.id === ifBlock.id)
    if (remainingIf?.type === "if") {
      expect(remainingIf.thenActions).toHaveLength(0)
    }
    expect(withoutIf.objects[0]?.events[0]?.items.some((item) => item.type === "if")).toBe(false)
  })

  it("adds and removes nested if blocks inside if branches", () => {
    const initial = createEmptyProjectV1("Nested if blocks")
    const objectResult = quickCreateObject(initial, { name: "Player" })
    const withEvent = addObjectEvent(objectResult.project, { objectId: objectResult.objectId, type: "Step" })
    const eventId = withEvent.objects[0]?.events[0]?.id
    if (!eventId) {
      throw new Error("Expected event to be created")
    }

    const withRootIf = addObjectEventIfBlock(withEvent, {
      objectId: objectResult.objectId,
      eventId,
      condition: {
        left: { scope: "global", variableId: "gv-root" },
        operator: "==",
        right: 1
      }
    })
    const withRootIfItems = withRootIf.objects[0]?.events[0]?.items
    const rootIf = withRootIfItems?.find((item) => item.type === "if")
    if (rootIf?.type !== "if") {
      throw new Error("Expected root if block")
    }

    const withNestedIf = addObjectEventIfBlock(withRootIf, {
      objectId: objectResult.objectId,
      eventId,
      condition: {
        left: { scope: "global", variableId: "gv-nested" },
        operator: ">",
        right: 0
      },
      parentIfBlockId: rootIf.id,
      parentBranch: "then"
    })
    const withNestedIfItems = withNestedIf.objects[0]?.events[0]?.items
    const nestedRootIf = withNestedIfItems?.find((item) => item.type === "if" && item.id === rootIf.id)
    if (nestedRootIf?.type !== "if") {
      throw new Error("Expected nested root if block")
    }
    const nestedIf = nestedRootIf.thenActions.find((item) => item.type === "if")
    if (nestedIf?.type !== "if") {
      throw new Error("Expected nested if block")
    }

    const withNestedAction = addObjectEventIfAction(withNestedIf, {
      objectId: objectResult.objectId,
      eventId,
      ifBlockId: nestedIf.id,
      action: { type: "changeScore", delta: 3 }
    })
    const withUpdatedNestedCondition = updateObjectEventIfBlockCondition(withNestedAction, {
      objectId: objectResult.objectId,
      eventId,
      ifBlockId: nestedIf.id,
      condition: {
        left: { scope: "object", variableId: "ov-health" },
        operator: "<=",
        right: 0
      }
    })
    const withNestedRemoved = removeObjectEventIfBlock(withUpdatedNestedCondition, {
      objectId: objectResult.objectId,
      eventId,
      ifBlockId: nestedIf.id
    })

    const withUpdatedNestedConditionItems = withUpdatedNestedCondition.objects[0]?.events[0]?.items
    const rootIfAfterUpdate = withUpdatedNestedConditionItems?.find((item) => item.type === "if" && item.id === rootIf.id)
    const nestedBeforeRemove =
      rootIfAfterUpdate?.type === "if"
        ? rootIfAfterUpdate.thenActions.find((item) => item.type === "if" && item.id === nestedIf.id)
        : undefined
    expect(nestedBeforeRemove?.type).toBe("if")
    if (nestedBeforeRemove?.type === "if") {
      expect(
        "left" in nestedBeforeRemove.condition &&
          typeof nestedBeforeRemove.condition.left === "object" &&
          nestedBeforeRemove.condition.left !== null &&
          "scope" in nestedBeforeRemove.condition.left
          ? nestedBeforeRemove.condition.left.scope
          : null
      ).toBe("object")
      expect(nestedBeforeRemove.thenActions[0]?.type).toBe("action")
    }

    const withNestedRemovedItems = withNestedRemoved.objects[0]?.events[0]?.items
    const rootIfAfterRemove = withNestedRemovedItems?.find((item) => item.type === "if" && item.id === rootIf.id)
    const nestedAfterRemove =
      rootIfAfterRemove?.type === "if"
        ? rootIfAfterRemove.thenActions.some((item) => item.type === "if" && item.id === nestedIf.id)
        : false
    expect(nestedAfterRemove).toBe(false)
  })

  it("reorders actions inside an if branch", () => {
    const initial = createEmptyProjectV1("Reorder in if branch")
    const objectResult = quickCreateObject(initial, { name: "Player" })
    const withEvent = addObjectEvent(objectResult.project, { objectId: objectResult.objectId, type: "Step" })
    const eventId = withEvent.objects[0]?.events[0]?.id
    if (!eventId) {
      throw new Error("Expected event to be created")
    }

    const withIf = addObjectEventIfBlock(withEvent, {
      objectId: objectResult.objectId,
      eventId,
      condition: {
        left: { scope: "global", variableId: "gv-order" },
        operator: "==",
        right: true
      }
    })
    const rootIf = withIf.objects[0]?.events[0]?.items.find((item) => item.type === "if")
    if (rootIf?.type !== "if") {
      throw new Error("Expected root if block")
    }

    const withFirstThenAction = addObjectEventIfAction(withIf, {
      objectId: objectResult.objectId,
      eventId,
      ifBlockId: rootIf.id,
      branch: "then",
      action: { type: "changeScore", delta: 1 }
    })
    const withSecondThenAction = addObjectEventIfAction(withFirstThenAction, {
      objectId: objectResult.objectId,
      eventId,
      ifBlockId: rootIf.id,
      branch: "then",
      action: { type: "changeScore", delta: 2 }
    })
    const ifBeforeMove = withSecondThenAction.objects[0]?.events[0]?.items.find(
      (item) => item.type === "if" && item.id === rootIf.id
    )
    if (
      ifBeforeMove?.type !== "if" ||
      ifBeforeMove.thenActions[0]?.type !== "action" ||
      ifBeforeMove.thenActions[1]?.type !== "action"
    ) {
      throw new Error("Expected two actions inside IF then branch")
    }

    const firstActionId = ifBeforeMove.thenActions[0].action.id
    const secondActionId = ifBeforeMove.thenActions[1].action.id
    const reordered = moveObjectEventAction(withSecondThenAction, {
      objectId: objectResult.objectId,
      eventId,
      actionId: secondActionId,
      direction: "up"
    })
    const ifAfterMove = reordered.objects[0]?.events[0]?.items.find((item) => item.type === "if" && item.id === rootIf.id)
    expect(ifAfterMove?.type).toBe("if")
    if (ifAfterMove?.type === "if") {
      expect(ifAfterMove.thenActions[0]?.type).toBe("action")
      expect(ifAfterMove.thenActions[1]?.type).toBe("action")
      if (ifAfterMove.thenActions[0]?.type === "action" && ifAfterMove.thenActions[1]?.type === "action") {
        expect(ifAfterMove.thenActions[0].action.id).toBe(secondActionId)
        expect(ifAfterMove.thenActions[1].action.id).toBe(firstActionId)
      }
    }
  })

  it("reorders actions inside nested if branches", () => {
    const initial = createEmptyProjectV1("Reorder in nested if branch")
    const objectResult = quickCreateObject(initial, { name: "Player" })
    const withEvent = addObjectEvent(objectResult.project, { objectId: objectResult.objectId, type: "Step" })
    const eventId = withEvent.objects[0]?.events[0]?.id
    if (!eventId) {
      throw new Error("Expected event to be created")
    }

    const withRootIf = addObjectEventIfBlock(withEvent, {
      objectId: objectResult.objectId,
      eventId,
      condition: {
        left: { scope: "global", variableId: "gv-root" },
        operator: "==",
        right: true
      }
    })
    const rootIf = withRootIf.objects[0]?.events[0]?.items.find((item) => item.type === "if")
    if (rootIf?.type !== "if") {
      throw new Error("Expected root if block")
    }

    const withNestedIf = addObjectEventIfBlock(withRootIf, {
      objectId: objectResult.objectId,
      eventId,
      parentIfBlockId: rootIf.id,
      parentBranch: "then",
      condition: {
        left: { scope: "global", variableId: "gv-nested" },
        operator: "==",
        right: true
      }
    })
    const rootWithNested = withNestedIf.objects[0]?.events[0]?.items.find((item) => item.type === "if" && item.id === rootIf.id)
    const nestedIf = rootWithNested?.type === "if" ? rootWithNested.thenActions.find((item) => item.type === "if") : null
    if (nestedIf?.type !== "if") {
      throw new Error("Expected nested if block")
    }

    const withFirstNestedAction = addObjectEventIfAction(withNestedIf, {
      objectId: objectResult.objectId,
      eventId,
      ifBlockId: nestedIf.id,
      branch: "then",
      action: { type: "changeScore", delta: 10 }
    })
    const withSecondNestedAction = addObjectEventIfAction(withFirstNestedAction, {
      objectId: objectResult.objectId,
      eventId,
      ifBlockId: nestedIf.id,
      branch: "then",
      action: { type: "changeScore", delta: 20 }
    })
    const nestedBeforeMoveRoot = withSecondNestedAction.objects[0]?.events[0]?.items.find(
      (item) => item.type === "if" && item.id === rootIf.id
    )
    const nestedBeforeMove =
      nestedBeforeMoveRoot?.type === "if"
        ? nestedBeforeMoveRoot.thenActions.find((item) => item.type === "if" && item.id === nestedIf.id)
        : null
    if (
      nestedBeforeMove?.type !== "if" ||
      nestedBeforeMove.thenActions[0]?.type !== "action" ||
      nestedBeforeMove.thenActions[1]?.type !== "action"
    ) {
      throw new Error("Expected two actions inside nested IF then branch")
    }

    const firstNestedActionId = nestedBeforeMove.thenActions[0].action.id
    const secondNestedActionId = nestedBeforeMove.thenActions[1].action.id
    const reordered = moveObjectEventAction(withSecondNestedAction, {
      objectId: objectResult.objectId,
      eventId,
      actionId: firstNestedActionId,
      direction: "down"
    })
    const rootAfterMove = reordered.objects[0]?.events[0]?.items.find((item) => item.type === "if" && item.id === rootIf.id)
    const nestedAfterMove =
      rootAfterMove?.type === "if"
        ? rootAfterMove.thenActions.find((item) => item.type === "if" && item.id === nestedIf.id)
        : null
    expect(nestedAfterMove?.type).toBe("if")
    if (nestedAfterMove?.type === "if") {
      expect(nestedAfterMove.thenActions[0]?.type).toBe("action")
      expect(nestedAfterMove.thenActions[1]?.type).toBe("action")
      if (nestedAfterMove.thenActions[0]?.type === "action" && nestedAfterMove.thenActions[1]?.type === "action") {
        expect(nestedAfterMove.thenActions[0].action.id).toBe(secondNestedActionId)
        expect(nestedAfterMove.thenActions[1].action.id).toBe(firstNestedActionId)
      }
    }
  })

  it("moves actions across top-level and nested if branches", () => {
    const initial = createEmptyProjectV1("Move actions across containers")
    const objectResult = quickCreateObject(initial, { name: "Player" })
    const withEvent = addObjectEvent(objectResult.project, { objectId: objectResult.objectId, type: "Step" })
    const eventId = withEvent.objects[0]?.events[0]?.id
    if (!eventId) {
      throw new Error("Expected event to be created")
    }

    const withRootAction = addObjectEventAction(withEvent, {
      objectId: objectResult.objectId,
      eventId,
      action: { type: "changeScore", delta: 10 }
    })
    const withSecondRootAction = addObjectEventAction(withRootAction, {
      objectId: objectResult.objectId,
      eventId,
      action: { type: "wait", durationMs: 100 }
    })
    const withIfA = addObjectEventIfBlock(withSecondRootAction, {
      objectId: objectResult.objectId,
      eventId,
      condition: {
        left: { scope: "global", variableId: "gv-a" },
        operator: ">",
        right: 0
      }
    })
    const withIfB = addObjectEventIfBlock(withIfA, {
      objectId: objectResult.objectId,
      eventId,
      condition: {
        left: { scope: "global", variableId: "gv-b" },
        operator: "==",
        right: true
      }
    })

    const topLevelItems = withIfB.objects[0]?.events[0]?.items ?? []
    const rootAction = topLevelItems.find((item) => item.type === "action")
    const secondRootAction = topLevelItems.filter((item) => item.type === "action")[1]
    const ifBlocks = topLevelItems.filter((item) => item.type === "if")
    const ifA = ifBlocks[0]
    const ifB = ifBlocks[1]
    if (
      rootAction?.type !== "action" ||
      secondRootAction?.type !== "action" ||
      ifA?.type !== "if" ||
      ifB?.type !== "if"
    ) {
      throw new Error("Expected two top-level actions and two if blocks")
    }

    const movedRootToThen = moveObjectEventItem(withIfB, {
      objectId: objectResult.objectId,
      eventId,
      actionId: rootAction.action.id,
      targetIfBlockId: ifA.id,
      targetBranch: "then"
    })
    const ifAAfterRootMove = movedRootToThen.objects[0]?.events[0]?.items.find((item) => item.type === "if" && item.id === ifA.id)
    expect(ifAAfterRootMove?.type).toBe("if")
    if (ifAAfterRootMove?.type === "if") {
      expect(ifAAfterRootMove.thenActions).toHaveLength(1)
      expect(ifAAfterRootMove.thenActions[0]?.type).toBe("action")
      if (ifAAfterRootMove.thenActions[0]?.type === "action") {
        expect(ifAAfterRootMove.thenActions[0].action.id).toBe(rootAction.action.id)
      }
    }

    const movedThenToElse = moveObjectEventItem(movedRootToThen, {
      objectId: objectResult.objectId,
      eventId,
      actionId: rootAction.action.id,
      targetIfBlockId: ifA.id,
      targetBranch: "else"
    })
    const ifAAfterElseMove = movedThenToElse.objects[0]?.events[0]?.items.find((item) => item.type === "if" && item.id === ifA.id)
    expect(ifAAfterElseMove?.type).toBe("if")
    if (ifAAfterElseMove?.type === "if") {
      expect(ifAAfterElseMove.thenActions).toHaveLength(0)
      expect(ifAAfterElseMove.elseActions).toHaveLength(1)
      expect(ifAAfterElseMove.elseActions[0]?.type).toBe("action")
    }

    const withNestedIf = addObjectEventIfBlock(movedThenToElse, {
      objectId: objectResult.objectId,
      eventId,
      condition: {
        left: { scope: "global", variableId: "gv-nested" },
        operator: ">=",
        right: 1
      },
      parentIfBlockId: ifB.id,
      parentBranch: "then"
    })
    const ifBAfterNested = withNestedIf.objects[0]?.events[0]?.items.find((item) => item.type === "if" && item.id === ifB.id)
    const nestedIf = ifBAfterNested?.type === "if" ? ifBAfterNested.thenActions.find((item) => item.type === "if") : null
    if (nestedIf?.type !== "if") {
      throw new Error("Expected nested if block under ifB.then")
    }

    const movedElseToNestedThen = moveObjectEventItem(withNestedIf, {
      objectId: objectResult.objectId,
      eventId,
      actionId: rootAction.action.id,
      targetIfBlockId: nestedIf.id,
      targetBranch: "then"
    })
    const nestedAfterMoveRoot = movedElseToNestedThen.objects[0]?.events[0]?.items.find(
      (item) => item.type === "if" && item.id === ifB.id
    )
    const nestedAfterMove =
      nestedAfterMoveRoot?.type === "if"
        ? nestedAfterMoveRoot.thenActions.find((item) => item.type === "if" && item.id === nestedIf.id)
        : null
    expect(nestedAfterMove?.type).toBe("if")
    if (nestedAfterMove?.type === "if") {
      expect(nestedAfterMove.thenActions).toHaveLength(1)
      expect(nestedAfterMove.thenActions[0]?.type).toBe("action")
      if (nestedAfterMove.thenActions[0]?.type === "action") {
        expect(nestedAfterMove.thenActions[0].action.id).toBe(rootAction.action.id)
      }
    }

    const movedNestedToRootBefore = moveObjectEventItem(movedElseToNestedThen, {
      objectId: objectResult.objectId,
      eventId,
      actionId: rootAction.action.id,
      targetActionId: secondRootAction.action.id,
      position: "top"
    })
    const rootActionsAfterReturn = movedNestedToRootBefore.objects[0]?.events[0]?.items.filter((item) => item.type === "action") ?? []
    expect(rootActionsAfterReturn[0]?.type).toBe("action")
    expect(rootActionsAfterReturn[1]?.type).toBe("action")
    if (rootActionsAfterReturn[0]?.type === "action" && rootActionsAfterReturn[1]?.type === "action") {
      expect(rootActionsAfterReturn[0].action.id).toBe(rootAction.action.id)
      expect(rootActionsAfterReturn[1].action.id).toBe(secondRootAction.action.id)
    }

    const noOpInvalidTarget = moveObjectEventItem(movedNestedToRootBefore, {
      objectId: objectResult.objectId,
      eventId,
      actionId: rootAction.action.id,
      targetIfBlockId: "if-missing",
      targetBranch: "then"
    })
    expect(noOpInvalidTarget).toEqual(movedNestedToRootBefore)
  })

  it("clones event items deeply with regenerated ids", () => {
    const initial = createEmptyProjectV1("Clone event item")
    const objectResult = quickCreateObject(initial, { name: "Player" })
    const withEvent = addObjectEvent(objectResult.project, { objectId: objectResult.objectId, type: "Step" })
    const eventId = withEvent.objects[0]?.events[0]?.id
    if (!eventId) {
      throw new Error("Expected event to be created")
    }

    const withRootIf = addObjectEventIfBlock(withEvent, {
      objectId: objectResult.objectId,
      eventId,
      condition: {
        left: { scope: "global", variableId: "gv-root" },
        operator: "==",
        right: 1
      }
    })
    const rootIf = withRootIf.objects[0]?.events[0]?.items.find((entry) => entry.type === "if")
    if (rootIf?.type !== "if") {
      throw new Error("Expected root if block")
    }

    const withThenAction = addObjectEventIfAction(withRootIf, {
      objectId: objectResult.objectId,
      eventId,
      ifBlockId: rootIf.id,
      branch: "then",
      action: { type: "changeScore", delta: 4 }
    })
    const withNestedIf = addObjectEventIfBlock(withThenAction, {
      objectId: objectResult.objectId,
      eventId,
      parentIfBlockId: rootIf.id,
      parentBranch: "else",
      condition: {
        left: { scope: "object", variableId: "ov-health" },
        operator: ">",
        right: 0
      }
    })
    const rootIfWithChildren = withNestedIf.objects[0]?.events[0]?.items.find(
      (entry) => entry.type === "if" && entry.id === rootIf.id
    )
    if (rootIfWithChildren?.type !== "if") {
      throw new Error("Expected if block with children")
    }

    const cloned = cloneObjectEventItemForPaste(rootIfWithChildren)
    expect(cloned.type).toBe("if")
    if (cloned.type === "if") {
      expect(cloned.id).not.toBe(rootIfWithChildren.id)
      expect(cloned.condition).toEqual(rootIfWithChildren.condition)
      expect(cloned.thenActions[0]?.type).toBe("action")
      expect(cloned.elseActions[0]?.type).toBe("if")

      const originalThenAction =
        rootIfWithChildren.thenActions[0]?.type === "action" ? rootIfWithChildren.thenActions[0] : null
      const clonedThenAction = cloned.thenActions[0]?.type === "action" ? cloned.thenActions[0] : null
      expect(clonedThenAction?.id).not.toBe(originalThenAction?.id)
      expect(clonedThenAction?.action.id).not.toBe(originalThenAction?.action.id)

      const originalNestedIf = rootIfWithChildren.elseActions[0]?.type === "if" ? rootIfWithChildren.elseActions[0] : null
      const clonedNestedIf = cloned.elseActions[0]?.type === "if" ? cloned.elseActions[0] : null
      expect(clonedNestedIf?.id).not.toBe(originalNestedIf?.id)
      expect(clonedNestedIf?.condition).toEqual(originalNestedIf?.condition)
    }
  })

  it("inserts a cloned item after a nested action id", () => {
    const initial = createEmptyProjectV1("Insert cloned event item")
    const objectResult = quickCreateObject(initial, { name: "Player" })
    const withEvent = addObjectEvent(objectResult.project, { objectId: objectResult.objectId, type: "Step" })
    const eventId = withEvent.objects[0]?.events[0]?.id
    if (!eventId) {
      throw new Error("Expected event to be created")
    }

    const withIf = addObjectEventIfBlock(withEvent, {
      objectId: objectResult.objectId,
      eventId,
      condition: {
        left: { scope: "global", variableId: "gv-test" },
        operator: "==",
        right: 1
      }
    })
    const rootIf = withIf.objects[0]?.events[0]?.items.find((entry) => entry.type === "if")
    if (rootIf?.type !== "if") {
      throw new Error("Expected root if block")
    }

    const withFirstNestedAction = addObjectEventIfAction(withIf, {
      objectId: objectResult.objectId,
      eventId,
      ifBlockId: rootIf.id,
      branch: "then",
      action: { type: "changeScore", delta: 1 }
    })
    const withSecondNestedAction = addObjectEventIfAction(withFirstNestedAction, {
      objectId: objectResult.objectId,
      eventId,
      ifBlockId: rootIf.id,
      branch: "then",
      action: { type: "changeScore", delta: 2 }
    })

    const beforeInsertRoot = withSecondNestedAction.objects[0]?.events[0]?.items.find(
      (entry) => entry.type === "if" && entry.id === rootIf.id
    )
    if (
      beforeInsertRoot?.type !== "if" ||
      beforeInsertRoot.thenActions[0]?.type !== "action" ||
      beforeInsertRoot.thenActions[1]?.type !== "action"
    ) {
      throw new Error("Expected nested actions inside then branch")
    }

    const copiedItem = cloneObjectEventItemForPaste(beforeInsertRoot.thenActions[0])
    const afterInsert = insertObjectEventItem(withSecondNestedAction, {
      objectId: objectResult.objectId,
      eventId,
      afterItemId: beforeInsertRoot.thenActions[1].action.id,
      item: copiedItem
    })

    const afterInsertRoot = afterInsert.objects[0]?.events[0]?.items.find((entry) => entry.type === "if" && entry.id === rootIf.id)
    expect(afterInsertRoot?.type).toBe("if")
    if (afterInsertRoot?.type === "if") {
      expect(afterInsertRoot.thenActions).toHaveLength(3)
      expect(afterInsertRoot.thenActions[2]?.type).toBe("action")
      if (
        afterInsertRoot.thenActions[2]?.type === "action" &&
        beforeInsertRoot.thenActions[0]?.type === "action"
      ) {
        expect(afterInsertRoot.thenActions[2].action.id).not.toBe(beforeInsertRoot.thenActions[0].action.id)
        expect(afterInsertRoot.thenActions[2].action.type).toBe(beforeInsertRoot.thenActions[0].action.type)
      }
    }
  })

  it("inserts a cloned if block after another if block", () => {
    const initial = createEmptyProjectV1("Insert after if block")
    const objectResult = quickCreateObject(initial, { name: "Player" })
    const withEvent = addObjectEvent(objectResult.project, { objectId: objectResult.objectId, type: "Step" })
    const eventId = withEvent.objects[0]?.events[0]?.id
    if (!eventId) {
      throw new Error("Expected event to be created")
    }

    const withFirstIf = addObjectEventIfBlock(withEvent, {
      objectId: objectResult.objectId,
      eventId,
      condition: {
        left: { scope: "global", variableId: "gv-first" },
        operator: "==",
        right: 1
      }
    })
    const withSecondIf = addObjectEventIfBlock(withFirstIf, {
      objectId: objectResult.objectId,
      eventId,
      condition: {
        left: { scope: "global", variableId: "gv-second" },
        operator: "==",
        right: 2
      }
    })
    const topLevelIfItems = withSecondIf.objects[0]?.events[0]?.items.filter((entry) => entry.type === "if") ?? []
    const firstIf = topLevelIfItems[0]
    if (firstIf?.type !== "if") {
      throw new Error("Expected first if block")
    }

    const copiedIfItem = cloneObjectEventItemForPaste(firstIf)
    const afterInsert = insertObjectEventItem(withSecondIf, {
      objectId: objectResult.objectId,
      eventId,
      afterItemId: firstIf.id,
      item: copiedIfItem
    })
    const updatedIfItems = afterInsert.objects[0]?.events[0]?.items.filter((entry) => entry.type === "if") ?? []
    expect(updatedIfItems).toHaveLength(3)
    expect(updatedIfItems[1]?.id).not.toBe(firstIf.id)
    if (updatedIfItems[1]?.type === "if") {
      expect(updatedIfItems[1].condition).toEqual(firstIf.condition)
    }
  })

  it("manages global and object variable definitions with uniqueness", () => {
    const initial = createEmptyProjectV1("Variables")
    const withObject = quickCreateObject(initial, { name: "Player" })
    const objectId = withObject.objectId

    const withGlobal = addGlobalVariable(withObject.project, {
      name: "score",
      type: "number",
      initialValue: 0
    })
    const globalVariableId = withGlobal.variableId
    if (!globalVariableId) {
      throw new Error("Expected global variable to be created")
    }
    const withDuplicateGlobal = addGlobalVariable(withGlobal.project, {
      name: "Score",
      type: "number",
      initialValue: 1
    })
    expect(withDuplicateGlobal.variableId).toBeNull()

    const withUpdatedGlobal = updateGlobalVariable(withGlobal.project, {
      variableId: globalVariableId,
      name: "totalScore",
      initialValue: 5
    })
    expect(withUpdatedGlobal.variables.global[0]?.name).toBe("totalScore")
    expect(withUpdatedGlobal.variables.global[0]?.initialValue).toBe(5)

    const withObjectVariable = addObjectVariable(withUpdatedGlobal, {
      objectId,
      name: "health",
      type: "number",
      initialValue: 3
    })
    const objectVariableId = withObjectVariable.variableId
    if (!objectVariableId) {
      throw new Error("Expected object variable to be created")
    }
    const withDuplicateObjectVariable = addObjectVariable(withObjectVariable.project, {
      objectId,
      name: "HEALTH",
      type: "number",
      initialValue: 8
    })
    expect(withDuplicateObjectVariable.variableId).toBeNull()

    const withUpdatedObjectVariable = updateObjectVariable(withObjectVariable.project, {
      objectId,
      variableId: objectVariableId,
      name: "hp",
      initialValue: 7
    })
    expect(withUpdatedObjectVariable.variables.objectByObjectId[objectId]?.[0]?.name).toBe("hp")
    expect(withUpdatedObjectVariable.variables.objectByObjectId[objectId]?.[0]?.initialValue).toBe(7)

    const withoutObjectVariable = removeObjectVariable(withUpdatedObjectVariable, {
      objectId,
      variableId: objectVariableId
    })
    const withoutGlobal = removeGlobalVariable(withoutObjectVariable, { variableId: globalVariableId })

    expect(withoutObjectVariable.variables.objectByObjectId[objectId]).toHaveLength(0)
    expect(withoutGlobal.variables.global).toHaveLength(0)
  })
})
