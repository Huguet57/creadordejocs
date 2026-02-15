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

export function createMineResetTemplateProject(): TemplateProjectResult {
  const empty = createEmptyProjectV1("Mine Reset")
  const spriteRunner = quickCreateSprite(empty, "Runner")
  const spriteChip = quickCreateSprite(spriteRunner.project, "Chip")
  const spriteMine = quickCreateSprite(spriteChip.project, "Mine")
  const spriteExit = quickCreateSprite(spriteMine.project, "Exit")
  const soundPickup = quickCreateSound(spriteExit.project, "Pickup")
  const soundReset = quickCreateSound(soundPickup.project, "Reset")
  const soundWin = quickCreateSound(soundReset.project, "Win")

  const runnerObject = quickCreateObject(soundWin.project, {
    name: "Runner",
    spriteId: spriteRunner.spriteId,
    x: 80,
    y: 260
  })
  const chipObject = quickCreateObject(runnerObject.project, {
    name: "Chip",
    spriteId: spriteChip.spriteId,
    x: 230,
    y: 210
  })
  const mineObject = quickCreateObject(chipObject.project, {
    name: "Mine",
    spriteId: spriteMine.spriteId,
    x: 300,
    y: 200
  })
  const exitObject = quickCreateObject(mineObject.project, {
    name: "Exit",
    spriteId: spriteExit.spriteId,
    x: 520,
    y: 260
  })

  const room = createRoom(exitObject.project, "Mine Field")
  const withRunner = addRoomInstance(room.project, {
    roomId: room.roomId,
    objectId: runnerObject.objectId,
    x: 80,
    y: 260
  }).project
  const withChipA = addRoomInstance(withRunner, {
    roomId: room.roomId,
    objectId: chipObject.objectId,
    x: 210,
    y: 220
  }).project
  const withChipB = addRoomInstance(withChipA, {
    roomId: room.roomId,
    objectId: chipObject.objectId,
    x: 330,
    y: 90
  }).project
  const withMineA = addRoomInstance(withChipB, {
    roomId: room.roomId,
    objectId: mineObject.objectId,
    x: 260,
    y: 250
  }).project
  const withMineB = addRoomInstance(withMineA, {
    roomId: room.roomId,
    objectId: mineObject.objectId,
    x: 320,
    y: 170
  }).project
  const withMineC = addRoomInstance(withMineB, {
    roomId: room.roomId,
    objectId: mineObject.objectId,
    x: 390,
    y: 120
  }).project
  const withExit = addRoomInstance(withMineC, {
    roomId: room.roomId,
    objectId: exitObject.objectId,
    x: 520,
    y: 260
  }).project

  const withCollectedChips = addGlobalVariableWithId(withExit, {
    name: "collectedChips",
    type: "number",
    initialValue: 0
  })
  const collectedChipsId = withCollectedChips.variableId

  let project = withCollectedChips.project
  project = addEventWithActions(project, runnerObject.objectId, { type: "KeyDown", key: "ArrowUp" }, [
    { type: "move", dx: 0, dy: -8 }
  ])
  project = addEventWithActions(project, runnerObject.objectId, { type: "KeyDown", key: "ArrowDown" }, [
    { type: "move", dx: 0, dy: 8 }
  ])
  project = addEventWithActions(project, runnerObject.objectId, { type: "KeyDown", key: "ArrowLeft" }, [
    { type: "move", dx: -8, dy: 0 }
  ])
  project = addEventWithActions(project, runnerObject.objectId, { type: "KeyDown", key: "ArrowRight" }, [
    { type: "move", dx: 8, dy: 0 }
  ])
  project = addEventWithActions(project, runnerObject.objectId, { type: "Step" }, [{ type: "clampToRoom" }])
  project = addEventWithActions(
    project,
    chipObject.objectId,
    { type: "Collision", targetObjectId: runnerObject.objectId },
    [
      { type: "playSound", soundId: soundPickup.soundId },
      {
        type: "changeGlobalVariable",
        variableId: collectedChipsId,
        operator: "add",
        value: 1
      },
      { type: "destroySelf" }
    ]
  )
  project = addEventWithActions(
    project,
    mineObject.objectId,
    { type: "Collision", targetObjectId: runnerObject.objectId },
    [
      { type: "playSound", soundId: soundReset.soundId },
      { type: "restartRoom" }
    ]
  )
  project = addEventWithActions(project, exitObject.objectId, { type: "Collision", targetObjectId: runnerObject.objectId }, [
    { type: "playSound", soundId: soundWin.soundId }
  ])
  project = addIfBlockToLatestEvent(
    project,
    exitObject.objectId,
    {
      left: { scope: "global", variableId: collectedChipsId },
      operator: ">=",
      right: 2
    },
    [{ type: "endGame", message: "Has sortit de la sala de mines!" }]
  )
  project = addIfBlockToLatestEvent(
    project,
    exitObject.objectId,
    {
      left: { scope: "global", variableId: collectedChipsId },
      operator: "<",
      right: 2
    },
    [{ type: "jumpToStart" }]
  )

  return {
    project,
    roomId: room.roomId,
    focusObjectId: runnerObject.objectId
  }
}
