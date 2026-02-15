import {
  addRoomInstance,
  createEmptyProjectV1,
  createRoom,
  quickCreateObject,
  quickCreateSound,
  quickCreateSprite
} from "@creadordejocs/project-format"
import { addEventWithActions, addGlobalVariableWithId, addIfBlockToLatestEvent, addNestedIfElseToLatestIfBlock } from "./helpers.js"
import type { TemplateProjectResult } from "./types.js"

export function createTurretGauntletTemplateProject(): TemplateProjectResult {
  const empty = createEmptyProjectV1("Turret Gauntlet")
  const spriteTurret = quickCreateSprite(empty, "Turret")
  const spriteBolt = quickCreateSprite(spriteTurret.project, "Bolt")
  const spriteDrone = quickCreateSprite(spriteBolt.project, "Drone")
  const soundShot = quickCreateSound(spriteDrone.project, "Shot")
  const soundHit = quickCreateSound(soundShot.project, "Hit")
  const soundLose = quickCreateSound(soundHit.project, "Lose")

  const turretObject = quickCreateObject(soundLose.project, {
    name: "Turret",
    spriteId: spriteTurret.spriteId,
    x: 280,
    y: 260
  })
  const boltObject = quickCreateObject(turretObject.project, {
    name: "Bolt",
    spriteId: spriteBolt.spriteId,
    x: 280,
    y: 240
  })
  const droneObject = quickCreateObject(boltObject.project, {
    name: "Drone",
    spriteId: spriteDrone.spriteId,
    x: 510,
    y: 120
  })

  const room = createRoom(droneObject.project, "Gauntlet")
  const withTurret = addRoomInstance(room.project, {
    roomId: room.roomId,
    objectId: turretObject.objectId,
    x: 280,
    y: 260
  }).project
  const withDroneA = addRoomInstance(withTurret, {
    roomId: room.roomId,
    objectId: droneObject.objectId,
    x: 500,
    y: 70
  }).project
  const withDroneB = addRoomInstance(withDroneA, {
    roomId: room.roomId,
    objectId: droneObject.objectId,
    x: 520,
    y: 140
  }).project
  const withDroneC = addRoomInstance(withDroneB, {
    roomId: room.roomId,
    objectId: droneObject.objectId,
    x: 510,
    y: 220
  }).project
  const withDroneD = addRoomInstance(withDroneC, {
    roomId: room.roomId,
    objectId: droneObject.objectId,
    x: 480,
    y: 280
  }).project

  const withDronesRemaining = addGlobalVariableWithId(withDroneD, {
    name: "dronesRemaining",
    type: "number",
    initialValue: 4
  })
  const dronesRemainingId = withDronesRemaining.variableId

  let project = withDronesRemaining.project
  project = addEventWithActions(project, turretObject.objectId, { type: "MouseClick" }, [
    { type: "playSound", soundId: soundShot.soundId },
    { type: "spawnObject", objectId: boltObject.objectId, offsetX: 0, offsetY: -12 }
  ])
  project = addEventWithActions(project, boltObject.objectId, { type: "Create" }, [])
  project = addIfBlockToLatestEvent(
    project,
    boltObject.objectId,
    {
      left: { scope: "global", variableId: "__mouse_x" },
      operator: ">=",
      right: 400
    },
    [{ type: "setVelocity", speed: 6, direction: 0 }]
  )
  project = addNestedIfElseToLatestIfBlock(
    project,
    boltObject.objectId,
    "else",
    {
      left: { scope: "global", variableId: "__mouse_x" },
      operator: "<=",
      right: 160
    },
    [{ type: "setVelocity", speed: 6, direction: 180 }],
    [{ type: "setVelocity", speed: 6, direction: 270 }]
  )
  project = addEventWithActions(project, boltObject.objectId, { type: "Timer", intervalMs: 800 }, [{ type: "destroySelf" }])
  project = addEventWithActions(project, droneObject.objectId, { type: "Step" }, [{ type: "setVelocity", speed: 1.8, direction: 180 }])
  project = addEventWithActions(project, droneObject.objectId, { type: "OutsideRoom" }, [{ type: "teleport", mode: "start", x: null, y: null }])
  project = addEventWithActions(project, boltObject.objectId, { type: "Collision", targetObjectId: droneObject.objectId }, [
    { type: "playSound", soundId: soundHit.soundId },
    { type: "changeScore", delta: 25 },
    {
      type: "changeVariable",
      scope: "global",
      variableId: dronesRemainingId,
      operator: "subtract",
      value: 1
    },
    { type: "destroySelf" },
    { type: "destroyOther" }
  ])
  project = addIfBlockToLatestEvent(
    project,
    boltObject.objectId,
    {
      left: { scope: "global", variableId: dronesRemainingId },
      operator: "<=",
      right: 0
    },
    [{ type: "endGame", message: "Has netejat l'espai aeri. Defensa completada!" }]
  )
  project = addEventWithActions(project, turretObject.objectId, { type: "Collision", targetObjectId: droneObject.objectId }, [
    { type: "playSound", soundId: soundLose.soundId },
    { type: "endGame", message: "Un drone ha destruït la torreta." }
  ])

  return {
    project,
    roomId: room.roomId,
    focusObjectId: turretObject.objectId
  }
}
