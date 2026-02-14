import {
  addObjectEvent,
  addObjectEventAction,
  addRoomInstance,
  createEmptyProjectV1,
  createRoom,
  quickCreateObject,
  quickCreateSound,
  quickCreateSprite,
  type ProjectV1
} from "@creadordejocs/project-format"

export type DodgeTemplateResult = {
  project: ProjectV1
  roomId: string
  playerObjectId: string
}

export function createDodgeTemplateProject(): DodgeTemplateResult {
  const empty = createEmptyProjectV1("Dodge template")
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

  const playerLeft = addObjectEvent(withEnemy, {
    objectId: playerObject.objectId,
    type: "Keyboard",
    key: "ArrowLeft"
  })
  const playerLeftAction = addObjectEventAction(playerLeft, {
    objectId: playerObject.objectId,
    eventId: playerLeft.objects.find((entry) => entry.id === playerObject.objectId)?.events.at(-1)?.id ?? "",
    action: { type: "move", dx: -5, dy: 0 }
  })

  const playerRight = addObjectEvent(playerLeftAction, {
    objectId: playerObject.objectId,
    type: "Keyboard",
    key: "ArrowRight"
  })
  const playerRightAction = addObjectEventAction(playerRight, {
    objectId: playerObject.objectId,
    eventId: playerRight.objects.find((entry) => entry.id === playerObject.objectId)?.events.at(-1)?.id ?? "",
    action: { type: "move", dx: 5, dy: 0 }
  })

  const playerStep = addObjectEvent(playerRightAction, {
    objectId: playerObject.objectId,
    type: "Step"
  })
  const playerStepId = playerStep.objects.find((entry) => entry.id === playerObject.objectId)?.events.at(-1)?.id ?? ""
  const playerStepActions = addObjectEventAction(playerStep, {
    objectId: playerObject.objectId,
    eventId: playerStepId,
    action: { type: "clampToRoom" }
  })
  const playerScoreAction = addObjectEventAction(playerStepActions, {
    objectId: playerObject.objectId,
    eventId: playerStepId,
    action: { type: "changeScore", delta: 1 }
  })

  const enemyStep = addObjectEvent(playerScoreAction, {
    objectId: enemyObject.objectId,
    type: "Step"
  })
  const enemyStepId = enemyStep.objects.find((entry) => entry.id === enemyObject.objectId)?.events.at(-1)?.id ?? ""
  const enemyStepAction = addObjectEventAction(enemyStep, {
    objectId: enemyObject.objectId,
    eventId: enemyStepId,
    action: { type: "move", dx: 0, dy: 1.8 }
  })

  const playerCollision = addObjectEvent(enemyStepAction, {
    objectId: playerObject.objectId,
    type: "Collision",
    targetObjectId: enemyObject.objectId
  })
  const playerCollisionId =
    playerCollision.objects.find((entry) => entry.id === playerObject.objectId)?.events.at(-1)?.id ?? ""
  const playerCollisionSound = addObjectEventAction(playerCollision, {
    objectId: playerObject.objectId,
    eventId: playerCollisionId,
    action: { type: "playSound", soundId: soundHit.soundId }
  })
  const finished = addObjectEventAction(playerCollisionSound, {
    objectId: playerObject.objectId,
    eventId: playerCollisionId,
    action: { type: "endGame", message: "Has col·lisionat amb un enemic" }
  })

  return {
    project: finished,
    roomId: room.roomId,
    playerObjectId: playerObject.objectId
  }
}
