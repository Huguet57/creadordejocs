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
  const soundClick = quickCreateSound(spriteExit.project, "Click")
  const soundOpen = quickCreateSound(soundClick.project, "Open")
  const soundError = quickCreateSound(soundOpen.project, "Error")

  const agentObject = quickCreateObject(soundError.project, {
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

  const room = createRoom(exitObject.project, "Calibration Lab")
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

  const withDoorOpen = addGlobalVariableWithId(withExit, {
    name: "doorOpen",
    type: "boolean",
    initialValue: false
  })
  const doorOpenId = withDoorOpen.variableId

  let project = withDoorOpen.project
  project = addEventWithActions(project, agentObject.objectId, { type: "MouseMove" }, [])
  project = addIfElseBlockToLatestEvent(
    project,
    agentObject.objectId,
    {
      left: { scope: "global", variableId: "__mouse_x" },
      operator: ">",
      right: 280
    },
    [{ type: "move", dx: 5, dy: 0 }],
    [{ type: "move", dx: -5, dy: 0 }]
  )
  project = addEventWithActions(project, agentObject.objectId, { type: "MouseMove" }, [])
  project = addIfElseBlockToLatestEvent(
    project,
    agentObject.objectId,
    {
      left: { scope: "global", variableId: "__mouse_y" },
      operator: ">",
      right: 160
    },
    [{ type: "move", dx: 0, dy: 5 }],
    [{ type: "move", dx: 0, dy: -5 }]
  )
  project = addEventWithActions(project, agentObject.objectId, { type: "Step" }, [{ type: "clampToRoom" }])
  project = addEventWithActions(project, consoleObject.objectId, { type: "MouseClick" }, [{ type: "playSound", soundId: soundClick.soundId }])
  project = addIfElseBlockToLatestEvent(
    project,
    consoleObject.objectId,
    {
      left: { scope: "global", variableId: "__mouse_x" },
      operator: ">=",
      right: 240
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
      operator: "<=",
      right: 340
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
      right: 110
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
      right: 210
    },
    [
      { type: "playSound", soundId: soundOpen.soundId },
      {
        type: "changeVariable",
        scope: "global",
        variableId: doorOpenId,
        operator: "set",
        value: true
      },
      { type: "changeScore", delta: 40 }
    ],
    [{ type: "playSound", soundId: soundError.soundId }]
  )
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
  project = addEventWithActions(project, agentObject.objectId, { type: "Collision", targetObjectId: exitObject.objectId }, [
    { type: "endGame", message: "Has calibrat el pany i sortit del laboratori!" }
  ])

  return {
    project,
    roomId: room.roomId,
    focusObjectId: agentObject.objectId
  }
}
