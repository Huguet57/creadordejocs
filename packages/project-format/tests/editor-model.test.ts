import { describe, expect, it } from "vitest"
import {
  addRoomInstance,
  addObjectEvent,
  addObjectEventAction,
  addObjectEventIfAction,
  addObjectEventIfBlock,
  createEmptyProjectV1,
  createRoom,
  moveObjectEventAction,
  moveRoomInstance,
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
  updateObjectEventIfAction,
  updateObjectEventIfBlockCondition,
  updateObjectEventAction,
  updateObjectEventConfig,
  updateSoundAssetSource,
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
    expect(objectResult.project.objects[0]?.events).toEqual([])
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
      direction: 180
    })

    expect(updated.rooms[0]?.instances[0]?.x).toBe(40)
    expect(updated.rooms[0]?.instances[0]?.y).toBe(88)
    expect(updated.objects[0]?.x).toBe(5)
    expect(updated.objects[0]?.speed).toBe(7)
    expect(updated.objects[0]?.direction).toBe(180)
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
      expect("left" in updatedIf.condition ? updatedIf.condition.left.scope : null).toBe("object")
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
      expect("left" in nestedBeforeRemove.condition ? nestedBeforeRemove.condition.left.scope : null).toBe("object")
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
