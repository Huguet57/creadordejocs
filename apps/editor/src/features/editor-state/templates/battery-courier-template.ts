import {
  addRoomInstance,
  createEmptyProjectV1,
  createRoom,
  quickCreateObject,
  quickCreateSound,
  quickCreateSprite
} from "@creadordejocs/project-format"
import {
  addEventWithActions,
  addGlobalVariableWithId,
  addIfBlockToLatestEvent,
  addObjectVariableWithId
} from "./helpers.js"
import type { TemplateProjectResult } from "./types.js"

export function createBatteryCourierTemplateProject(): TemplateProjectResult {
  const empty = createEmptyProjectV1("Battery Courier")
  const spriteCourier = quickCreateSprite(empty, "Courier")
  const spriteBattery = quickCreateSprite(spriteCourier.project, "Battery")
  const spriteReactor = quickCreateSprite(spriteBattery.project, "Reactor")
  const spriteHazard = quickCreateSprite(spriteReactor.project, "Hazard")
  const soundPickup = quickCreateSound(spriteHazard.project, "Pickup")
  const soundTransfer = quickCreateSound(soundPickup.project, "Transfer")
  const soundHit = quickCreateSound(soundTransfer.project, "Hit")

  const courierObject = quickCreateObject(soundHit.project, {
    name: "Courier",
    spriteId: spriteCourier.spriteId,
    x: 80,
    y: 260
  })
  const batteryObject = quickCreateObject(courierObject.project, {
    name: "Battery",
    spriteId: spriteBattery.spriteId,
    x: 200,
    y: 220
  })
  const reactorObject = quickCreateObject(batteryObject.project, {
    name: "Reactor",
    spriteId: spriteReactor.spriteId,
    x: 510,
    y: 260
  })
  const hazardObject = quickCreateObject(reactorObject.project, {
    name: "Hazard",
    spriteId: spriteHazard.spriteId,
    x: 320,
    y: 260
  })

  const room = createRoom(hazardObject.project, "Battery Bay")
  const withCourier = addRoomInstance(room.project, {
    roomId: room.roomId,
    objectId: courierObject.objectId,
    x: 80,
    y: 260
  }).project
  const withBatteryA = addRoomInstance(withCourier, {
    roomId: room.roomId,
    objectId: batteryObject.objectId,
    x: 180,
    y: 210
  }).project
  const withBatteryB = addRoomInstance(withBatteryA, {
    roomId: room.roomId,
    objectId: batteryObject.objectId,
    x: 250,
    y: 120
  }).project
  const withBatteryC = addRoomInstance(withBatteryB, {
    roomId: room.roomId,
    objectId: batteryObject.objectId,
    x: 380,
    y: 80
  }).project
  const withReactor = addRoomInstance(withBatteryC, {
    roomId: room.roomId,
    objectId: reactorObject.objectId,
    x: 510,
    y: 260
  }).project
  const withHazardA = addRoomInstance(withReactor, {
    roomId: room.roomId,
    objectId: hazardObject.objectId,
    x: 320,
    y: 260
  }).project
  const withHazardB = addRoomInstance(withHazardA, {
    roomId: room.roomId,
    objectId: hazardObject.objectId,
    x: 410,
    y: 180
  }).project

  const withDelivered = addGlobalVariableWithId(withHazardB, {
    name: "delivered",
    type: "number",
    initialValue: 0
  })
  const deliveredId = withDelivered.variableId
  const withCarried = addObjectVariableWithId(withDelivered.project, {
    objectId: courierObject.objectId,
    name: "carried",
    type: "number",
    initialValue: 0
  })
  const carriedId = withCarried.variableId

  let project = withCarried.project
  project = addEventWithActions(project, courierObject.objectId, { type: "KeyDown", key: "ArrowUp" }, [
    { type: "move", dx: 0, dy: -8 }
  ])
  project = addEventWithActions(project, courierObject.objectId, { type: "KeyDown", key: "ArrowDown" }, [
    { type: "move", dx: 0, dy: 8 }
  ])
  project = addEventWithActions(project, courierObject.objectId, { type: "KeyDown", key: "ArrowLeft" }, [
    { type: "move", dx: -8, dy: 0 }
  ])
  project = addEventWithActions(project, courierObject.objectId, { type: "KeyDown", key: "ArrowRight" }, [
    { type: "move", dx: 8, dy: 0 }
  ])
  project = addEventWithActions(project, courierObject.objectId, { type: "Step" }, [{ type: "clampToRoom" }])
  project = addEventWithActions(
    project,
    courierObject.objectId,
    { type: "Collision", targetObjectId: batteryObject.objectId },
    [
      { type: "playSound", soundId: soundPickup.soundId },
      {
        type: "changeObjectVariable",
        variableId: carriedId,
        operator: "add",
        target: "self",
        targetInstanceId: null,
        value: 1
      },
      { type: "destroyOther" }
    ]
  )
  project = addEventWithActions(
    project,
    courierObject.objectId,
    { type: "Collision", targetObjectId: reactorObject.objectId },
    [
      { type: "playSound", soundId: soundTransfer.soundId },
      {
        type: "copyVariable",
        direction: "objectToGlobal",
        globalVariableId: deliveredId,
        objectVariableId: carriedId,
        instanceTarget: "self",
        instanceTargetId: null
      }
    ]
  )
  project = addIfBlockToLatestEvent(
    project,
    courierObject.objectId,
    {
      left: { scope: "global", variableId: deliveredId },
      operator: ">=",
      right: 3
    },
    [{ type: "endGame", message: "Has recarregat el reactor. Missio completada!" }]
  )
  project = addIfBlockToLatestEvent(
    project,
    courierObject.objectId,
    {
      left: { scope: "global", variableId: deliveredId },
      operator: "<",
      right: 3
    },
    [{ type: "jumpToStart" }]
  )
  project = addEventWithActions(
    project,
    courierObject.objectId,
    { type: "Collision", targetObjectId: hazardObject.objectId },
    [
      { type: "playSound", soundId: soundHit.soundId },
      { type: "endGame", message: "Has tocat una zona electrificada." }
    ]
  )

  return {
    project,
    roomId: room.roomId,
    focusObjectId: courierObject.objectId
  }
}
