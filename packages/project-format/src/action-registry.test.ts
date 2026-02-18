import { describe, expect, it } from "vitest"
import { z } from "zod"
import {
  ACTION_REGISTRY,
  createEditorDefaultAction,
  createObjectActionSchema,
  type ActionDefaultsContext
} from "./action-registry.js"

const valueSourceSchema = z.object({
  source: z.literal("literal"),
  value: z.union([z.number(), z.string(), z.boolean()])
})
const legacyVariableReferenceSchema = z.object({
  scope: z.enum(["global", "object"]),
  variableId: z.string()
})
const variableOperatorSchema = z.enum(["set", "add", "subtract", "multiply"])
const variableValueSchema = z.union([z.number(), z.string(), z.boolean()])

const objectActionSchema = createObjectActionSchema({
  valueSourceSchema,
  legacyVariableReferenceSchema,
  variableOperatorSchema,
  variableValueSchema
})

const defaultContext: ActionDefaultsContext = {
  selectableTargetObjectIds: [],
  globalVariables: [],
  objectVariables: [],
  roomIds: ["room-a"],
  soundIds: [],
  spriteIds: []
}

describe("room window actions", () => {
  it("registers teleportWindow and moveWindow in rooms category", () => {
    const teleportWindowEntry = ACTION_REGISTRY.find((entry) => entry.type === "teleportWindow")
    const moveWindowEntry = ACTION_REGISTRY.find((entry) => entry.type === "moveWindow")

    expect(teleportWindowEntry?.ui.categoryId).toBe("rooms")
    expect(moveWindowEntry?.ui.categoryId).toBe("rooms")
  })

  it("provides default editor payloads for new room window actions", () => {
    const teleportDefault = createEditorDefaultAction("teleportWindow", defaultContext)
    const moveDefault = createEditorDefaultAction("moveWindow", defaultContext)

    expect(teleportDefault).toEqual({ type: "teleportWindow", mode: "position", x: 0, y: 0 })
    expect(moveDefault).toEqual({ type: "moveWindow", dx: 0, dy: 0 })
  })

  it("accepts teleportWindow and moveWindow in action schema", () => {
    expect(
      objectActionSchema.parse({
        id: "action-teleport-window",
        type: "teleportWindow",
        mode: "self",
        x: null,
        y: null
      })
    ).toMatchObject({ type: "teleportWindow", mode: "self" })

    expect(
      objectActionSchema.parse({
        id: "action-move-window",
        type: "moveWindow",
        dx: 10,
        dy: -4
      })
    ).toMatchObject({ type: "moveWindow", dx: 10, dy: -4 })
  })
})
