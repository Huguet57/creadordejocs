import { z } from "zod"
import { generateUUID } from "./generate-id.js"
import { createObjectActionSchema } from "./action-registry.js"

const SceneObjectSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  x: z.number(),
  y: z.number()
})

const SceneSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  objects: z.array(SceneObjectSchema)
})

const SpriteFrameSchema = z.object({
  id: z.string().min(1),
  pixelsRgba: z.array(z.string()).default([])
})

const SpriteResourceSchema = z
  .object({
    id: z.string().min(1),
    name: z.string().min(1),
    folderId: z.string().nullable().optional(),
    imagePath: z.string(),
    assetSource: z.string().default(""),
    uploadStatus: z.enum(["notConnected", "ready"]).default("notConnected"),
    width: z.number().int().min(1).default(32),
    height: z.number().int().min(1).default(32),
    pixelsRgba: z.array(z.string()).default([]),
    frames: z.array(SpriteFrameSchema).optional()
  })
  .transform((sprite) => ({
    ...sprite,
    frames:
      sprite.frames && sprite.frames.length > 0
        ? sprite.frames
        : [{ id: `frame-${generateUUID()}`, pixelsRgba: [...sprite.pixelsRgba] }]
  }))

const SpriteFolderSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  parentId: z.string().nullable().optional()
})

const ObjectFolderSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  parentId: z.string().nullable().optional()
})

const RoomFolderSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  parentId: z.string().nullable().optional()
})

const SoundResourceSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  audioPath: z.string(),
  assetSource: z.string().default(""),
  uploadStatus: z.enum(["notConnected", "ready"]).default("notConnected")
})

const ProjectResourcesSchema = z.object({
  spriteFolders: z.array(SpriteFolderSchema).optional(),
  objectFolders: z.array(ObjectFolderSchema).optional(),
  roomFolders: z.array(RoomFolderSchema).optional(),
  sprites: z.array(SpriteResourceSchema),
  sounds: z.array(SoundResourceSchema)
})

const NumberVariableDefinitionSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  type: z.literal("number"),
  initialValue: z.number()
})

const StringVariableDefinitionSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  type: z.literal("string"),
  initialValue: z.string()
})

const BooleanVariableDefinitionSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  type: z.literal("boolean"),
  initialValue: z.boolean()
})

const CollectionItemTypeSchema = z.enum(["number", "string", "boolean"])

const ListVariableDefinitionSchema = z
  .object({
    id: z.string().min(1),
    name: z.string().min(1),
    type: z.literal("list"),
    itemType: CollectionItemTypeSchema,
    initialValue: z.array(z.union([z.number(), z.string(), z.boolean()]))
  })
  .superRefine((value, ctx) => {
    const hasInvalid = value.initialValue.some((entry) => typeof entry !== value.itemType)
    if (hasInvalid) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "List initialValue items must match itemType"
      })
    }
  })

const MapVariableDefinitionSchema = z
  .object({
    id: z.string().min(1),
    name: z.string().min(1),
    type: z.literal("map"),
    itemType: CollectionItemTypeSchema,
    initialValue: z.record(z.union([z.number(), z.string(), z.boolean()]))
  })
  .superRefine((value, ctx) => {
    const hasInvalid = Object.values(value.initialValue).some((entry) => typeof entry !== value.itemType)
    if (hasInvalid) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Map initialValue values must match itemType"
      })
    }
  })

const VariableDefinitionSchema = z.union([
  NumberVariableDefinitionSchema,
  StringVariableDefinitionSchema,
  BooleanVariableDefinitionSchema,
  ListVariableDefinitionSchema,
  MapVariableDefinitionSchema
])

const VariableValueSchema = z.union([z.number(), z.string(), z.boolean()])

const VariableOperatorSchema = z.enum(["set", "add", "subtract", "multiply"])

const ValueTargetSchema = z.enum(["self", "other"])
const ValueAttributeSchema = z.enum(["x", "y", "rotation", "instanceCount"])
const MouseAttributeSchema = z.enum(["x", "y"])

const ValueSourceSchema = z.discriminatedUnion("source", [
  z.object({
    source: z.literal("literal"),
    value: VariableValueSchema
  }),
  z.object({
    source: z.literal("random"),
    min: z.number(),
    max: z.number(),
    step: z.number().positive()
  }),
  z.object({
    source: z.literal("attribute"),
    target: ValueTargetSchema,
    attribute: ValueAttributeSchema
  }),
  z.object({
    source: z.literal("internalVariable"),
    target: ValueTargetSchema,
    variableId: z.string().min(1)
  }),
  z.object({
    source: z.literal("globalVariable"),
    variableId: z.string().min(1)
  }),
  z.object({
    source: z.literal("mouseAttribute"),
    attribute: MouseAttributeSchema
  }),
  z.object({
    source: z.literal("iterationVariable"),
    variableName: z.string().min(1)
  })
])

const LegacyVariableReferenceSchema = z.object({
  scope: z.enum(["global", "object"]),
  variableId: z.string().min(1)
})

const ValueExpressionSchema = z.union([VariableValueSchema, ValueSourceSchema, LegacyVariableReferenceSchema])

const ObjectActionSchema = createObjectActionSchema({
  valueSourceSchema: ValueSourceSchema,
  legacyVariableReferenceSchema: LegacyVariableReferenceSchema,
  variableOperatorSchema: VariableOperatorSchema,
  variableValueSchema: VariableValueSchema
})

const IfConditionLeftSchema = z.union([
  LegacyVariableReferenceSchema,
  z.object({
    source: z.literal("attribute"),
    target: ValueTargetSchema,
    attribute: ValueAttributeSchema
  }),
  z.object({
    source: z.literal("internalVariable"),
    target: ValueTargetSchema,
    variableId: z.string().min(1)
  }),
  z.object({
    source: z.literal("globalVariable"),
    variableId: z.string().min(1)
  }),
  z.object({
    source: z.literal("mouseAttribute"),
    attribute: MouseAttributeSchema
  }),
  z.object({
    source: z.literal("iterationVariable"),
    variableName: z.string().min(1)
  })
])

const IfComparisonConditionSchema = z.object({
  left: IfConditionLeftSchema,
  operator: z.enum(["==", "!=", ">", ">=", "<", "<="]),
  right: ValueExpressionSchema
})

export type ObjectActionOutput = z.output<typeof ObjectActionSchema>
export type ValueExpressionOutput = z.output<typeof ValueExpressionSchema>
export type ValueSourceOutput = z.output<typeof ValueSourceSchema>
export type IfConditionOutput =
  | z.output<typeof IfComparisonConditionSchema>
  | {
      logic: "AND" | "OR"
      conditions: IfConditionOutput[]
    }

const IfConditionSchema: z.ZodType<IfConditionOutput> = z.lazy(() =>
  z.union([
    IfComparisonConditionSchema,
    z.object({
      logic: z.enum(["AND", "OR"]),
      conditions: z.array(IfConditionSchema).min(2)
    })
  ])
)

export type ObjectActionItem = {
  id: string
  type: "action"
  action: ObjectActionOutput
}

export type ObjectIfItem = {
  id: string
  type: "if"
  condition: IfConditionOutput
  thenActions: ObjectEventItemType[]
  elseActions: ObjectEventItemType[]
}

export type ObjectRepeatItem = {
  id: string
  type: "repeat"
  count: ValueExpressionOutput
  actions: ObjectEventItemType[]
}

export type ObjectForEachListItem = {
  id: string
  type: "forEachList"
  scope: "global" | "object"
  variableId: string
  target?: string | undefined
  targetInstanceId?: string | null | undefined
  itemLocalVarName: string
  indexLocalVarName?: string | undefined
  actions: ObjectEventItemType[]
}

export type ObjectForEachMapItem = {
  id: string
  type: "forEachMap"
  scope: "global" | "object"
  variableId: string
  target?: string | undefined
  targetInstanceId?: string | null | undefined
  keyLocalVarName: string
  valueLocalVarName: string
  actions: ObjectEventItemType[]
}

export type ObjectControlBlockItem = ObjectIfItem | ObjectRepeatItem | ObjectForEachListItem | ObjectForEachMapItem

export type ObjectEventItemType = ObjectActionItem | ObjectControlBlockItem

const ObjectActionItemSchema = z.object({
  id: z.string().min(1),
  type: z.literal("action"),
  action: ObjectActionSchema
})

function wrapRawActionsAsEventItems(rawActions: unknown[]): ObjectEventItemType[] {
  return rawActions
    .filter(
      (a): a is Record<string, unknown> =>
        typeof a === "object" && a !== null && "id" in a && "type" in a
    )
    .map(
      (a): ObjectEventItemType => ({
        id: `migrated-${String(a.id)}`,
        type: "action",
        action: a as ObjectActionOutput
      })
    )
}

function promoteLegacyFlowAction(actionEntry: ObjectActionOutput, idPrefix: string): ObjectEventItemType | null {
  const action = actionEntry as Record<string, unknown>
  if (actionEntry.type === "repeat") {
    return {
      id: `${idPrefix}${actionEntry.id}`,
      type: "repeat",
      count: action.count as ValueExpressionOutput,
      actions: wrapRawActionsAsEventItems(Array.isArray(action.actions) ? (action.actions as unknown[]) : [])
    }
  }
  if (actionEntry.type === "forEachList") {
    const result: ObjectForEachListItem = {
      id: `${idPrefix}${actionEntry.id}`,
      type: "forEachList",
      scope: (action.scope as "global" | "object") ?? "global",
      variableId: typeof action.variableId === "string" ? action.variableId : "",
      itemLocalVarName: typeof action.itemLocalVarName === "string" ? action.itemLocalVarName : "item",
      actions: wrapRawActionsAsEventItems(Array.isArray(action.actions) ? (action.actions as unknown[]) : [])
    }
    if (typeof action.target === "string") result.target = action.target
    if (action.targetInstanceId !== undefined) result.targetInstanceId = action.targetInstanceId as string | null
    if (typeof action.indexLocalVarName === "string") result.indexLocalVarName = action.indexLocalVarName
    return result
  }
  if (actionEntry.type === "forEachMap") {
    const result: ObjectForEachMapItem = {
      id: `${idPrefix}${actionEntry.id}`,
      type: "forEachMap",
      scope: (action.scope as "global" | "object") ?? "global",
      variableId: typeof action.variableId === "string" ? action.variableId : "",
      keyLocalVarName: typeof action.keyLocalVarName === "string" ? action.keyLocalVarName : "key",
      valueLocalVarName: typeof action.valueLocalVarName === "string" ? action.valueLocalVarName : "value",
      actions: wrapRawActionsAsEventItems(Array.isArray(action.actions) ? (action.actions as unknown[]) : [])
    }
    if (typeof action.target === "string") result.target = action.target
    if (action.targetInstanceId !== undefined) result.targetInstanceId = action.targetInstanceId as string | null
    if (typeof action.indexLocalVarName === "string") {
      // forEachMap doesn't have indexLocalVarName, so this is ignored
    }
    return result
  }
  return null
}

export function migrateFlowActionItems(items: ObjectEventItemType[]): ObjectEventItemType[] {
  return items.map((item): ObjectEventItemType => {
    if (item.type === "if") {
      return {
        ...item,
        thenActions: migrateFlowActionItems(item.thenActions),
        elseActions: migrateFlowActionItems(item.elseActions)
      }
    }
    if (item.type === "repeat" || item.type === "forEachList" || item.type === "forEachMap") {
      return { ...item, actions: migrateFlowActionItems(item.actions) }
    }
    if (item.type !== "action") return item
    const promoted = promoteLegacyFlowAction(item.action, item.id.startsWith("flow-") ? "" : "")
    if (promoted) {
      promoted.id = item.id
      return promoted
    }
    return item
  })
}

const FlowScopeSchema = z.enum(["global", "object"])

const ObjectEventItemSchema: z.ZodType<ObjectEventItemType, z.ZodTypeDef, unknown> = z.lazy(() => {
  const ObjectBranchEntrySchema: z.ZodType<ObjectEventItemType, z.ZodTypeDef, unknown> = z.lazy(() =>
    z.union([
      ObjectEventItemSchema,
      ObjectActionSchema.transform((actionEntry): ObjectEventItemType => {
        const promoted = promoteLegacyFlowAction(actionEntry, "flow-")
        if (promoted) return promoted
        return {
          id: `legacy-item-${actionEntry.id}`,
          type: "action" as const,
          action: actionEntry
        }
      })
    ])
  )
  return z.discriminatedUnion("type", [
    ObjectActionItemSchema,
    z.object({
      id: z.string().min(1),
      type: z.literal("if"),
      condition: IfConditionSchema,
      thenActions: z.array(ObjectBranchEntrySchema).default([]),
      elseActions: z.array(ObjectBranchEntrySchema).default([])
    }),
    z.object({
      id: z.string().min(1),
      type: z.literal("repeat"),
      count: ValueExpressionSchema,
      actions: z.array(ObjectBranchEntrySchema).default([])
    }),
    z.object({
      id: z.string().min(1),
      type: z.literal("forEachList"),
      scope: FlowScopeSchema,
      variableId: z.string(),
      target: z.string().optional(),
      targetInstanceId: z.string().nullable().optional(),
      itemLocalVarName: z.string().default("item"),
      indexLocalVarName: z.string().optional(),
      actions: z.array(ObjectBranchEntrySchema).default([])
    }),
    z.object({
      id: z.string().min(1),
      type: z.literal("forEachMap"),
      scope: FlowScopeSchema,
      variableId: z.string(),
      target: z.string().optional(),
      targetInstanceId: z.string().nullable().optional(),
      keyLocalVarName: z.string().default("key"),
      valueLocalVarName: z.string().default("value"),
      actions: z.array(ObjectBranchEntrySchema).default([])
    })
  ])
})

const ObjectEventSchema = z
  .object({
    id: z.string().min(1),
    type: z.enum([
      "Create",
      "Step",
      "Collision",
      "Keyboard",
      "Mouse",
      "OnDestroy",
      "OutsideRoom",
      "Timer",
      "MouseMove",
      "Mouse",
      "CustomEvent"
    ]),
    key: z.enum(["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "Space", "<any>"]).nullable().default(null),
    keyboardMode: z.enum(["down", "press", "release"]).nullable().optional(),
    mouseMode: z.enum(["down", "press"]).nullable().optional(),
    targetObjectId: z.string().nullable().default(null),
    intervalMs: z.number().positive().nullable().default(null),
    eventName: z.string().min(1).nullable().optional(),
    sourceObjectId: z.string().nullable().optional(),
    items: z.array(ObjectEventItemSchema).optional(),
    actions: z.array(ObjectActionSchema).optional()
  })
  .transform(({ items, actions, mouseMode, ...eventEntry }) => {
    const rawItems: ObjectEventItemType[] =
      items ??
      (actions ?? []).map((actionEntry) => ({
        id: `item-${actionEntry.id}`,
        type: "action" as const,
        action: actionEntry
      }))
    const migratedItems = migrateFlowActionItems(rawItems)
    return {
      ...eventEntry,
      ...(eventEntry.type === "Mouse" ? { mouseMode: mouseMode ?? "down" } : {}),
      ...(eventEntry.type === "CustomEvent" ? {
        eventName: eventEntry.eventName ?? "event",
        sourceObjectId: eventEntry.sourceObjectId ?? null
      } : {}),
      items: migratedItems
    }
  })

const ObjectSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  folderId: z.string().nullable().optional(),
  spriteId: z.string().nullable(),
  x: z.number(),
  y: z.number(),
  speed: z.number(),
  direction: z.number(),
  width: z.number().int().min(1).optional(),
  height: z.number().int().min(1).optional(),
  visible: z.boolean().optional(),
  solid: z.boolean().optional(),
  events: z.array(ObjectEventSchema).default([])
})

const RoomInstanceSchema = z.object({
  id: z.string().min(1),
  objectId: z.string().min(1),
  x: z.number(),
  y: z.number(),
  rotation: z.number().optional()
})

const RoomSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  folderId: z.string().nullable().optional(),
  instances: z.array(RoomInstanceSchema)
})

const ProjectVariablesSchema = z.object({
  global: z.array(VariableDefinitionSchema).default([]),
  objectByObjectId: z.record(z.string(), z.array(VariableDefinitionSchema)).default({})
})

const ProjectMetricsSchema = z.object({
  appStart: z.number().int().nonnegative().default(0),
  projectLoad: z.number().int().nonnegative().default(0),
  runtimeErrors: z.number().int().nonnegative().default(0),
  tutorialCompletion: z.number().int().nonnegative().default(0),
  stuckRate: z.number().int().nonnegative().default(0),
  timeToFirstPlayableFunMs: z.number().int().nonnegative().nullable().default(null)
})

export const ProjectSchemaV1 = z.object({
  version: z.literal(1),
  metadata: z.object({
    id: z.string().min(1),
    name: z.string().min(1),
    locale: z.literal("ca"),
    createdAtIso: z.string().datetime()
  }),
  resources: ProjectResourcesSchema,
  variables: ProjectVariablesSchema.default({
    global: [],
    objectByObjectId: {}
  }),
  objects: z.array(ObjectSchema),
  rooms: z.array(RoomSchema),
  // Kept for backwards compatibility with the MVP 0 player demo.
  scenes: z.array(SceneSchema),
  metrics: ProjectMetricsSchema
})

export type ProjectV1 = z.infer<typeof ProjectSchemaV1>
export type RawProjectV1 = z.input<typeof ProjectSchemaV1>

export function createEmptyProjectV1(name: string): ProjectV1 {
  return {
    version: 1,
    metadata: {
      id: generateUUID(),
      name,
      locale: "ca",
      createdAtIso: new Date().toISOString()
    },
    resources: {
      spriteFolders: [],
      objectFolders: [],
      sprites: [],
      sounds: []
    },
    variables: {
      global: [],
      objectByObjectId: {}
    },
    objects: [],
    rooms: [],
    scenes: [],
    metrics: {
      appStart: 0,
      projectLoad: 0,
      runtimeErrors: 0,
      tutorialCompletion: 0,
      stuckRate: 0,
      timeToFirstPlayableFunMs: null
    }
  }
}
