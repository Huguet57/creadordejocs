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

export function createCoinDashTemplateProject(): TemplateProjectResult {
  const coinsToWin = 3
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

  const room = createRoom(enemyObject.project, "Coin Dash")
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
  const withCoin2 = addRoomInstance(withEnemy2, {
    roomId: room.roomId,
    objectId: coinObject.objectId,
    x: 120,
    y: 80
  }).project
  const withCoin3 = addRoomInstance(withCoin2, {
    roomId: room.roomId,
    objectId: coinObject.objectId,
    x: 430,
    y: 60
  }).project

  const withCoinsRemaining = addGlobalVariableWithId(withCoin3, {
    name: "coinsRemaining",
    type: "number",
    initialValue: coinsToWin
  })
  const coinsRemainingId = withCoinsRemaining.variableId
  let project = withCoinsRemaining.project
  project = addEventWithActions(project, playerObject.objectId, { type: "Keyboard", keyboardMode: "down", key: "ArrowUp" }, [
    { type: "move", dx: 0, dy: -6 }
  ])
  project = addEventWithActions(project, playerObject.objectId, { type: "Keyboard", keyboardMode: "down", key: "ArrowDown" }, [
    { type: "move", dx: 0, dy: 6 }
  ])
  project = addEventWithActions(project, playerObject.objectId, { type: "Keyboard", keyboardMode: "down", key: "ArrowLeft" }, [
    { type: "move", dx: -6, dy: 0 }
  ])
  project = addEventWithActions(project, playerObject.objectId, { type: "Keyboard", keyboardMode: "down", key: "ArrowRight" }, [
    { type: "move", dx: 6, dy: 0 }
  ])
  project = addEventWithActions(project, playerObject.objectId, { type: "Step" }, [{ type: "clampToRoom" }])
  project = addEventWithActions(project, enemyObject.objectId, { type: "Step" }, [
    { type: "setVelocity", speed: 1.9, direction: 0 }
  ])
  project = addEventWithActions(
    project,
    playerObject.objectId,
    { type: "Collision", targetObjectId: coinObject.objectId },
    [
      { type: "playSound", soundId: soundCoin.soundId },
      { type: "changeScore", delta: 100 },
      {
        type: "changeVariable",
        scope: "global",
        variableId: coinsRemainingId,
        operator: "subtract",
        value: 1
      },
      { type: "destroyOther" }
    ]
  )
  project = addIfBlockToLatestEvent(
    project,
    playerObject.objectId,
    {
      left: { scope: "global", variableId: coinsRemainingId },
      operator: "<=",
      right: 0
    },
    [{ type: "endGame", message: "Has recollit totes les monedes. Has guanyat!" }]
  )
  project = addEventWithActions(
    project,
    playerObject.objectId,
    { type: "Collision", targetObjectId: enemyObject.objectId },
    [
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
