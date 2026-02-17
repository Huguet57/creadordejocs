import { describe, expect, it } from "vitest"
import { ACTION_REGISTRY, getEditorVisibleActionTypes } from "@creadordejocs/project-format"
import { ACTION_CATEGORIES, ACTION_DISPLAY_NAMES, OBJECT_ACTION_TYPES } from "./types.js"
import { ACTION_RUNTIME_REGISTRY } from "./action-runtime-registry.js"

describe("action registry contracts", () => {
  it("keeps editor action types aligned with project-format registry", () => {
    const visibleTypes = getEditorVisibleActionTypes()
    expect(OBJECT_ACTION_TYPES).toEqual(visibleTypes)
  })

  it("keeps category listings aligned with editor-visible action types", () => {
    const categoryTypes = ACTION_CATEGORIES.flatMap((category) => category.types)
    expect(new Set(categoryTypes)).toEqual(new Set(OBJECT_ACTION_TYPES))
  })

  it("provides labels for all editor-visible actions", () => {
    for (const actionType of OBJECT_ACTION_TYPES) {
      expect(ACTION_DISPLAY_NAMES[actionType]).toBeTruthy()
    }
  })

  it("has runtime executors for all schema action types", () => {
    const allActionTypes = ACTION_REGISTRY.map((entry) => entry.type)
    for (const actionType of allActionTypes) {
      expect(ACTION_RUNTIME_REGISTRY[actionType]).toBeTypeOf("function")
    }
  })
})

