import { describe, expect, it } from "vitest"
import {
  addRoomInstance,
  createEmptyProjectV1,
  createRoom,
  moveRoomInstance,
  quickCreateObject,
  quickCreateSound,
  quickCreateSprite,
  updateObjectProperties
} from "../src/index.js"

describe("editor model helpers", () => {
  it("quick creates sprite, sound and object with defaults", () => {
    const initial = createEmptyProjectV1("Editor model")
    const spriteResult = quickCreateSprite(initial, "Hero")
    const soundResult = quickCreateSound(spriteResult.project, "Jump")
    const objectResult = quickCreateObject(soundResult.project, { name: "Player", spriteId: spriteResult.spriteId })

    expect(objectResult.project.resources.sprites).toHaveLength(1)
    expect(objectResult.project.resources.sounds).toHaveLength(1)
    expect(objectResult.project.objects[0]?.name).toBe("Player")
    expect(objectResult.project.objects[0]?.spriteId).toBe(spriteResult.spriteId)
  })

  it("creates a room and moves an instance inside it", () => {
    const initial = createEmptyProjectV1("Room flow")
    const objectResult = quickCreateObject(initial, { name: "Enemy", x: 10, y: 10, speed: 2, direction: 90 })
    const roomResult = createRoom(objectResult.project, "Main room")
    const instanceResult = addRoomInstance(roomResult.project, {
      roomId: roomResult.roomId,
      objectId: objectResult.objectId,
      x: 24,
      y: 48
    })
    const moved = moveRoomInstance(instanceResult.project, {
      roomId: roomResult.roomId,
      instanceId: instanceResult.instanceId,
      x: 40,
      y: 88
    })
    const updated = updateObjectProperties(moved, {
      objectId: objectResult.objectId,
      x: 5,
      y: 6,
      speed: 7,
      direction: 180
    })

    expect(updated.rooms[0]?.instances[0]?.x).toBe(40)
    expect(updated.rooms[0]?.instances[0]?.y).toBe(88)
    expect(updated.objects[0]?.x).toBe(5)
    expect(updated.objects[0]?.speed).toBe(7)
    expect(updated.objects[0]?.direction).toBe(180)
  })
})
