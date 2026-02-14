import {
  addRoomInstance,
  createEmptyProjectV1,
  createRoom,
  quickCreateObject,
  quickCreateSound,
  quickCreateSprite
} from "@creadordejocs/project-format"
import { addEventWithActions, addGlobalVariableWithId, addObjectVariableWithId } from "./helpers.js"
import type { TemplateProjectResult } from "./types.js"

export function createCoinDashTemplateProject(): TemplateProjectResult {
  const empty = createEmptyProjectV1("Coin Dash")
  const spritePlayer = quickCreateSprite(empty, "Explorer")
  const spriteCoin = quickCreateSprite(spritePlayer.project, "Coin")
  const spriteEnemy = quickCreateSprite(spriteCoin.project, "Enemy")
  const soundCoin = quickCreateSound(spriteEnemy.project, "Coin")
  const soundHit = quickCreateSound(soundCoin.project, "Hit")

  const playerObject = quickCreateObject(soundHit.project, {
    name: "Explorer",
    spriteId: spritePlayer.spriteId,
    x: 280,
    y: 250
  })
  const coinObject = quickCreateObject(playerObject.project, {
    name: "Coin",
    spriteId: spriteCoin.spriteId,
    x: 280,
    y: 70
  })
  const enemyObject = quickCreateObject(coinObject.project, {
    name: "Patroller",
    spriteId: spriteEnemy.spriteId,
    x: 100,
    y: 150
  })

  const playerHealthVar = addObjectVariableWithId(enemyObject.project, {
    objectId: playerObject.objectId,
    name: "health",
    type: "number",
    initialValue: 1
  })
  const enemyTouchedVar = addObjectVariableWithId(playerHealthVar.project, {
    objectId: enemyObject.objectId,
    name: "wasTouched",
    type: "boolean",
    initialValue: false
  })
  const coinsCollectedGlobal = addGlobalVariableWithId(enemyTouchedVar.project, {
    name: "coins_collected",
    type: "number",
    initialValue: 0
  })
  const playerDownGlobal = addGlobalVariableWithId(coinsCollectedGlobal.project, {
    name: "player_down",
    type: "boolean",
    initialValue: false
  })

  const room = createRoom(playerDownGlobal.project, "Coin Dash")
  const withPlayer = addRoomInstance(room.project, {
    roomId: room.roomId,
    objectId: playerObject.objectId,
    x: 280,
    y: 250
  }).project
  const withCoin = addRoomInstance(withPlayer, {
    roomId: room.roomId,
    objectId: coinObject.objectId,
    x: 280,
    y: 70
  }).project
  const withEnemy = addRoomInstance(withCoin, {
    roomId: room.roomId,
    objectId: enemyObject.objectId,
    x: 100,
    y: 150
  }).project
  const withEnemy2 = addRoomInstance(withEnemy, {
    roomId: room.roomId,
    objectId: enemyObject.objectId,
    x: 430,
    y: 110
  }).project

  let project = withEnemy2
  project = addEventWithActions(project, playerObject.objectId, { type: "Keyboard", key: "ArrowUp" }, [
    { type: "move", dx: 0, dy: -6 }
  ])
  project = addEventWithActions(project, playerObject.objectId, { type: "Keyboard", key: "ArrowDown" }, [
    { type: "move", dx: 0, dy: 6 }
  ])
  project = addEventWithActions(project, playerObject.objectId, { type: "Keyboard", key: "ArrowLeft" }, [
    { type: "move", dx: -6, dy: 0 }
  ])
  project = addEventWithActions(project, playerObject.objectId, { type: "Keyboard", key: "ArrowRight" }, [
    { type: "move", dx: 6, dy: 0 }
  ])
  project = addEventWithActions(project, playerObject.objectId, { type: "Step" }, [{ type: "clampToRoom" }])
  project = addEventWithActions(project, enemyObject.objectId, { type: "Step" }, [
    { type: "setVelocity", speed: 1.9, direction: 0 }
  ])
  project = addEventWithActions(project, coinObject.objectId, { type: "OnDestroy" }, [
    { type: "setGlobalVariable", variableId: coinsCollectedGlobal.variableId, value: 1 },
    { type: "playSound", soundId: soundCoin.soundId },
    { type: "changeScore", delta: 100 },
    { type: "endGame", message: "Has recollit la moneda. Has guanyat!" }
  ])
  project = addEventWithActions(
    project,
    playerObject.objectId,
    { type: "Collision", targetObjectId: coinObject.objectId },
    [{ type: "destroyOther" }]
  )
  project = addEventWithActions(
    project,
    playerObject.objectId,
    { type: "Collision", targetObjectId: enemyObject.objectId },
    [
      { type: "setObjectVariable", variableId: playerHealthVar.variableId, target: "self", targetInstanceId: null, value: 0 },
      { type: "setObjectVariable", variableId: enemyTouchedVar.variableId, target: "other", targetInstanceId: null, value: true },
      {
        type: "setGlobalVariableFromObject",
        globalVariableId: playerDownGlobal.variableId,
        source: "other",
        sourceInstanceId: null,
        objectVariableId: enemyTouchedVar.variableId
      },
      { type: "playSound", soundId: soundHit.soundId },
      { type: "endGame", message: "T'ha tocat un enemic" }
    ]
  )

  return {
    project,
    roomId: room.roomId,
    focusObjectId: playerObject.objectId
  }
}
