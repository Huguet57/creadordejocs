import {
  addRoomInstance,
  createEmptyProjectV1,
  createRoom,
  quickCreateObject,
  quickCreateSound,
  quickCreateSprite
} from "@creadordejocs/project-format"
import { addEventWithActions, addGlobalVariableWithId, addIfElseBlockToLatestEvent } from "./helpers.js"
import type { TemplateProjectResult } from "./types.js"

export function createCursorCourierTemplateProject(): TemplateProjectResult {
  const empty = createEmptyProjectV1("Cursor Courier")
  const spriteCourier = quickCreateSprite(empty, "Courier")
  const spritePacket = quickCreateSprite(spriteCourier.project, "Packet")
  const spriteHazard = quickCreateSprite(spritePacket.project, "Hazard")
  const spriteNode = quickCreateSprite(spriteHazard.project, "Node")
  const soundPickup = quickCreateSound(spriteNode.project, "Pickup")
  const soundBoost = quickCreateSound(soundPickup.project, "Boost")
  const soundHit = quickCreateSound(soundBoost.project, "Hit")
  const soundRoute = quickCreateSound(soundHit.project, "Route")

  const courierObject = quickCreateObject(soundRoute.project, {
    name: "Courier",
    spriteId: spriteCourier.spriteId,
    x: 80,
    y: 260
  })
  const packetObject = quickCreateObject(courierObject.project, {
    name: "Packet",
    spriteId: spritePacket.spriteId,
    x: 220,
    y: 140
  })
  const hazardObject = quickCreateObject(packetObject.project, {
    name: "Hazard",
    spriteId: spriteHazard.spriteId,
    x: 440,
    y: 220
  })
  const nodeObject = quickCreateObject(hazardObject.project, {
    name: "Node",
    spriteId: spriteNode.spriteId,
    x: 520,
    y: 50
  })

  const room = createRoom(nodeObject.project, "Data Hall")
  const withCourier = addRoomInstance(room.project, {
    roomId: room.roomId,
    objectId: courierObject.objectId,
    x: 80,
    y: 260
  }).project
  const withPacketA = addRoomInstance(withCourier, {
    roomId: room.roomId,
    objectId: packetObject.objectId,
    x: 220,
    y: 140
  }).project
  const withPacketB = addRoomInstance(withPacketA, {
    roomId: room.roomId,
    objectId: packetObject.objectId,
    x: 320,
    y: 70
  }).project
  const withPacketC = addRoomInstance(withPacketB, {
    roomId: room.roomId,
    objectId: packetObject.objectId,
    x: 470,
    y: 120
  }).project
  const withHazardA = addRoomInstance(withPacketC, {
    roomId: room.roomId,
    objectId: hazardObject.objectId,
    x: 430,
    y: 240
  }).project
  const withHazardB = addRoomInstance(withHazardA, {
    roomId: room.roomId,
    objectId: hazardObject.objectId,
    x: 250,
    y: 200
  }).project
  const withNode = addRoomInstance(withHazardB, {
    roomId: room.roomId,
    objectId: nodeObject.objectId,
    x: 520,
    y: 50
  }).project

  const withPacketsRemaining = addGlobalVariableWithId(withNode, {
    name: "packetsRemaining",
    type: "number",
    initialValue: 3
  })
  const packetsRemainingId = withPacketsRemaining.variableId
  const withBoost = addGlobalVariableWithId(withPacketsRemaining.project, {
    name: "boost",
    type: "number",
    initialValue: 3
  })
  const boostId = withBoost.variableId

  let project = withBoost.project
  project = addEventWithActions(project, courierObject.objectId, { type: "MouseMove" }, [
    { type: "teleport", mode: "mouse", x: null, y: null },
    { type: "clampToRoom" }
  ])
  project = addEventWithActions(project, courierObject.objectId, { type: "MouseDown" }, [])
  project = addIfElseBlockToLatestEvent(
    project,
    courierObject.objectId,
    {
      left: { scope: "global", variableId: boostId },
      operator: ">",
      right: 0
    },
    [
      { type: "playSound", soundId: soundBoost.soundId },
      { type: "teleport", mode: "mouse", x: null, y: null },
      { type: "changeVariable", scope: "global", variableId: boostId, operator: "subtract", value: 1 }
    ],
    [{ type: "message", text: "Sense boost. Espera recarrega.", durationMs: 800 }]
  )
  project = addEventWithActions(project, courierObject.objectId, { type: "MouseClick" }, [])
  project = addIfElseBlockToLatestEvent(
    project,
    courierObject.objectId,
    {
      left: { scope: "global", variableId: "__mouse_x" },
      operator: ">=",
      right: 500
    },
    [{ type: "playSound", soundId: soundRoute.soundId }, { type: "teleport", mode: "position", x: 520, y: 50 }],
    []
  )
  project = addEventWithActions(project, courierObject.objectId, { type: "Timer", intervalMs: 700 }, [])
  project = addIfElseBlockToLatestEvent(
    project,
    courierObject.objectId,
    {
      left: { scope: "global", variableId: boostId },
      operator: "<",
      right: 3
    },
    [{ type: "changeVariable", scope: "global", variableId: boostId, operator: "add", value: 1 }],
    []
  )
  project = addEventWithActions(project, courierObject.objectId, { type: "Step" }, [{ type: "clampToRoom" }])
  project = addEventWithActions(project, hazardObject.objectId, { type: "Step" }, [{ type: "setVelocity", speed: 2.2, direction: 0 }])
  project = addEventWithActions(project, hazardObject.objectId, { type: "OutsideRoom" }, [{ type: "teleport", mode: "start", x: null, y: null }])
  project = addEventWithActions(project, courierObject.objectId, { type: "Collision", targetObjectId: packetObject.objectId }, [
    { type: "playSound", soundId: soundPickup.soundId },
    { type: "changeScore", delta: 35 },
    {
      type: "changeVariable",
      scope: "global",
      variableId: packetsRemainingId,
      operator: "subtract",
      value: 1
    },
    { type: "destroyOther" }
  ])
  project = addIfElseBlockToLatestEvent(
    project,
    courierObject.objectId,
    {
      left: { scope: "global", variableId: packetsRemainingId },
      operator: "<=",
      right: 0
    },
    [{ type: "message", text: "Paquets complets! Ves al node final.", durationMs: 1200 }],
    []
  )
  project = addEventWithActions(project, courierObject.objectId, { type: "Collision", targetObjectId: nodeObject.objectId }, [])
  project = addIfElseBlockToLatestEvent(
    project,
    courierObject.objectId,
    {
      left: { scope: "global", variableId: packetsRemainingId },
      operator: "<=",
      right: 0
    },
    [{ type: "endGame", message: "Entrega completada. Xarxa restablerta!" }],
    [{ type: "teleport", mode: "start", x: null, y: null }]
  )
  project = addEventWithActions(project, courierObject.objectId, { type: "Collision", targetObjectId: hazardObject.objectId }, [
    { type: "playSound", soundId: soundHit.soundId },
    { type: "endGame", message: "Has xocat amb una zona de soroll." }
  ])

  return {
    project,
    roomId: room.roomId,
    focusObjectId: courierObject.objectId
  }
}
