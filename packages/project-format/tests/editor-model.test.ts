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
    const nestedActionId = withNestedAction.objects[0]?.events[0]?.items.find((item) => item.type === "if" && item.id === ifBlock.id)
    if (nestedActionId?.type !== "if" || !nestedActionId.thenActions[0]) {
      throw new Error("Expected nested action")
    }

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
      actionId: nestedActionId.thenActions[0].id,
      action: { type: "changeScore", delta: 4 }
    })
    const withRemovedNested = removeObjectEventIfAction(withUpdatedNested, {
      objectId: objectResult.objectId,
      eventId,
      ifBlockId: ifBlock.id,
      actionId: nestedActionId.thenActions[0].id
    })
    const withoutIf = removeObjectEventIfBlock(withRemovedNested, {
      objectId: objectResult.objectId,
      eventId,
      ifBlockId: ifBlock.id
    })

    const updatedIf = withUpdatedNested.objects[0]?.events[0]?.items.find((item) => item.type === "if" && item.id === ifBlock.id)
    expect(updatedIf?.type).toBe("if")
    if (updatedIf?.type === "if") {
      expect(updatedIf.condition.left.scope).toBe("object")
      expect(updatedIf.thenActions[0]?.type).toBe("changeScore")
      if (updatedIf.thenActions[0]?.type === "changeScore") {
        expect(updatedIf.thenActions[0].delta).toBe(4)
      }
    }
    const remainingIf = withRemovedNested.objects[0]?.events[0]?.items.find((item) => item.type === "if" && item.id === ifBlock.id)
    if (remainingIf?.type === "if") {
      expect(remainingIf.thenActions).toHaveLength(0)
    }
    expect(withoutIf.objects[0]?.events[0]?.items.some((item) => item.type === "if")).toBe(false)
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
