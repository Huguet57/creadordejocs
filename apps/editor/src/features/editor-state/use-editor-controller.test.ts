import { describe, expect, it } from "vitest"
import {
  getRuntimeKeyFromKeyboardEvent,
  resolveResetState
} from "./use-editor-controller.js"
import { createEmptyProjectV1 } from "@creadordejocs/project-format"

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
    const firstReset = resolveResetState(baseProject, runSnapshotProject)

    expect(firstReset.project.metadata.name).toBe("snapshot-before-run")
    expect(firstReset.runSnapshot).toBeNull()

    const editedAfterReset = createEmptyProjectV1("edited-after-reset")
    const secondReset = resolveResetState(editedAfterReset, firstReset.runSnapshot)

    expect(secondReset.project.metadata.name).toBe("edited-after-reset")
    expect(secondReset.runSnapshot).toBeNull()
  })
})
