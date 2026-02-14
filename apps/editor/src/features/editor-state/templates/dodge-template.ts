import {
  addRoomInstance,
  createEmptyProjectV1,
  createRoom,
  quickCreateObject,
  quickCreateSound,
  quickCreateSprite
} from "@creadordejocs/project-format"
import { addEventWithActions } from "./helpers.js"
import type { TemplateProjectResult } from "./types.js"

export function createDodgeTemplateProject(): TemplateProjectResult {
  const empty = createEmptyProjectV1("Dodge arena")
  const spritePlayer = quickCreateSprite(empty, "Player")
  const spriteEnemy = quickCreateSprite(spritePlayer.project, "Enemy")
  const soundHit = quickCreateSound(spriteEnemy.project, "Hit")
  const playerObject = quickCreateObject(soundHit.project, {
    name: "Player",
    spriteId: spritePlayer.spriteId,
    x: 260,
    y: 260,
    speed: 0,
    direction: 0
  })
  const enemyObject = quickCreateObject(playerObject.project, {
    name: "Enemy",
    spriteId: spriteEnemy.spriteId,
    x: 260,
    y: 16,
    speed: 0,
    direction: 0
  })
  const room = createRoom(enemyObject.project, "Dodge arena")
  const withPlayer = addRoomInstance(room.project, {
    roomId: room.roomId,
    objectId: playerObject.objectId,
    x: 260,
    y: 260
  }).project
  const withEnemy = addRoomInstance(withPlayer, {
    roomId: room.roomId,
    objectId: enemyObject.objectId,
    x: 260,
    y: 16
  }).project

  const withPlayerControls = addEventWithActions(withEnemy, playerObject.objectId, { type: "Keyboard", key: "ArrowLeft" }, [
    { type: "move", dx: -5, dy: 0 }
  ])
  const withPlayerControls2 = addEventWithActions(
    withPlayerControls,
    playerObject.objectId,
    { type: "Keyboard", key: "ArrowRight" },
    [{ type: "move", dx: 5, dy: 0 }]
  )
  const withPlayerStep = addEventWithActions(withPlayerControls2, playerObject.objectId, { type: "Step" }, [
    { type: "clampToRoom" },
    { type: "changeScore", delta: 1 }
  ])
  const withEnemyStep = addEventWithActions(withPlayerStep, enemyObject.objectId, { type: "Step" }, [
    { type: "move", dx: 0, dy: 1.8 }
  ])
  const finished = addEventWithActions(
    withEnemyStep,
    playerObject.objectId,
    { type: "Collision", targetObjectId: enemyObject.objectId },
    [
      { type: "playSound", soundId: soundHit.soundId },
      { type: "endGame", message: "Has col·lisionat amb un enemic" }
    ]
  )

  return {
    project: finished,
    roomId: room.roomId,
    focusObjectId: playerObject.objectId
  }
}
