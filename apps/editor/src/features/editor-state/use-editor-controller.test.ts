import { describe, expect, it } from "vitest"
import {
  getRuntimeKeyFromKeyboardEvent,
  isSpriteCompatibleWithObjectSize,
  resolveInitialSection,
  resolveResetState,
  shouldResetWhenSwitchingSection
} from "./use-editor-controller.js"
import { createEmptyProjectV1, createRoom, quickCreateSprite, quickCreateObject } from "@creadordejocs/project-format"

describe("getRuntimeKeyFromKeyboardEvent", () => {
  it("uses KeyboardEvent.code for Space instead of KeyboardEvent.key", () => {
    const runtimeKey = getRuntimeKeyFromKeyboardEvent({
      key: " ",
      code: "Space"
    })

    expect(runtimeKey).toBe("Space")
  })

  it("keeps Arrow keys unchanged", () => {
    const runtimeKey = getRuntimeKeyFromKeyboardEvent({
      key: "ArrowLeft",
      code: "ArrowLeft"
    })

    expect(runtimeKey).toBe("ArrowLeft")
  })
})

describe("resolveResetState", () => {
  it("clears snapshot after reset so a second reset does not undo fresh edits", () => {
    const baseProject = createEmptyProjectV1("base")
    const runSnapshotProject = createEmptyProjectV1("snapshot-before-run")
    const firstReset = resolveResetState(baseProject, runSnapshotProject, "room-current")

    expect(firstReset.project.metadata.name).toBe("snapshot-before-run")
    expect(firstReset.runSnapshot).toBeNull()

    const editedAfterReset = createEmptyProjectV1("edited-after-reset")
    const secondReset = resolveResetState(editedAfterReset, firstReset.runSnapshot, "room-current")

    expect(secondReset.project.metadata.name).toBe("edited-after-reset")
    expect(secondReset.runSnapshot).toBeNull()
  })

  it("resets activeRoomId to the first room of the restored project", () => {
    const base = createEmptyProjectV1("base")
    const withRoom1 = createRoom(base, "Room 1")
    const withRoom2 = createRoom(withRoom1.project, "Room 2")
    const snapshotProject = withRoom2.project

    const firstRoomId = snapshotProject.rooms[0]!.id
    const secondRoomId = snapshotProject.rooms[1]!.id

    const result = resolveResetState(snapshotProject, snapshotProject, secondRoomId)

    expect(result.roomId).toBe(firstRoomId)
  })

  it("returns current activeRoomId when project has no rooms", () => {
    const base = createEmptyProjectV1("empty")
    const currentRoomId = "room-that-no-longer-exists"

    const result = resolveResetState(base, null, currentRoomId)

    expect(result.roomId).toBe(currentRoomId)
  })
})

describe("resolveInitialSection", () => {
  it("returns 'templates' for a fresh empty project", () => {
    const empty = createEmptyProjectV1("Empty")
    expect(resolveInitialSection(empty)).toBe("templates")
  })

  it("returns 'templates' when project has rooms but no objects or sprites", () => {
    const withRoom = createRoom(createEmptyProjectV1("Empty"), "Sala").project
    expect(resolveInitialSection(withRoom)).toBe("templates")
  })

  it("returns 'objects' when project has at least one object", () => {
    const base = createEmptyProjectV1("Has object")
    const spriteResult = quickCreateSprite(base, "spr")
    const objectResult = quickCreateObject(spriteResult.project, {
      name: "obj",
      spriteId: spriteResult.spriteId,
      x: 0,
      y: 0,
      speed: 1,
      direction: 0
    })
    expect(resolveInitialSection(objectResult.project)).toBe("objects")
  })

  it("returns 'objects' when project has at least one sprite", () => {
    const base = createEmptyProjectV1("Has sprite")
    const spriteResult = quickCreateSprite(base, "spr")
    expect(resolveInitialSection(spriteResult.project)).toBe("objects")
  })
})

describe("shouldResetWhenSwitchingSection", () => {
  it("returns true when leaving run while runtime is active", () => {
    expect(shouldResetWhenSwitchingSection("run", "objects", true)).toBe(true)
  })

  it("returns false when runtime is not active", () => {
    expect(shouldResetWhenSwitchingSection("run", "objects", false)).toBe(false)
  })

  it("returns false when staying in run", () => {
    expect(shouldResetWhenSwitchingSection("run", "run", true)).toBe(false)
  })
})

describe("isSpriteCompatibleWithObjectSize", () => {
  it("returns true when sizes are equal", () => {
    expect(isSpriteCompatibleWithObjectSize(32, 32, 32, 32)).toBe(true)
  })

  it("returns false when width or height differ", () => {
    expect(isSpriteCompatibleWithObjectSize(32, 16, 16, 16)).toBe(false)
    expect(isSpriteCompatibleWithObjectSize(16, 32, 16, 16)).toBe(false)
  })
})
