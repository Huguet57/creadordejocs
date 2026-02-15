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
  const spriteCore = quickCreateSprite(spriteDrone.project, "Core")
  const soundShot = quickCreateSound(spriteCore.project, "Shot")
  const soundHit = quickCreateSound(soundShot.project, "Hit")
  const soundLose = quickCreateSound(soundHit.project, "Lose")
  const soundOverheat = quickCreateSound(soundLose.project, "Overheat")

  const turretObject = quickCreateObject(soundOverheat.project, {
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
  const coreObject = quickCreateObject(droneObject.project, {
    name: "Core",
    spriteId: spriteCore.spriteId,
    x: 280,
    y: 300
  })

  const room = createRoom(coreObject.project, "Gauntlet")
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
  const withCore = addRoomInstance(withDroneD, {
    roomId: room.roomId,
    objectId: coreObject.objectId,
    x: 280,
    y: 300
  }).project

  const withDronesRemaining = addGlobalVariableWithId(withCore, {
    name: "dronesRemaining",
    type: "number",
    initialValue: 4
  })
  const dronesRemainingId = withDronesRemaining.variableId
  const withHeat = addGlobalVariableWithId(withDronesRemaining.project, {
    name: "heat",
    type: "number",
    initialValue: 0
  })
  const heatId = withHeat.variableId
  const withOverheat = addGlobalVariableWithId(withHeat.project, {
    name: "overheat",
    type: "boolean",
    initialValue: false
  })
  const overheatId = withOverheat.variableId

  let project = withOverheat.project
  project = addEventWithActions(project, turretObject.objectId, { type: "MouseMove" }, [
    { type: "teleport", mode: "mouse", x: null, y: null },
    { type: "clampToRoom" }
  ])
  project = addEventWithActions(project, turretObject.objectId, { type: "MouseClick" }, [])
  project = addIfBlockToLatestEvent(
    project,
    turretObject.objectId,
    {
      left: { scope: "global", variableId: overheatId },
      operator: "==",
      right: false
    },
    [
      { type: "playSound", soundId: soundShot.soundId },
      { type: "spawnObject", objectId: boltObject.objectId, offsetX: 0, offsetY: -12 },
      { type: "changeVariable", scope: "global", variableId: heatId, operator: "add", value: 1 }
    ]
  )
  project = addNestedIfElseToLatestIfBlock(
    project,
    turretObject.objectId,
    "then",
    {
      left: { scope: "global", variableId: heatId },
      operator: ">=",
      right: 5
    },
    [
      { type: "playSound", soundId: soundOverheat.soundId },
      { type: "changeVariable", scope: "global", variableId: overheatId, operator: "set", value: true }
    ],
    []
  )
  project = addNestedIfElseToLatestIfBlock(
    project,
    turretObject.objectId,
    "else",
    {
      left: { scope: "global", variableId: heatId },
      operator: ">=",
      right: 5
    },
    [{ type: "message", text: "Overheat! espera a refredar.", durationMs: 800 }],
    []
  )
  project = addEventWithActions(project, turretObject.objectId, { type: "Timer", intervalMs: 450 }, [])
  project = addIfBlockToLatestEvent(
    project,
    turretObject.objectId,
    {
      left: { scope: "global", variableId: heatId },
      operator: ">",
      right: 0
    },
    [{ type: "changeVariable", scope: "global", variableId: heatId, operator: "subtract", value: 1 }]
  )
  project = addEventWithActions(project, turretObject.objectId, { type: "Timer", intervalMs: 600 }, [])
  project = addIfBlockToLatestEvent(
    project,
    turretObject.objectId,
    {
      left: { scope: "global", variableId: heatId },
      operator: "<=",
      right: 1
    },
    [{ type: "changeVariable", scope: "global", variableId: overheatId, operator: "set", value: false }]
  )
  project = addEventWithActions(project, turretObject.objectId, { type: "MouseDown" }, [])
  project = addIfBlockToLatestEvent(
    project,
    turretObject.objectId,
    {
      left: { scope: "global", variableId: "__mouse_y" },
      operator: ">",
      right: 250
    },
    [{ type: "teleport", mode: "mouse", x: null, y: null }]
  )
  project = addEventWithActions(project, boltObject.objectId, { type: "Create" }, [])
  project = addIfBlockToLatestEvent(
    project,
    boltObject.objectId,
    {
      left: { scope: "global", variableId: "__mouse_y" },
      operator: "<",
      right: 130
    },
    [{ type: "setVelocity", speed: 7.5, direction: 270 }]
  )
  project = addNestedIfElseToLatestIfBlock(
    project,
    boltObject.objectId,
    "else",
    {
      left: { scope: "global", variableId: "__mouse_y" },
      operator: "<",
      right: 220
    },
    [{ type: "setVelocity", speed: 6.5, direction: 270 }],
    [{ type: "setVelocity", speed: 5.5, direction: 270 }]
  )
  project = addEventWithActions(project, boltObject.objectId, { type: "Timer", intervalMs: 900 }, [{ type: "destroySelf" }])
  project = addEventWithActions(project, droneObject.objectId, { type: "Step" }, [{ type: "setVelocity", speed: 1.9, direction: 180 }])
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
  project = addEventWithActions(project, coreObject.objectId, { type: "Collision", targetObjectId: droneObject.objectId }, [
    { type: "playSound", soundId: soundLose.soundId },
    { type: "endGame", message: "Els drons han arribat al nucli." }
  ])

  return {
    project,
    roomId: room.roomId,
    focusObjectId: turretObject.objectId
  }
}
