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

export function createReactorEscapeTemplateProject(): TemplateProjectResult {
  const empty = createEmptyProjectV1("Reactor Escape")
  const spritePilot = quickCreateSprite(empty, "Pilot")
  const spriteDrone = quickCreateSprite(spritePilot.project, "Drone")
  const spriteCore = quickCreateSprite(spriteDrone.project, "Core")
  const soundAlarm = quickCreateSound(spriteCore.project, "Alarm")
  const soundHit = quickCreateSound(soundAlarm.project, "Hit")
  const soundWin = quickCreateSound(soundHit.project, "Win")

  const pilotObject = quickCreateObject(soundWin.project, {
    name: "Pilot",
    spriteId: spritePilot.spriteId,
    x: 280,
    y: 260
  })
  const droneRightObject = quickCreateObject(pilotObject.project, {
    name: "DroneRight",
    spriteId: spriteDrone.spriteId,
    x: 40,
    y: 180
  })
  const droneLeftObject = quickCreateObject(droneRightObject.project, {
    name: "DroneLeft",
    spriteId: spriteDrone.spriteId,
    x: 520,
    y: 120
  })
  const coreObject = quickCreateObject(droneLeftObject.project, {
    name: "Core",
    spriteId: spriteCore.spriteId,
    x: 280,
    y: 20
  })
  const controllerObject = quickCreateObject(coreObject.project, {
    name: "Controller",
    spriteId: null,
    x: 0,
    y: 0
  })

  const room = createRoom(controllerObject.project, "Reactor")
  const withPilot = addRoomInstance(room.project, {
    roomId: room.roomId,
    objectId: pilotObject.objectId,
    x: 280,
    y: 260
  }).project
  const withDroneA = addRoomInstance(withPilot, {
    roomId: room.roomId,
    objectId: droneRightObject.objectId,
    x: 60,
    y: 180
  }).project
  const withDroneB = addRoomInstance(withDroneA, {
    roomId: room.roomId,
    objectId: droneRightObject.objectId,
    x: 210,
    y: 220
  }).project
  const withDroneC = addRoomInstance(withDroneB, {
    roomId: room.roomId,
    objectId: droneLeftObject.objectId,
    x: 500,
    y: 120
  }).project
  const withDroneD = addRoomInstance(withDroneC, {
    roomId: room.roomId,
    objectId: droneLeftObject.objectId,
    x: 350,
    y: 80
  }).project
  const withCore = addRoomInstance(withDroneD, {
    roomId: room.roomId,
    objectId: coreObject.objectId,
    x: 280,
    y: 24
  }).project
  const withController = addRoomInstance(withCore, {
    roomId: room.roomId,
    objectId: controllerObject.objectId,
    x: 0,
    y: 0
  }).project

  const withShields = addGlobalVariableWithId(withController, {
    name: "shields",
    type: "number",
    initialValue: 2
  })
  const shieldsId = withShields.variableId
  const withTimer = addGlobalVariableWithId(withShields.project, {
    name: "timeLeft",
    type: "number",
    initialValue: 20
  })
  const timeLeftId = withTimer.variableId

  let project = withTimer.project
  project = addEventWithActions(project, pilotObject.objectId, { type: "KeyDown", key: "ArrowUp" }, [
    { type: "move", dx: 0, dy: -10 }
  ])
  project = addEventWithActions(project, pilotObject.objectId, { type: "KeyDown", key: "ArrowDown" }, [
    { type: "move", dx: 0, dy: 10 }
  ])
  project = addEventWithActions(project, pilotObject.objectId, { type: "KeyDown", key: "ArrowLeft" }, [
    { type: "move", dx: -10, dy: 0 }
  ])
  project = addEventWithActions(project, pilotObject.objectId, { type: "KeyDown", key: "ArrowRight" }, [
    { type: "move", dx: 10, dy: 0 }
  ])
  project = addEventWithActions(project, pilotObject.objectId, { type: "Step" }, [{ type: "clampToRoom" }])
  project = addEventWithActions(project, droneRightObject.objectId, { type: "Step" }, [
    { type: "setVelocity", speed: 2.3, direction: 0 }
  ])
  project = addEventWithActions(project, droneLeftObject.objectId, { type: "Step" }, [
    { type: "setVelocity", speed: 2.5, direction: 180 }
  ])
  project = addEventWithActions(
    project,
    pilotObject.objectId,
    { type: "Collision", targetObjectId: droneRightObject.objectId },
    [
      { type: "playSound", soundId: soundHit.soundId },
      {
        type: "changeGlobalVariable",
        variableId: shieldsId,
        operator: "subtract",
        value: 1
      }
    ]
  )
  project = addIfBlockToLatestEvent(
    project,
    pilotObject.objectId,
    {
      left: { scope: "global", variableId: shieldsId },
      operator: ">",
      right: 0
    },
    [{ type: "jumpToStart" }]
  )
  project = addIfBlockToLatestEvent(
    project,
    pilotObject.objectId,
    {
      left: { scope: "global", variableId: shieldsId },
      operator: "<=",
      right: 0
    },
    [{ type: "endGame", message: "Has perdut tots els escuts." }]
  )
  project = addEventWithActions(
    project,
    pilotObject.objectId,
    { type: "Collision", targetObjectId: droneLeftObject.objectId },
    [
      { type: "playSound", soundId: soundHit.soundId },
      {
        type: "changeGlobalVariable",
        variableId: shieldsId,
        operator: "subtract",
        value: 1
      }
    ]
  )
  project = addIfBlockToLatestEvent(
    project,
    pilotObject.objectId,
    {
      left: { scope: "global", variableId: shieldsId },
      operator: ">",
      right: 0
    },
    [{ type: "jumpToStart" }]
  )
  project = addIfBlockToLatestEvent(
    project,
    pilotObject.objectId,
    {
      left: { scope: "global", variableId: shieldsId },
      operator: "<=",
      right: 0
    },
    [{ type: "endGame", message: "Has perdut tots els escuts." }]
  )
  project = addEventWithActions(project, controllerObject.objectId, { type: "Timer", intervalMs: 1000 }, [
    {
      type: "changeGlobalVariable",
      variableId: timeLeftId,
      operator: "subtract",
      value: 1
    }
  ])
  project = addIfBlockToLatestEvent(
    project,
    controllerObject.objectId,
    {
      left: { scope: "global", variableId: timeLeftId },
      operator: "<=",
      right: 0
    },
    [
      { type: "playSound", soundId: soundAlarm.soundId },
      { type: "endGame", message: "El reactor ha explotat." }
    ]
  )
  project = addEventWithActions(
    project,
    pilotObject.objectId,
    { type: "Collision", targetObjectId: coreObject.objectId },
    [
      { type: "playSound", soundId: soundWin.soundId },
      { type: "endGame", message: "Has estabilitzat el reactor. Has guanyat!" }
    ]
  )

  return {
    project,
    roomId: room.roomId,
    focusObjectId: pilotObject.objectId
  }
}
