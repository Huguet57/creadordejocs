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

export function createSpaceShooterTemplateProject(): TemplateProjectResult {
  const empty = createEmptyProjectV1("Space Shooter")
  const spriteShip = quickCreateSprite(empty, "Ship")
  const spriteBullet = quickCreateSprite(spriteShip.project, "Bullet")
  const spriteAsteroid = quickCreateSprite(spriteBullet.project, "Asteroid")
  const soundShoot = quickCreateSound(spriteAsteroid.project, "Shoot")
  const soundExplosion = quickCreateSound(soundShoot.project, "Explosion")

  const shipObject = quickCreateObject(soundExplosion.project, {
    name: "Ship",
    spriteId: spriteShip.spriteId,
    x: 280,
    y: 265
  })
  const bulletObject = quickCreateObject(shipObject.project, {
    name: "Bullet",
    spriteId: spriteBullet.spriteId,
    x: 0,
    y: 0
  })
  const asteroidObject = quickCreateObject(bulletObject.project, {
    name: "Asteroid",
    spriteId: spriteAsteroid.spriteId,
    x: 280,
    y: 20
  })

  const shipShieldVar = addObjectVariableWithId(asteroidObject.project, {
    objectId: shipObject.objectId,
    name: "shield",
    type: "number",
    initialValue: 3
  })
  const asteroidDestroyedVar = addObjectVariableWithId(shipShieldVar.project, {
    objectId: asteroidObject.objectId,
    name: "destroyed",
    type: "boolean",
    initialValue: false
  })
  const shotsFiredGlobal = addGlobalVariableWithId(asteroidDestroyedVar.project, {
    name: "shots_fired",
    type: "number",
    initialValue: 0
  })
  const shipDestroyedGlobal = addGlobalVariableWithId(shotsFiredGlobal.project, {
    name: "ship_destroyed",
    type: "boolean",
    initialValue: false
  })

  const room = createRoom(shipDestroyedGlobal.project, "Asteroid Field")
  const withShip = addRoomInstance(room.project, {
    roomId: room.roomId,
    objectId: shipObject.objectId,
    x: 280,
    y: 265
  }).project
  const withAsteroid = addRoomInstance(withShip, {
    roomId: room.roomId,
    objectId: asteroidObject.objectId,
    x: 90,
    y: 20
  }).project
  const withAsteroid2 = addRoomInstance(withAsteroid, {
    roomId: room.roomId,
    objectId: asteroidObject.objectId,
    x: 260,
    y: 60
  }).project
  const withAsteroid3 = addRoomInstance(withAsteroid2, {
    roomId: room.roomId,
    objectId: asteroidObject.objectId,
    x: 430,
    y: 30
  }).project

  let project = withAsteroid3
  project = addEventWithActions(project, shipObject.objectId, { type: "Keyboard", key: "ArrowLeft" }, [
    { type: "move", dx: -6, dy: 0 }
  ])
  project = addEventWithActions(project, shipObject.objectId, { type: "Keyboard", key: "ArrowRight" }, [
    { type: "move", dx: 6, dy: 0 }
  ])
  project = addEventWithActions(project, shipObject.objectId, { type: "Keyboard", key: "ArrowUp" }, [
    { type: "move", dx: 0, dy: -4 }
  ])
  project = addEventWithActions(project, shipObject.objectId, { type: "Keyboard", key: "ArrowDown" }, [
    { type: "move", dx: 0, dy: 4 }
  ])
  project = addEventWithActions(project, shipObject.objectId, { type: "Keyboard", key: "Space" }, [
    { type: "setGlobalVariable", variableId: shotsFiredGlobal.variableId, value: 1 },
    { type: "playSound", soundId: soundShoot.soundId },
    { type: "spawnObject", objectId: bulletObject.objectId, offsetX: 0, offsetY: -18 }
  ])
  project = addEventWithActions(project, shipObject.objectId, { type: "Step" }, [{ type: "clampToRoom" }])
  project = addEventWithActions(project, bulletObject.objectId, { type: "Create" }, [
    { type: "setVelocity", speed: 8, direction: 270 }
  ])
  project = addEventWithActions(project, bulletObject.objectId, { type: "Step" }, [
    { type: "setVelocity", speed: 8, direction: 270 }
  ])
  project = addEventWithActions(
    project,
    bulletObject.objectId,
    { type: "Collision", targetObjectId: asteroidObject.objectId },
    [{ type: "destroySelf" }, { type: "destroyOther" }]
  )
  project = addEventWithActions(project, asteroidObject.objectId, { type: "Step" }, [
    { type: "setVelocity", speed: 1.8, direction: 90 }
  ])
  project = addEventWithActions(project, asteroidObject.objectId, { type: "OnDestroy" }, [
    { type: "setObjectVariable", variableId: asteroidDestroyedVar.variableId, target: "self", targetInstanceId: null, value: true },
    { type: "playSound", soundId: soundExplosion.soundId },
    { type: "changeScore", delta: 10 }
  ])
  project = addEventWithActions(
    project,
    asteroidObject.objectId,
    { type: "Collision", targetObjectId: bulletObject.objectId },
    [{ type: "destroySelf" }]
  )
  project = addEventWithActions(
    project,
    shipObject.objectId,
    { type: "Collision", targetObjectId: asteroidObject.objectId },
    [
      { type: "setObjectVariable", variableId: shipShieldVar.variableId, target: "self", targetInstanceId: null, value: 0 },
      { type: "setGlobalVariable", variableId: shipDestroyedGlobal.variableId, value: true },
      { type: "endGame", message: "La nau ha estat destruïda" }
    ]
  )

  return {
    project,
    roomId: room.roomId,
    focusObjectId: shipObject.objectId
  }
}
