import { describe, expect, it } from "vitest"
import {
  getRuntimeKeyFromKeyboardEvent,
  resolveResetState
} from "./use-editor-controller.js"
import { createEmptyProjectV1, createRoom } from "@creadordejocs/project-format"

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
