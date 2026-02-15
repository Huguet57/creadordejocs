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

export function createSwitchVaultTemplateProject(): TemplateProjectResult {
  const empty = createEmptyProjectV1("Switch Vault")
  const spriteAgent = quickCreateSprite(empty, "Agent")
  const spriteSwitch = quickCreateSprite(spriteAgent.project, "Switch")
  const spriteLift = quickCreateSprite(spriteSwitch.project, "Lift")
  const spriteGuard = quickCreateSprite(spriteLift.project, "Guard")
  const spriteVaultGate = quickCreateSprite(spriteGuard.project, "VaultGate")
  const soundSwitch = quickCreateSound(spriteVaultGate.project, "Switch")
  const soundLift = quickCreateSound(soundSwitch.project, "Lift")
  const soundGuard = quickCreateSound(soundLift.project, "Guard")
  const soundWin = quickCreateSound(soundGuard.project, "Win")

  const agentObject = quickCreateObject(soundWin.project, {
    name: "Agent",
    spriteId: spriteAgent.spriteId,
    x: 80,
    y: 260
  })
  const switchObject = quickCreateObject(agentObject.project, {
    name: "Switch",
    spriteId: spriteSwitch.spriteId,
    x: 320,
    y: 150
  })
  const liftObject = quickCreateObject(switchObject.project, {
    name: "Lift",
    spriteId: spriteLift.spriteId,
    x: 520,
    y: 260
  })
  const guardObject = quickCreateObject(liftObject.project, {
    name: "Guard",
    spriteId: spriteGuard.spriteId,
    x: 280,
    y: 130
  })
  const vaultGateObject = quickCreateObject(guardObject.project, {
    name: "VaultGate",
    spriteId: spriteVaultGate.spriteId,
    x: 520,
    y: 60
  })

  const controlRoom = createRoom(vaultGateObject.project, "Control Room")
  const vaultRoom = createRoom(controlRoom.project, "Vault")

  const withAgentControl = addRoomInstance(vaultRoom.project, {
    roomId: controlRoom.roomId,
    objectId: agentObject.objectId,
    x: 80,
    y: 260
  }).project
  const withSwitch = addRoomInstance(withAgentControl, {
    roomId: controlRoom.roomId,
    objectId: switchObject.objectId,
    x: 320,
    y: 150
  }).project
  const withLiftControl = addRoomInstance(withSwitch, {
    roomId: controlRoom.roomId,
    objectId: liftObject.objectId,
    x: 520,
    y: 260
  }).project
  const withAgentVault = addRoomInstance(withLiftControl, {
    roomId: vaultRoom.roomId,
    objectId: agentObject.objectId,
    x: 80,
    y: 260
  }).project
  const withLiftVault = addRoomInstance(withAgentVault, {
    roomId: vaultRoom.roomId,
    objectId: liftObject.objectId,
    x: 180,
    y: 260
  }).project
  const withGuardA = addRoomInstance(withLiftVault, {
    roomId: vaultRoom.roomId,
    objectId: guardObject.objectId,
    x: 260,
    y: 180
  }).project
  const withGuardB = addRoomInstance(withGuardA, {
    roomId: vaultRoom.roomId,
    objectId: guardObject.objectId,
    x: 360,
    y: 90
  }).project
  const withVaultGate = addRoomInstance(withGuardB, {
    roomId: vaultRoom.roomId,
    objectId: vaultGateObject.objectId,
    x: 520,
    y: 60
  }).project

  const withVaultOpen = addGlobalVariableWithId(withVaultGate, {
    name: "vaultOpen",
    type: "boolean",
    initialValue: false
  })
  const vaultOpenId = withVaultOpen.variableId

  let project = withVaultOpen.project
  project = addEventWithActions(project, agentObject.objectId, { type: "Keyboard", keyboardMode: "down", key: "ArrowUp" }, [
    { type: "move", dx: 0, dy: -8 }
  ])
  project = addEventWithActions(project, agentObject.objectId, { type: "Keyboard", keyboardMode: "down", key: "ArrowDown" }, [
    { type: "move", dx: 0, dy: 8 }
  ])
  project = addEventWithActions(project, agentObject.objectId, { type: "Keyboard", keyboardMode: "down", key: "ArrowLeft" }, [
    { type: "move", dx: -8, dy: 0 }
  ])
  project = addEventWithActions(project, agentObject.objectId, { type: "Keyboard", keyboardMode: "down", key: "ArrowRight" }, [
    { type: "move", dx: 8, dy: 0 }
  ])
  project = addEventWithActions(project, agentObject.objectId, { type: "Step" }, [{ type: "clampToRoom" }])
  project = addEventWithActions(
    project,
    switchObject.objectId,
    { type: "Collision", targetObjectId: agentObject.objectId },
    [
      { type: "playSound", soundId: soundSwitch.soundId },
      {
        type: "changeVariable",
        scope: "global",
        variableId: vaultOpenId,
        operator: "set",
        value: true
      },
      { type: "changeScore", delta: 25 },
      { type: "destroySelf" }
    ]
  )
  project = addEventWithActions(project, agentObject.objectId, { type: "Collision", targetObjectId: liftObject.objectId }, [])
  project = addIfBlockToLatestEvent(
    project,
    agentObject.objectId,
    {
      left: { scope: "global", variableId: vaultOpenId },
      operator: "==",
      right: true
    },
    [
      { type: "playSound", soundId: soundLift.soundId },
      { type: "teleport", mode: "start", x: null, y: null },
      { type: "goToRoom", roomId: vaultRoom.roomId }
    ]
  )
  project = addIfBlockToLatestEvent(
    project,
    agentObject.objectId,
    {
      left: { scope: "global", variableId: vaultOpenId },
      operator: "==",
      right: false
    },
    [{ type: "teleport", mode: "start", x: null, y: null }]
  )
  project = addEventWithActions(project, guardObject.objectId, { type: "Step" }, [
    { type: "setVelocity", speed: 2.2, direction: 180 }
  ])
  project = addEventWithActions(
    project,
    agentObject.objectId,
    { type: "Collision", targetObjectId: guardObject.objectId },
    [
      { type: "playSound", soundId: soundGuard.soundId },
      { type: "teleport", mode: "start", x: null, y: null }
    ]
  )
  project = addEventWithActions(
    project,
    vaultGateObject.objectId,
    { type: "Collision", targetObjectId: agentObject.objectId },
    []
  )
  project = addIfBlockToLatestEvent(
    project,
    vaultGateObject.objectId,
    {
      left: { scope: "global", variableId: vaultOpenId },
      operator: "==",
      right: true
    },
    [
      { type: "playSound", soundId: soundWin.soundId },
      { type: "endGame", message: "Has obert la cambra i recuperat el tresor!" }
    ]
  )
  project = addIfBlockToLatestEvent(
    project,
    vaultGateObject.objectId,
    {
      left: { scope: "global", variableId: vaultOpenId },
      operator: "==",
      right: false
    },
    [{ type: "goToRoom", roomId: controlRoom.roomId }]
  )

  return {
    project,
    roomId: controlRoom.roomId,
    focusObjectId: agentObject.objectId
  }
}
