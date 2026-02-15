import {
  addRoomInstance,
  createEmptyProjectV1,
  createRoom,
  quickCreateObject,
  quickCreateSound,
  quickCreateSprite
} from "@creadordejocs/project-format"
import { addEventWithActions, addGlobalVariableWithId, addIfBlockToLatestEvent } from "./helpers.js"
import type { TemplateProjectResult } from "./types.js"

export function createKeyKeeperTemplateProject(): TemplateProjectResult {
  const empty = createEmptyProjectV1("Key Keeper")
  const spritePlayer = quickCreateSprite(empty, "Adventurer")
  const spriteKey = quickCreateSprite(spritePlayer.project, "Key")
  const spriteDoor = quickCreateSprite(spriteKey.project, "Door")
  const spriteSpike = quickCreateSprite(spriteDoor.project, "Spike")
  const soundPickup = quickCreateSound(spriteSpike.project, "Pickup")
  const soundDoor = quickCreateSound(soundPickup.project, "DoorOpen")
  const soundHit = quickCreateSound(soundDoor.project, "Hit")

  const playerObject = quickCreateObject(soundHit.project, {
    name: "Adventurer",
    spriteId: spritePlayer.spriteId,
    x: 60,
    y: 260
  })
  const keyObject = quickCreateObject(playerObject.project, {
    name: "Key",
    spriteId: spriteKey.spriteId,
    x: 290,
    y: 200
  })
  const doorObject = quickCreateObject(keyObject.project, {
    name: "Door",
    spriteId: spriteDoor.spriteId,
    x: 500,
    y: 260
  })
  const spikeObject = quickCreateObject(doorObject.project, {
    name: "Spike",
    spriteId: spriteSpike.spriteId,
    x: 260,
    y: 260
  })

  const room = createRoom(spikeObject.project, "Key Keeper")
  const withPlayer = addRoomInstance(room.project, {
    roomId: room.roomId,
    objectId: playerObject.objectId,
    x: 60,
    y: 260
  }).project
  const withKey = addRoomInstance(withPlayer, {
    roomId: room.roomId,
    objectId: keyObject.objectId,
    x: 290,
    y: 200
  }).project
  const withDoor = addRoomInstance(withKey, {
    roomId: room.roomId,
    objectId: doorObject.objectId,
    x: 500,
    y: 260
  }).project
  const withSpikeA = addRoomInstance(withDoor, {
    roomId: room.roomId,
    objectId: spikeObject.objectId,
    x: 200,
    y: 260
  }).project
  const withSpikeB = addRoomInstance(withSpikeA, {
    roomId: room.roomId,
    objectId: spikeObject.objectId,
    x: 260,
    y: 260
  }).project
  const withSpikeC = addRoomInstance(withSpikeB, {
    roomId: room.roomId,
    objectId: spikeObject.objectId,
    x: 320,
    y: 260
  }).project

  const withHasKey = addGlobalVariableWithId(withSpikeC, {
    name: "hasKey",
    type: "boolean",
    initialValue: false
  })
  const hasKeyId = withHasKey.variableId
  let project = withHasKey.project
  project = addEventWithActions(project, playerObject.objectId, { type: "KeyDown", key: "ArrowUp" }, [
    { type: "move", dx: 0, dy: -8 }
  ])
  project = addEventWithActions(project, playerObject.objectId, { type: "KeyDown", key: "ArrowDown" }, [
    { type: "move", dx: 0, dy: 8 }
  ])
  project = addEventWithActions(project, playerObject.objectId, { type: "KeyDown", key: "ArrowLeft" }, [
    { type: "move", dx: -8, dy: 0 }
  ])
  project = addEventWithActions(project, playerObject.objectId, { type: "KeyDown", key: "ArrowRight" }, [
    { type: "move", dx: 8, dy: 0 }
  ])
  project = addEventWithActions(project, playerObject.objectId, { type: "Step" }, [{ type: "clampToRoom" }])
  project = addEventWithActions(project, playerObject.objectId, { type: "Collision", targetObjectId: keyObject.objectId }, [
    { type: "playSound", soundId: soundPickup.soundId },
    { type: "changeScore", delta: 50 },
    {
      type: "changeGlobalVariable",
      variableId: hasKeyId,
      operator: "set",
      value: true
    },
    { type: "destroyOther" }
  ])
  project = addEventWithActions(project, playerObject.objectId, { type: "Collision", targetObjectId: doorObject.objectId }, [])
  project = addIfBlockToLatestEvent(
    project,
    playerObject.objectId,
    {
      left: { scope: "global", variableId: hasKeyId },
      operator: "==",
      right: true
    },
    [
      { type: "playSound", soundId: soundDoor.soundId },
      { type: "endGame", message: "Has obert la porta i has escapat!" }
    ]
  )
  project = addIfBlockToLatestEvent(
    project,
    playerObject.objectId,
    {
      left: { scope: "global", variableId: hasKeyId },
      operator: "==",
      right: false
    },
    [{ type: "jumpToStart" }]
  )
  project = addEventWithActions(
    project,
    playerObject.objectId,
    { type: "Collision", targetObjectId: spikeObject.objectId },
    [
      { type: "playSound", soundId: soundHit.soundId },
      { type: "endGame", message: "T'has punxat. Torna-ho a provar." }
    ]
  )

  return {
    project,
    roomId: room.roomId,
    focusObjectId: playerObject.objectId
  }
}
