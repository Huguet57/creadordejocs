import {
  addRoomInstance,
  createEmptyProjectV1,
  createRoom,
  quickCreateObject,
  quickCreateSprite
} from "@creadordejocs/project-format"
import { addEventWithActions, addGlobalVariableWithId, addIfElseBlockToLatestEvent } from "./helpers.js"
import type { TemplateProjectResult } from "./types.js"

export function createLaneCrosserTemplateProject(): TemplateProjectResult {
  const empty = createEmptyProjectV1("Lane Crosser")
  const spritePlayer = quickCreateSprite(empty, "Runner")
  const spriteCar = quickCreateSprite(spritePlayer.project, "Car")
  const spriteGoal = quickCreateSprite(spriteCar.project, "Goal")

  const playerObject = quickCreateObject(spriteGoal.project, {
    name: "Runner",
    spriteId: spritePlayer.spriteId,
    x: 280,
    y: 285
  })
  const carRightObject = quickCreateObject(playerObject.project, {
    name: "CarRight",
    spriteId: spriteCar.spriteId,
    x: 40,
    y: 200
  })
  const carLeftObject = quickCreateObject(carRightObject.project, {
    name: "CarLeft",
    spriteId: spriteCar.spriteId,
    x: 520,
    y: 130
  })
  const goalObject = quickCreateObject(carLeftObject.project, {
    name: "Goal",
    spriteId: spriteGoal.spriteId,
    x: 270,
    y: 16
  })

  const room = createRoom(goalObject.project, "Lane Crosser")
  const withPlayer = addRoomInstance(room.project, {
    roomId: room.roomId,
    objectId: playerObject.objectId,
    x: 280,
    y: 285
  }).project
  const withCarA = addRoomInstance(withPlayer, {
    roomId: room.roomId,
    objectId: carRightObject.objectId,
    x: 40,
    y: 200
  }).project
  const withCarB = addRoomInstance(withCarA, {
    roomId: room.roomId,
    objectId: carRightObject.objectId,
    x: 240,
    y: 240
  }).project
  const withCarC = addRoomInstance(withCarB, {
    roomId: room.roomId,
    objectId: carLeftObject.objectId,
    x: 520,
    y: 130
  }).project
  const withCarD = addRoomInstance(withCarC, {
    roomId: room.roomId,
    objectId: carLeftObject.objectId,
    x: 360,
    y: 90
  }).project
  const withGoal = addRoomInstance(withCarD, {
    roomId: room.roomId,
    objectId: goalObject.objectId,
    x: 264,
    y: 16
  }).project

  const withLives = addGlobalVariableWithId(withGoal, {
    name: "lives",
    type: "number",
    initialValue: 3
  })
  const livesVariableId = withLives.variableId
  let project = withLives.project

  function addCarCollisionFlow(currentProject: typeof project, carObjectId: string): typeof project {
    const withCollision = addEventWithActions(
      currentProject,
      playerObject.objectId,
      { type: "Collision", targetObjectId: carObjectId },
      [
        {
          type: "changeVariable",
          scope: "global",
          variableId: livesVariableId,
          operator: "subtract",
          value: 1
        }
      ]
    )
    return addIfElseBlockToLatestEvent(
      withCollision,
      playerObject.objectId,
      {
        left: { scope: "global", variableId: livesVariableId },
        operator: ">",
        right: 0
      },
      [{ type: "teleport", mode: "start", x: null, y: null }],
      [{ type: "endGame", message: "Has perdut totes les vides" }]
    )
  }

  project = addEventWithActions(project, playerObject.objectId, { type: "Keyboard", keyboardMode: "down", key: "ArrowUp" }, [
    { type: "move", dx: 0, dy: -24 }
  ])
  project = addEventWithActions(project, playerObject.objectId, { type: "Keyboard", keyboardMode: "down", key: "ArrowDown" }, [
    { type: "move", dx: 0, dy: 24 }
  ])
  project = addEventWithActions(project, playerObject.objectId, { type: "Keyboard", keyboardMode: "down", key: "ArrowLeft" }, [
    { type: "move", dx: -18, dy: 0 }
  ])
  project = addEventWithActions(project, playerObject.objectId, { type: "Keyboard", keyboardMode: "down", key: "ArrowRight" }, [
    { type: "move", dx: 18, dy: 0 }
  ])
  project = addEventWithActions(project, playerObject.objectId, { type: "Step" }, [{ type: "clampToRoom" }])
  project = addEventWithActions(project, carRightObject.objectId, { type: "Step" }, [
    { type: "setVelocity", speed: 2.2, direction: 0 }
  ])
  project = addEventWithActions(project, carLeftObject.objectId, { type: "Step" }, [
    { type: "setVelocity", speed: 2.4, direction: 180 }
  ])
  project = addCarCollisionFlow(project, carRightObject.objectId)
  project = addCarCollisionFlow(project, carLeftObject.objectId)
  project = addEventWithActions(project, goalObject.objectId, { type: "OnDestroy" }, [
    { type: "changeScore", delta: 100 },
    { type: "endGame", message: "Meta assolida. Has guanyat!" }
  ])
  project = addEventWithActions(
    project,
    playerObject.objectId,
    { type: "Collision", targetObjectId: goalObject.objectId },
    [{ type: "destroyOther" }]
  )

  return {
    project,
    roomId: room.roomId,
    focusObjectId: playerObject.objectId
  }
}
