import { describe, expect, it } from "vitest"
import { mapPointerToWorldCoordinates, isInstanceVisibleInWindow, toScreenCoordinates, hitTestInstances } from "./run-window-utils.js"

describe("run window utils", () => {
  it("maps pointer coordinates to world coordinates using window offset and room clamp", () => {
    const mapped = mapPointerToWorldCoordinates({
      clientX: 120,
      clientY: 90,
      rectLeft: 20,
      rectTop: 10,
      windowX: 500,
      windowY: 300,
      roomWidth: 2000,
      roomHeight: 1200
    })

    expect(mapped).toEqual({ x: 600, y: 380 })
  })

  it("clamps mapped pointer coordinates to room edges", () => {
    const mapped = mapPointerToWorldCoordinates({
      clientX: 2000,
      clientY: 2000,
      rectLeft: 0,
      rectTop: 0,
      windowX: 1400,
      windowY: 900,
      roomWidth: 1600,
      roomHeight: 1000
    })

    expect(mapped).toEqual({ x: 1600, y: 1000 })
  })

  it("culls instances outside the current window", () => {
    expect(
      isInstanceVisibleInWindow({
        instanceX: 1000,
        instanceY: 200,
        instanceWidth: 32,
        instanceHeight: 32,
        windowX: 0,
        windowY: 0
      })
    ).toBe(false)

    expect(
      isInstanceVisibleInWindow({
        instanceX: 740,
        instanceY: 490,
        instanceWidth: 32,
        instanceHeight: 32,
        windowX: 0,
        windowY: 0
      })
    ).toBe(true)
  })

  it("converts world coordinates to screen coordinates", () => {
    expect(toScreenCoordinates(900, 700, 400, 250)).toEqual({ x: 500, y: 450 })
  })
})

describe("hitTestInstances", () => {
  const objects = [
    { id: "obj-a", width: 32, height: 32 },
    { id: "obj-b", width: 64, height: 64 }
  ]

  it("returns the instance id when clicking inside its bounds", () => {
    const instances = [{ id: "inst-1", objectId: "obj-a", x: 100, y: 100 }]
    expect(hitTestInstances({ worldX: 110, worldY: 110, instances, objects })).toBe("inst-1")
  })

  it("returns null when clicking empty space", () => {
    const instances = [{ id: "inst-1", objectId: "obj-a", x: 100, y: 100 }]
    expect(hitTestInstances({ worldX: 10, worldY: 10, instances, objects })).toBeNull()
  })

  it("returns the topmost (last) instance when overlapping", () => {
    const instances = [
      { id: "inst-bottom", objectId: "obj-a", x: 100, y: 100 },
      { id: "inst-top", objectId: "obj-a", x: 110, y: 110 }
    ]
    expect(hitTestInstances({ worldX: 115, worldY: 115, instances, objects })).toBe("inst-top")
  })

  it("skips invisible instances", () => {
    const invisibleObjects = [{ id: "obj-inv", width: 32, height: 32, visible: false }]
    const instances = [{ id: "inst-1", objectId: "obj-inv", x: 100, y: 100 }]
    expect(hitTestInstances({ worldX: 110, worldY: 110, instances, objects: invisibleObjects })).toBeNull()
  })

  it("uses default 32x32 size when width/height are undefined", () => {
    const minimalObjects = [{ id: "obj-min" }]
    const instances = [{ id: "inst-1", objectId: "obj-min", x: 50, y: 50 }]
    expect(hitTestInstances({ worldX: 60, worldY: 60, instances, objects: minimalObjects })).toBe("inst-1")
    expect(hitTestInstances({ worldX: 83, worldY: 60, instances, objects: minimalObjects })).toBeNull()
  })

  it("does not match when clicking exactly at the far edge (exclusive)", () => {
    const instances = [{ id: "inst-1", objectId: "obj-a", x: 100, y: 100 }]
    expect(hitTestInstances({ worldX: 132, worldY: 110, instances, objects })).toBeNull()
    expect(hitTestInstances({ worldX: 110, worldY: 132, instances, objects })).toBeNull()
  })
})
