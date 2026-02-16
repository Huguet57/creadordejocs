import { describe, expect, it } from "vitest"
import { addRoomInstance, createEmptyProjectV1, createRoom, quickCreateObject } from "@creadordejocs/project-format"
import { getPositionCountsByCoordinate, getPositionKey, wouldOverlapSolid } from "./room-placement-utils.js"

describe("room placement utilities", () => {
  it("builds a coordinate key", () => {
    expect(getPositionKey(12, 34)).toBe("12,34")
  })

  it("counts instances that share exact same coordinates", () => {
    const counts = getPositionCountsByCoordinate([
      { x: 10, y: 20 },
      { x: 10, y: 20 },
      { x: 8, y: 20 }
    ])

    expect(counts.get("10,20")).toBe(2)
    expect(counts.get("8,20")).toBe(1)
    expect(counts.get("9,20")).toBeUndefined()
  })

  it("allows overlap when both objects are non-solid", () => {
    const initial = createEmptyProjectV1("Test")
    const nonSolidA = quickCreateObject(initial, { name: "A", width: 32, height: 32, solid: false })
    const nonSolidB = quickCreateObject(nonSolidA.project, { name: "B", width: 32, height: 32, solid: false })
    const roomResult = createRoom(nonSolidB.project, "Room")
    const withInstance = addRoomInstance(roomResult.project, {
      roomId: roomResult.roomId,
      objectId: nonSolidA.objectId,
      x: 0,
      y: 0
    }).project
    const room = withInstance.rooms[0]
    if (!room) throw new Error("Expected room")

    expect(
      wouldOverlapSolid({
        project: withInstance,
        roomInstances: room.instances,
        objectId: nonSolidB.objectId,
        x: 16,
        y: 16
      })
    ).toBe(false)
  })

  it("blocks overlap when at least one object is solid", () => {
    const initial = createEmptyProjectV1("Test")
    const solidObject = quickCreateObject(initial, { name: "Wall", width: 32, height: 32, solid: true })
    const nonSolid = quickCreateObject(solidObject.project, { name: "Coin", width: 32, height: 32, solid: false })
    const roomResult = createRoom(nonSolid.project, "Room")
    const withInstance = addRoomInstance(roomResult.project, {
      roomId: roomResult.roomId,
      objectId: solidObject.objectId,
      x: 0,
      y: 0
    }).project
    const room = withInstance.rooms[0]
    if (!room) throw new Error("Expected room")

    expect(
      wouldOverlapSolid({
        project: withInstance,
        roomInstances: room.instances,
        objectId: nonSolid.objectId,
        x: 16,
        y: 16
      })
    ).toBe(true)
  })

  it("ignores the excluded instance id during overlap checks", () => {
    const initial = createEmptyProjectV1("Test")
    const solidObject = quickCreateObject(initial, { name: "Wall", width: 32, height: 32, solid: true })
    const roomResult = createRoom(solidObject.project, "Room")
    const withInstance = addRoomInstance(roomResult.project, {
      roomId: roomResult.roomId,
      objectId: solidObject.objectId,
      x: 0,
      y: 0
    })
    const room = withInstance.project.rooms[0]
    if (!room) throw new Error("Expected room")

    expect(
      wouldOverlapSolid({
        project: withInstance.project,
        roomInstances: room.instances,
        objectId: solidObject.objectId,
        x: 0,
        y: 0,
        excludeInstanceId: withInstance.instanceId
      })
    ).toBe(false)
  })
})
