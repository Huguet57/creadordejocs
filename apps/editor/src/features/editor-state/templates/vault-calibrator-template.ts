import {
  addRoomInstance,
  createEmptyProjectV1,
  createRoom,
  quickCreateObject,
  quickCreateSound,
  quickCreateSprite
} from "@creadordejocs/project-format"
import { addEventWithActions, addGlobalVariableWithId, addIfElseBlockToLatestEvent, addNestedIfElseToLatestIfBlock } from "./helpers.js"
import type { TemplateProjectResult } from "./types.js"

export function createVaultCalibratorTemplateProject(): TemplateProjectResult {
  const empty = createEmptyProjectV1("Vault Calibrator")
  const spriteAgent = quickCreateSprite(empty, "Agent")
  const spriteConsole = quickCreateSprite(spriteAgent.project, "Console")
  const spriteDoor = quickCreateSprite(spriteConsole.project, "Door")
  const spriteExit = quickCreateSprite(spriteDoor.project, "Exit")
  const spriteSentinel = quickCreateSprite(spriteExit.project, "Sentinel")
  const soundClick = quickCreateSound(spriteSentinel.project, "Click")
  const soundOpen = quickCreateSound(soundClick.project, "Open")
  const soundError = quickCreateSound(soundOpen.project, "Error")
  const soundAlarm = quickCreateSound(soundError.project, "Alarm")

  const agentObject = quickCreateObject(soundAlarm.project, {
    name: "Agent",
    spriteId: spriteAgent.spriteId,
    x: 90,
    y: 260
  })
  const consoleObject = quickCreateObject(agentObject.project, {
    name: "Console",
    spriteId: spriteConsole.spriteId,
    x: 290,
    y: 150
  })
  const doorObject = quickCreateObject(consoleObject.project, {
    name: "Door",
    spriteId: spriteDoor.spriteId,
    x: 500,
    y: 230
  })
  const exitObject = quickCreateObject(doorObject.project, {
    name: "Exit",
    spriteId: spriteExit.spriteId,
    x: 520,
    y: 50
  })
  const sentinelObject = quickCreateObject(exitObject.project, {
    name: "Sentinel",
    spriteId: spriteSentinel.spriteId,
    x: 420,
    y: 120
  })

  const room = createRoom(sentinelObject.project, "Calibration Lab")
  const withAgent = addRoomInstance(room.project, {
    roomId: room.roomId,
    objectId: agentObject.objectId,
    x: 90,
    y: 260
  }).project
  const withConsole = addRoomInstance(withAgent, {
    roomId: room.roomId,
    objectId: consoleObject.objectId,
    x: 290,
    y: 150
  }).project
  const withDoor = addRoomInstance(withConsole, {
    roomId: room.roomId,
    objectId: doorObject.objectId,
    x: 500,
    y: 230
  }).project
  const withExit = addRoomInstance(withDoor, {
    roomId: room.roomId,
    objectId: exitObject.objectId,
    x: 520,
    y: 50
  }).project
  const withSentinel = addRoomInstance(withExit, {
    roomId: room.roomId,
    objectId: sentinelObject.objectId,
    x: 420,
    y: 120
  }).project

  const withDoorOpen = addGlobalVariableWithId(withSentinel, {
    name: "doorOpen",
    type: "boolean",
    initialValue: false
  })
  const doorOpenId = withDoorOpen.variableId
  const withStage = addGlobalVariableWithId(withDoorOpen.project, {
    name: "lockStage",
    type: "number",
    initialValue: 0
  })
  const lockStageId = withStage.variableId
  const withAlarm = addGlobalVariableWithId(withStage.project, {
    name: "alarm",
    type: "boolean",
    initialValue: false
  })
  const alarmId = withAlarm.variableId

  let project = withAlarm.project
  project = addEventWithActions(project, agentObject.objectId, { type: "MouseMove" }, [])
  project = addIfElseBlockToLatestEvent(
    project,
    agentObject.objectId,
    {
      left: { scope: "global", variableId: alarmId },
      operator: "==",
      right: false
    },
    [{ type: "teleport", mode: "mouse", x: null, y: null }, { type: "clampToRoom" }],
    [{ type: "move", dx: -4, dy: 0 }]
  )
  project = addEventWithActions(project, agentObject.objectId, { type: "MouseDown" }, [])
  project = addIfElseBlockToLatestEvent(
    project,
    agentObject.objectId,
    {
      left: { scope: "global", variableId: "__mouse_y" },
      operator: ">=",
      right: 280
    },
    [{ type: "changeVariable", scope: "global", variableId: alarmId, operator: "set", value: false }],
    []
  )
  project = addEventWithActions(project, agentObject.objectId, { type: "Step" }, [{ type: "clampToRoom" }])
  project = addEventWithActions(project, consoleObject.objectId, { type: "MouseClick" }, [{ type: "playSound", soundId: soundClick.soundId }])
  project = addIfElseBlockToLatestEvent(
    project,
    consoleObject.objectId,
    {
      left: { scope: "global", variableId: lockStageId },
      operator: "==",
      right: 0
    },
    [],
    [{ type: "playSound", soundId: soundError.soundId }]
  )
  project = addNestedIfElseToLatestIfBlock(
    project,
    consoleObject.objectId,
    "then",
    {
      left: { scope: "global", variableId: "__mouse_x" },
      operator: ">=",
      right: 220
    },
    [],
    [{ type: "playSound", soundId: soundError.soundId }]
  )
  project = addNestedIfElseToLatestIfBlock(
    project,
    consoleObject.objectId,
    "then",
    {
      left: { scope: "global", variableId: "__mouse_y" },
      operator: ">=",
      right: 90
    },
    [],
    [{ type: "playSound", soundId: soundError.soundId }]
  )
  project = addNestedIfElseToLatestIfBlock(
    project,
    consoleObject.objectId,
    "then",
    {
      left: { scope: "global", variableId: "__mouse_y" },
      operator: "<=",
      right: 150
    },
    [
      { type: "playSound", soundId: soundClick.soundId },
      {
        type: "changeVariable",
        scope: "global",
        variableId: lockStageId,
        operator: "set",
        value: 1
      },
      { type: "changeScore", delta: 20 }
    ],
    [{ type: "playSound", soundId: soundError.soundId }]
  )
  project = addEventWithActions(project, consoleObject.objectId, { type: "MouseClick" }, [])
  project = addIfElseBlockToLatestEvent(
    project,
    consoleObject.objectId,
    {
      left: { scope: "global", variableId: lockStageId },
      operator: "==",
      right: 1
    },
    [],
    [{ type: "playSound", soundId: soundError.soundId }]
  )
  project = addNestedIfElseToLatestIfBlock(
    project,
    consoleObject.objectId,
    "then",
    {
      left: { scope: "global", variableId: "__mouse_x" },
      operator: ">=",
      right: 360
    },
    [],
    [{ type: "changeVariable", scope: "global", variableId: alarmId, operator: "set", value: true }]
  )
  project = addNestedIfElseToLatestIfBlock(
    project,
    consoleObject.objectId,
    "then",
    {
      left: { scope: "global", variableId: "__mouse_x" },
      operator: "<=",
      right: 500
    },
    [],
    [{ type: "changeVariable", scope: "global", variableId: alarmId, operator: "set", value: true }]
  )
  project = addNestedIfElseToLatestIfBlock(
    project,
    consoleObject.objectId,
    "then",
    {
      left: { scope: "global", variableId: "__mouse_y" },
      operator: ">=",
      right: 170
    },
    [],
    [{ type: "changeVariable", scope: "global", variableId: alarmId, operator: "set", value: true }]
  )
  project = addNestedIfElseToLatestIfBlock(
    project,
    consoleObject.objectId,
    "then",
    {
      left: { scope: "global", variableId: "__mouse_y" },
      operator: "<=",
      right: 240
    },
    [
      { type: "playSound", soundId: soundOpen.soundId },
      { type: "changeVariable", scope: "global", variableId: doorOpenId, operator: "set", value: true },
      { type: "changeVariable", scope: "global", variableId: alarmId, operator: "set", value: false },
      { type: "changeScore", delta: 40 }
    ],
    [{ type: "changeVariable", scope: "global", variableId: alarmId, operator: "set", value: true }]
  )
  project = addEventWithActions(project, sentinelObject.objectId, { type: "Step" }, [])
  project = addIfElseBlockToLatestEvent(
    project,
    sentinelObject.objectId,
    {
      left: { scope: "global", variableId: alarmId },
      operator: "==",
      right: true
    },
    [{ type: "setVelocity", speed: 2.4, direction: 180 }],
    [{ type: "setVelocity", speed: 0.8, direction: 0 }]
  )
  project = addEventWithActions(project, sentinelObject.objectId, { type: "OutsideRoom" }, [{ type: "teleport", mode: "start", x: null, y: null }])
  project = addEventWithActions(project, agentObject.objectId, { type: "Collision", targetObjectId: doorObject.objectId }, [])
  project = addIfElseBlockToLatestEvent(
    project,
    agentObject.objectId,
    {
      left: { scope: "global", variableId: doorOpenId },
      operator: "==",
      right: true
    },
    [{ type: "teleport", mode: "position", x: 500, y: 80 }],
    [{ type: "teleport", mode: "start", x: null, y: null }]
  )
  project = addEventWithActions(project, agentObject.objectId, { type: "Collision", targetObjectId: sentinelObject.objectId }, [])
  project = addIfElseBlockToLatestEvent(
    project,
    agentObject.objectId,
    {
      left: { scope: "global", variableId: alarmId },
      operator: "==",
      right: true
    },
    [
      { type: "playSound", soundId: soundAlarm.soundId },
      { type: "endGame", message: "El Sentinel t'ha detectat." }
    ],
    [{ type: "teleport", mode: "start", x: null, y: null }]
  )
  project = addEventWithActions(project, agentObject.objectId, { type: "Collision", targetObjectId: exitObject.objectId }, [
    { type: "endGame", message: "Has calibrat el pany i sortit del laboratori!" }
  ])

  return {
    project,
    roomId: room.roomId,
    focusObjectId: agentObject.objectId
  }
}
