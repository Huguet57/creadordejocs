import { z } from "zod"
import { ACTION_LABELS } from "./action-labels.js"

type ScalarVariableValue = number | string | boolean
type VariableValueSchema = z.ZodType<ScalarVariableValue>
type ScalarVariableType = "number" | "string" | "boolean"

export type ActionType = (typeof ACTION_REGISTRY)[number]["type"]

export type ActionCategoryId = "movement" | "objects" | "game" | "variables" | "rooms" | "flow"
export type ActionVariableDefinition = {
  id: string
} & (
  | {
      type: "number" | "string" | "boolean"
      initialValue: ScalarVariableValue
    }
  | {
      type: "list"
      itemType: "number" | "string" | "boolean"
      initialValue: ScalarVariableValue[]
    }
  | {
      type: "map"
      itemType: "number" | "string" | "boolean"
      initialValue: Record<string, ScalarVariableValue>
    }
)
export type ActionDefaultsContext = {
  selectableTargetObjectIds: string[]
  globalVariables: ActionVariableDefinition[]
  objectVariables: ActionVariableDefinition[]
  roomIds: string[]
  soundIds: string[]
  spriteIds: string[]
}

export const GO_TO_ROOM_TRANSITIONS = ["none", "fade", "slideLeft", "slideRight"] as const
export type GoToRoomTransition = (typeof GO_TO_ROOM_TRANSITIONS)[number]

type ActionUiMeta = {
  label: string
  shortLabel: string
  categoryId: ActionCategoryId
  editorVisible: boolean
}

const a = ACTION_LABELS.actions
const c = ACTION_LABELS.categories

export const ACTION_REGISTRY = [
  { type: "move",              ui: { ...a.move,              categoryId: "movement",  editorVisible: true } },
  { type: "setVelocity",       ui: { ...a.setVelocity,       categoryId: "movement",  editorVisible: true } },
  { type: "rotate",            ui: { ...a.rotate,            categoryId: "movement",  editorVisible: true } },
  { type: "moveToward",        ui: { ...a.moveToward,        categoryId: "movement",  editorVisible: true } },
  { type: "clampToRoom",       ui: { ...a.clampToRoom,       categoryId: "movement",  editorVisible: true } },
  { type: "teleport",          ui: { ...a.teleport,          categoryId: "movement",  editorVisible: true } },
  { type: "destroySelf",       ui: { ...a.destroySelf,       categoryId: "objects",   editorVisible: true } },
  { type: "destroyOther",      ui: { ...a.destroyOther,      categoryId: "objects",   editorVisible: true } },
  { type: "spawnObject",       ui: { ...a.spawnObject,       categoryId: "objects",   editorVisible: true } },
  { type: "changeSprite",      ui: { ...a.changeSprite,      categoryId: "objects",   editorVisible: true } },
  { type: "setSpriteSpeed",    ui: { ...a.setSpriteSpeed,    categoryId: "objects",   editorVisible: true } },
  { type: "setObjectText",     ui: { ...a.setObjectText,     categoryId: "objects",   editorVisible: true } },
  { type: "changeScore",       ui: { ...a.changeScore,       categoryId: "game",      editorVisible: true } },
  { type: "endGame",           ui: { ...a.endGame,           categoryId: "game",      editorVisible: true } },
  { type: "message",           ui: { ...a.message,           categoryId: "game",      editorVisible: true } },
  { type: "playSound",         ui: { ...a.playSound,         categoryId: "game",      editorVisible: false } },
  { type: "changeVariable",    ui: { ...a.changeVariable,    categoryId: "variables", editorVisible: true } },
  { type: "randomizeVariable", ui: { ...a.randomizeVariable, categoryId: "variables", editorVisible: true } },
  { type: "copyVariable",      ui: { ...a.copyVariable,      categoryId: "variables", editorVisible: true } },
  { type: "listPush",          ui: { ...a.listPush,          categoryId: "variables", editorVisible: true } },
  { type: "listSetAt",         ui: { ...a.listSetAt,         categoryId: "variables", editorVisible: true } },
  { type: "listRemoveAt",      ui: { ...a.listRemoveAt,      categoryId: "variables", editorVisible: true } },
  { type: "listClear",         ui: { ...a.listClear,         categoryId: "variables", editorVisible: true } },
  { type: "mapSet",            ui: { ...a.mapSet,            categoryId: "variables", editorVisible: true } },
  { type: "mapDelete",         ui: { ...a.mapDelete,         categoryId: "variables", editorVisible: true } },
  { type: "mapClear",          ui: { ...a.mapClear,          categoryId: "variables", editorVisible: true } },
  { type: "goToRoom",          ui: { ...a.goToRoom,          categoryId: "rooms",     editorVisible: true } },
  { type: "teleportWindow",    ui: { ...a.teleportWindow,    categoryId: "rooms",     editorVisible: true } },
  { type: "moveWindow",        ui: { ...a.moveWindow,        categoryId: "rooms",     editorVisible: true } },
  { type: "restartRoom",       ui: { ...a.restartRoom,       categoryId: "rooms",     editorVisible: true } },
  { type: "wait",              ui: { ...a.wait,              categoryId: "flow",      editorVisible: true } },
  { type: "repeat",            ui: { ...a.repeat,            categoryId: "flow",      editorVisible: false } },
  { type: "forEachList",       ui: { ...a.forEachList,       categoryId: "flow",      editorVisible: false } },
  { type: "forEachMap",        ui: { ...a.forEachMap,        categoryId: "flow",      editorVisible: false } },
  { type: "emitCustomEvent",   ui: { ...a.emitCustomEvent,   categoryId: "game",      editorVisible: true } }
] as const satisfies readonly { type: string; ui: ActionUiMeta }[]

export const ACTION_CATEGORY_LABELS: Record<ActionCategoryId, string> = {
  movement:  c.movement,
  objects:   c.objects,
  game:      c.game,
  variables: c.variables,
  rooms:     c.rooms,
  flow:      c.flow
}

export type ActionSchemaDependencies<
  TValueSourceSchema extends z.ZodType<unknown>,
  TLegacyVariableReferenceSchema extends z.ZodType<unknown>,
  TVariableOperatorSchema extends z.ZodType<unknown>
> = {
  valueSourceSchema: TValueSourceSchema
  legacyVariableReferenceSchema: TLegacyVariableReferenceSchema
  variableOperatorSchema: TVariableOperatorSchema
  variableValueSchema: VariableValueSchema
}

export function createObjectActionSchema<
  TValueSourceSchema extends z.ZodType<unknown>,
  TLegacyVariableReferenceSchema extends z.ZodType<unknown>,
  TVariableOperatorSchema extends z.ZodType<unknown>
>(
  deps: ActionSchemaDependencies<TValueSourceSchema, TLegacyVariableReferenceSchema, TVariableOperatorSchema>
) {
  const valueOrSource = z.union([deps.valueSourceSchema, deps.legacyVariableReferenceSchema, deps.variableValueSchema])
  const numberOrSource = z.union([z.number(), deps.valueSourceSchema, deps.legacyVariableReferenceSchema])
  const stringOrSource = z.union([z.string().min(1), deps.valueSourceSchema, deps.legacyVariableReferenceSchema])
  const durationMsOrSource = z.union([z.number().int().min(1), deps.valueSourceSchema, deps.legacyVariableReferenceSchema])
  const flowScopeSchema = z.enum(["global", "object"])
  const flowTargetSchema = z.enum(["self", "other", "instanceId"])
  const goToRoomTransitionSchema = z.enum(GO_TO_ROOM_TRANSITIONS)
  return z.discriminatedUnion("type", [
    z.object({
      id: z.string().min(1),
      type: z.literal("move"),
      dx: numberOrSource,
      dy: numberOrSource
    }),
    z.object({
      id: z.string().min(1),
      type: z.literal("setVelocity"),
      speed: numberOrSource,
      direction: numberOrSource
    }),
    z.object({
      id: z.string().min(1),
      type: z.literal("rotate"),
      angle: numberOrSource,
      mode: z.enum(["set", "add"])
    }),
    z.object({
      id: z.string().min(1),
      type: z.literal("moveToward"),
      targetType: z.enum(["object", "mouse"]),
      targetObjectId: z.string().nullable().default(null),
      speed: numberOrSource
    }),
    z.object({
      id: z.string().min(1),
      type: z.literal("clampToRoom")
    }),
    z.object({
      id: z.string().min(1),
      type: z.literal("destroySelf")
    }),
    z.object({
      id: z.string().min(1),
      type: z.literal("destroyOther")
    }),
    z.object({
      id: z.string().min(1),
      type: z.literal("spawnObject"),
      objectId: z.string().min(1),
      offsetX: numberOrSource,
      offsetY: numberOrSource,
      positionMode: z.enum(["absolute", "relative"]).optional()
    }),
    z.object({
      id: z.string().min(1),
      type: z.literal("changeScore"),
      delta: numberOrSource
    }),
    z.object({
      id: z.string().min(1),
      type: z.literal("endGame"),
      message: stringOrSource
    }),
    z.object({
      id: z.string().min(1),
      type: z.literal("message"),
      text: stringOrSource,
      durationMs: durationMsOrSource
    }),
    z.object({
      id: z.string().min(1),
      type: z.literal("setObjectText"),
      text: stringOrSource,
      justification: z.enum(["left", "center", "right"]).default("center"),
      mode: z.enum(["temporary", "persistent"]).default("temporary"),
      durationMs: z.preprocess((value) => value === undefined ? 2000 : value, durationMsOrSource)
    }),
    z.object({
      id: z.string().min(1),
      type: z.literal("playSound"),
      soundId: z.string().min(1)
    }),
    z.object({
      id: z.string().min(1),
      type: z.literal("teleport"),
      mode: z.enum(["position", "start", "mouse"]),
      x: numberOrSource.nullable().default(null),
      y: numberOrSource.nullable().default(null)
    }),
    z.object({
      id: z.string().min(1),
      type: z.literal("changeVariable"),
      scope: z.enum(["global", "object"]),
      variableId: z.string().min(1),
      operator: deps.variableOperatorSchema,
      target: z.enum(["self", "other", "instanceId"]).nullable().optional(),
      targetInstanceId: z.string().nullable().optional(),
      value: valueOrSource
    }),
    z.object({
      id: z.string().min(1),
      type: z.literal("randomizeVariable"),
      scope: z.enum(["global", "object"]),
      variableId: z.string().min(1),
      target: z.enum(["self", "other", "instanceId"]).nullable().optional(),
      targetInstanceId: z.string().nullable().optional(),
      min: z.union([z.number().int(), deps.valueSourceSchema, deps.legacyVariableReferenceSchema]),
      max: z.union([z.number().int(), deps.valueSourceSchema, deps.legacyVariableReferenceSchema]),
      step: z.union([z.number().int().positive(), deps.valueSourceSchema, deps.legacyVariableReferenceSchema]).optional()
    }),
    z.object({
      id: z.string().min(1),
      type: z.literal("copyVariable"),
      direction: z.enum(["globalToObject", "objectToGlobal"]),
      globalVariableId: z.string().min(1),
      objectVariableId: z.string().min(1),
      instanceTarget: z.enum(["self", "other", "instanceId"]),
      instanceTargetId: z.string().nullable().default(null)
    }),
    z.object({
      id: z.string().min(1),
      type: z.literal("listPush"),
      scope: z.enum(["global", "object"]),
      variableId: z.string().min(1),
      target: z.enum(["self", "other", "instanceId"]).nullable().optional(),
      targetInstanceId: z.string().nullable().optional(),
      value: valueOrSource
    }),
    z.object({
      id: z.string().min(1),
      type: z.literal("listSetAt"),
      scope: z.enum(["global", "object"]),
      variableId: z.string().min(1),
      target: z.enum(["self", "other", "instanceId"]).nullable().optional(),
      targetInstanceId: z.string().nullable().optional(),
      index: z.union([z.number().int(), deps.valueSourceSchema, deps.legacyVariableReferenceSchema]),
      value: valueOrSource
    }),
    z.object({
      id: z.string().min(1),
      type: z.literal("listRemoveAt"),
      scope: z.enum(["global", "object"]),
      variableId: z.string().min(1),
      target: z.enum(["self", "other", "instanceId"]).nullable().optional(),
      targetInstanceId: z.string().nullable().optional(),
      index: z.union([z.number().int(), deps.valueSourceSchema, deps.legacyVariableReferenceSchema])
    }),
    z.object({
      id: z.string().min(1),
      type: z.literal("listClear"),
      scope: z.enum(["global", "object"]),
      variableId: z.string().min(1),
      target: z.enum(["self", "other", "instanceId"]).nullable().optional(),
      targetInstanceId: z.string().nullable().optional()
    }),
    z.object({
      id: z.string().min(1),
      type: z.literal("mapSet"),
      scope: z.enum(["global", "object"]),
      variableId: z.string().min(1),
      target: z.enum(["self", "other", "instanceId"]).nullable().optional(),
      targetInstanceId: z.string().nullable().optional(),
      key: stringOrSource,
      value: valueOrSource
    }),
    z.object({
      id: z.string().min(1),
      type: z.literal("mapDelete"),
      scope: z.enum(["global", "object"]),
      variableId: z.string().min(1),
      target: z.enum(["self", "other", "instanceId"]).nullable().optional(),
      targetInstanceId: z.string().nullable().optional(),
      key: stringOrSource
    }),
    z.object({
      id: z.string().min(1),
      type: z.literal("mapClear"),
      scope: z.enum(["global", "object"]),
      variableId: z.string().min(1),
      target: z.enum(["self", "other", "instanceId"]).nullable().optional(),
      targetInstanceId: z.string().nullable().optional()
    }),
    z.object({
      id: z.string().min(1),
      type: z.literal("goToRoom"),
      roomId: z.string().min(1),
      transition: goToRoomTransitionSchema.optional()
    }),
    z.object({
      id: z.string().min(1),
      type: z.literal("teleportWindow"),
      mode: z.enum(["position", "self"]),
      x: numberOrSource.nullable().default(null),
      y: numberOrSource.nullable().default(null)
    }),
    z.object({
      id: z.string().min(1),
      type: z.literal("moveWindow"),
      dx: numberOrSource,
      dy: numberOrSource
    }),
    z.object({
      id: z.string().min(1),
      type: z.literal("restartRoom")
    }),
    z.object({
      id: z.string().min(1),
      type: z.literal("wait"),
      durationMs: z.union([z.number().int().min(1), deps.valueSourceSchema, deps.legacyVariableReferenceSchema])
    }),
    z.object({
      id: z.string().min(1),
      type: z.literal("repeat"),
      count: z.union([z.number().int().min(0), deps.valueSourceSchema, deps.legacyVariableReferenceSchema]),
      actions: z.array(z.any()).default([])
    }),
    z.object({
      id: z.string().min(1),
      type: z.literal("forEachList"),
      scope: flowScopeSchema,
      variableId: z.string().min(1),
      target: flowTargetSchema.nullable().optional(),
      targetInstanceId: z.string().nullable().optional(),
      itemLocalVarName: z.string().min(1),
      indexLocalVarName: z.string().min(1).optional(),
      actions: z.array(z.any()).default([])
    }),
    z.object({
      id: z.string().min(1),
      type: z.literal("forEachMap"),
      scope: flowScopeSchema,
      variableId: z.string().min(1),
      target: flowTargetSchema.nullable().optional(),
      targetInstanceId: z.string().nullable().optional(),
      keyLocalVarName: z.string().min(1),
      valueLocalVarName: z.string().min(1),
      actions: z.array(z.any()).default([])
    }),
    z.object({
      id: z.string().min(1),
      type: z.literal("changeSprite"),
      spriteId: z.string().min(1),
      target: z.enum(["self", "other"])
    }),
    z.object({
      id: z.string().min(1),
      type: z.literal("setSpriteSpeed"),
      speedMs: numberOrSource,
      target: z.enum(["self", "other"])
    }),
    z.object({
      id: z.string().min(1),
      type: z.literal("emitCustomEvent"),
      eventName: z.string().min(1),
      payload: valueOrSource
    })
  ])
}

export function getEditorVisibleActionTypes(): ActionType[] {
  return ACTION_REGISTRY.filter((entry) => entry.ui.editorVisible).map((entry) => entry.type)
}

function defaultScalarValueForType(type: ScalarVariableType): ScalarVariableValue {
  if (type === "number") {
    return 0
  }
  if (type === "boolean") {
    return false
  }
  return ""
}

function firstCollectionValue(
  variable: Extract<ActionVariableDefinition, { type: "list" | "map" }>
): ScalarVariableValue {
  if (variable.type === "list") {
    const first = variable.initialValue[0]
    return first ?? defaultScalarValueForType(variable.itemType)
  }
  const firstEntry = Object.values(variable.initialValue)[0]
  return firstEntry ?? defaultScalarValueForType(variable.itemType)
}

export function createEditorDefaultAction(type: ActionType, ctx: ActionDefaultsContext): Record<string, unknown> | null {
  if (type === "move") return { type: "move", dx: 0, dy: 0 }
  if (type === "setVelocity") return { type: "setVelocity", speed: 1, direction: 0 }
  if (type === "rotate") return { type: "rotate", angle: 0, mode: "add" }
  if (type === "moveToward") {
    return {
      type: "moveToward",
      targetType: ctx.selectableTargetObjectIds.length > 0 ? "object" : "mouse",
      targetObjectId: ctx.selectableTargetObjectIds[0] ?? null,
      speed: 1
    }
  }
  if (type === "clampToRoom") return { type: "clampToRoom" }
  if (type === "teleport") return { type: "teleport", mode: "position", x: 0, y: 0 }
  if (type === "changeVariable") {
    const firstGlobal = ctx.globalVariables[0]
    const firstObjectVariable = ctx.objectVariables[0]
    if (firstGlobal) {
      return {
        type: "changeVariable",
        scope: "global",
        variableId: firstGlobal.id,
        operator: "set",
        value: firstGlobal.initialValue
      }
    }
    if (!firstObjectVariable) return null
    return {
      type: "changeVariable",
      scope: "object",
      variableId: firstObjectVariable.id,
      operator: "set",
      target: "self",
      targetInstanceId: null,
      value: firstObjectVariable.initialValue
    }
  }
  if (type === "randomizeVariable") {
    const firstNumericGlobal = ctx.globalVariables.find((entry) => entry.type === "number")
    const firstNumericObjectVariable = ctx.objectVariables.find((entry) => entry.type === "number")
    if (firstNumericGlobal) {
      return {
        type: "randomizeVariable",
        scope: "global",
        variableId: firstNumericGlobal.id,
        min: 0,
        max: 10
      }
    }
    if (!firstNumericObjectVariable) return null
    return {
      type: "randomizeVariable",
      scope: "object",
      variableId: firstNumericObjectVariable.id,
      target: "self",
      targetInstanceId: null,
      min: 0,
      max: 10
    }
  }
  if (type === "copyVariable") {
    const firstObjectVariable = ctx.objectVariables[0]
    const firstGlobal = ctx.globalVariables[0]
    if (!firstObjectVariable || !firstGlobal) return null
    return {
      type: "copyVariable",
      direction: "globalToObject",
      globalVariableId: firstGlobal.id,
      objectVariableId: firstObjectVariable.id,
      instanceTarget: "self",
      instanceTargetId: null
    }
  }
  if (type === "listPush") {
    const firstGlobalList = ctx.globalVariables.find((entry) => entry.type === "list")
    if (firstGlobalList) {
      return {
        type: "listPush",
        scope: "global",
        variableId: firstGlobalList.id,
        value: firstCollectionValue(firstGlobalList)
      }
    }
    const firstObjectList = ctx.objectVariables.find((entry) => entry.type === "list")
    if (!firstObjectList) return null
    return {
      type: "listPush",
      scope: "object",
      variableId: firstObjectList.id,
      target: "self",
      targetInstanceId: null,
      value: firstCollectionValue(firstObjectList)
    }
  }
  if (type === "listSetAt") {
    const firstGlobalList = ctx.globalVariables.find((entry) => entry.type === "list")
    if (firstGlobalList) {
      return {
        type: "listSetAt",
        scope: "global",
        variableId: firstGlobalList.id,
        index: 0,
        value: firstCollectionValue(firstGlobalList)
      }
    }
    const firstObjectList = ctx.objectVariables.find((entry) => entry.type === "list")
    if (!firstObjectList) return null
    return {
      type: "listSetAt",
      scope: "object",
      variableId: firstObjectList.id,
      target: "self",
      targetInstanceId: null,
      index: 0,
      value: firstCollectionValue(firstObjectList)
    }
  }
  if (type === "listRemoveAt") {
    const firstGlobalList = ctx.globalVariables.find((entry) => entry.type === "list")
    if (firstGlobalList) {
      return {
        type: "listRemoveAt",
        scope: "global",
        variableId: firstGlobalList.id,
        index: 0
      }
    }
    const firstObjectList = ctx.objectVariables.find((entry) => entry.type === "list")
    if (!firstObjectList) return null
    return {
      type: "listRemoveAt",
      scope: "object",
      variableId: firstObjectList.id,
      target: "self",
      targetInstanceId: null,
      index: 0
    }
  }
  if (type === "listClear") {
    const firstGlobalList = ctx.globalVariables.find((entry) => entry.type === "list")
    if (firstGlobalList) {
      return {
        type: "listClear",
        scope: "global",
        variableId: firstGlobalList.id
      }
    }
    const firstObjectList = ctx.objectVariables.find((entry) => entry.type === "list")
    if (!firstObjectList) return null
    return {
      type: "listClear",
      scope: "object",
      variableId: firstObjectList.id,
      target: "self",
      targetInstanceId: null
    }
  }
  if (type === "mapSet") {
    const firstGlobalMap = ctx.globalVariables.find((entry) => entry.type === "map")
    if (firstGlobalMap) {
      return {
        type: "mapSet",
        scope: "global",
        variableId: firstGlobalMap.id,
        key: "key",
        value: firstCollectionValue(firstGlobalMap)
      }
    }
    const firstObjectMap = ctx.objectVariables.find((entry) => entry.type === "map")
    if (!firstObjectMap) return null
    return {
      type: "mapSet",
      scope: "object",
      variableId: firstObjectMap.id,
      target: "self",
      targetInstanceId: null,
      key: "key",
      value: firstCollectionValue(firstObjectMap)
    }
  }
  if (type === "mapDelete") {
    const firstGlobalMap = ctx.globalVariables.find((entry) => entry.type === "map")
    if (firstGlobalMap) {
      return {
        type: "mapDelete",
        scope: "global",
        variableId: firstGlobalMap.id,
        key: "key"
      }
    }
    const firstObjectMap = ctx.objectVariables.find((entry) => entry.type === "map")
    if (!firstObjectMap) return null
    return {
      type: "mapDelete",
      scope: "object",
      variableId: firstObjectMap.id,
      target: "self",
      targetInstanceId: null,
      key: "key"
    }
  }
  if (type === "mapClear") {
    const firstGlobalMap = ctx.globalVariables.find((entry) => entry.type === "map")
    if (firstGlobalMap) {
      return {
        type: "mapClear",
        scope: "global",
        variableId: firstGlobalMap.id
      }
    }
    const firstObjectMap = ctx.objectVariables.find((entry) => entry.type === "map")
    if (!firstObjectMap) return null
    return {
      type: "mapClear",
      scope: "object",
      variableId: firstObjectMap.id,
      target: "self",
      targetInstanceId: null
    }
  }
  if (type === "goToRoom") {
    const firstRoom = ctx.roomIds[0]
    if (!firstRoom) return null
    return { type: "goToRoom", roomId: firstRoom, transition: "none" }
  }
  if (type === "teleportWindow") return { type: "teleportWindow", mode: "position", x: 0, y: 0 }
  if (type === "moveWindow") return { type: "moveWindow", dx: 0, dy: 0 }
  if (type === "restartRoom") return { type: "restartRoom" }
  if (type === "wait") return { type: "wait", durationMs: 500 }
  if (type === "repeat") return { type: "repeat", count: 3, actions: [] }
  if (type === "forEachList") {
    const firstGlobalList = ctx.globalVariables.find((entry) => entry.type === "list")
    if (firstGlobalList) {
      return {
        type: "forEachList",
        scope: "global",
        variableId: firstGlobalList.id,
        itemLocalVarName: "item",
        indexLocalVarName: "index",
        actions: []
      }
    }
    const firstObjectList = ctx.objectVariables.find((entry) => entry.type === "list")
    if (!firstObjectList) return null
    return {
      type: "forEachList",
      scope: "object",
      variableId: firstObjectList.id,
      target: "self",
      targetInstanceId: null,
      itemLocalVarName: "item",
      indexLocalVarName: "index",
      actions: []
    }
  }
  if (type === "forEachMap") {
    const firstGlobalMap = ctx.globalVariables.find((entry) => entry.type === "map")
    if (firstGlobalMap) {
      return {
        type: "forEachMap",
        scope: "global",
        variableId: firstGlobalMap.id,
        keyLocalVarName: "key",
        valueLocalVarName: "value",
        actions: []
      }
    }
    const firstObjectMap = ctx.objectVariables.find((entry) => entry.type === "map")
    if (!firstObjectMap) return null
    return {
      type: "forEachMap",
      scope: "object",
      variableId: firstObjectMap.id,
      target: "self",
      targetInstanceId: null,
      keyLocalVarName: "key",
      valueLocalVarName: "value",
      actions: []
    }
  }
  if (type === "destroySelf") return { type: "destroySelf" }
  if (type === "destroyOther") return { type: "destroyOther" }
  if (type === "setObjectText") return { type: "setObjectText", text: "Text", justification: "center", mode: "temporary", durationMs: 2000 }
  if (type === "changeScore") return { type: "changeScore", delta: 1 }
  if (type === "endGame") return { type: "endGame", message: "Game over" }
  if (type === "message") return { type: "message", text: "Message", durationMs: 2000 }
  if (type === "spawnObject") {
    const targetObjectId = ctx.selectableTargetObjectIds[0]
    if (!targetObjectId) return null
    return { type: "spawnObject", objectId: targetObjectId, offsetX: 0, offsetY: 0, positionMode: "absolute" }
  }
  if (type === "playSound") {
    const soundId = ctx.soundIds[0]
    if (!soundId) return null
    return { type: "playSound", soundId }
  }
  if (type === "changeSprite") {
    const spriteId = ctx.spriteIds[0]
    if (!spriteId) return null
    return { type: "changeSprite", spriteId, target: "self" }
  }
  if (type === "setSpriteSpeed") {
    return { type: "setSpriteSpeed", speedMs: 100, target: "self" }
  }
  if (type === "emitCustomEvent") {
    return { type: "emitCustomEvent", eventName: "event", payload: 0 }
  }
  return null
}
