import { z } from "zod"
import { generateUUID } from "./generate-id.js"

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

const SpriteResourceSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  folderId: z.string().nullable().optional(),
  imagePath: z.string(),
  assetSource: z.string().default(""),
  uploadStatus: z.enum(["notConnected", "ready"]).default("notConnected"),
  width: z.number().int().min(1).default(32),
  height: z.number().int().min(1).default(32),
  pixelsRgba: z.array(z.string()).default([])
})

const SpriteFolderSchema = z.object({
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

const VariableDefinitionSchema = z.discriminatedUnion("type", [
  NumberVariableDefinitionSchema,
  StringVariableDefinitionSchema,
  BooleanVariableDefinitionSchema
])

const VariableValueSchema = z.union([z.number(), z.string(), z.boolean()])

const VariableOperatorSchema = z.enum(["set", "add", "subtract", "multiply"])

const ValueTargetSchema = z.enum(["self", "other"])
const ValueAttributeSchema = z.enum(["x", "y", "rotation", "instanceCount"])

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
  })
])

const LegacyVariableReferenceSchema = z.object({
  scope: z.enum(["global", "object"]),
  variableId: z.string().min(1)
})

const ValueExpressionSchema = z.union([VariableValueSchema, ValueSourceSchema, LegacyVariableReferenceSchema])

const ObjectActionSchema = z.discriminatedUnion("type", [
  z.object({
    id: z.string().min(1),
    type: z.literal("move"),
    dx: z.union([z.number(), ValueSourceSchema, LegacyVariableReferenceSchema]),
    dy: z.union([z.number(), ValueSourceSchema, LegacyVariableReferenceSchema])
  }),
  z.object({
    id: z.string().min(1),
    type: z.literal("setVelocity"),
    speed: z.union([z.number(), ValueSourceSchema, LegacyVariableReferenceSchema]),
    direction: z.union([z.number(), ValueSourceSchema, LegacyVariableReferenceSchema])
  }),
  z.object({
    id: z.string().min(1),
    type: z.literal("rotate"),
    angle: z.union([z.number(), ValueSourceSchema, LegacyVariableReferenceSchema]),
    mode: z.enum(["set", "add"])
  }),
  z.object({
    id: z.string().min(1),
    type: z.literal("moveToward"),
    targetType: z.enum(["object", "mouse"]),
    targetObjectId: z.string().nullable().default(null),
    speed: z.union([z.number(), ValueSourceSchema, LegacyVariableReferenceSchema])
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
    offsetX: z.union([z.number(), ValueSourceSchema, LegacyVariableReferenceSchema]),
    offsetY: z.union([z.number(), ValueSourceSchema, LegacyVariableReferenceSchema]),
    positionMode: z.enum(["absolute", "relative"]).optional()
  }),
  z.object({
    id: z.string().min(1),
    type: z.literal("changeScore"),
    delta: z.union([z.number(), ValueSourceSchema, LegacyVariableReferenceSchema])
  }),
  z.object({
    id: z.string().min(1),
    type: z.literal("endGame"),
    message: z.union([z.string().min(1), ValueSourceSchema, LegacyVariableReferenceSchema])
  }),
  z.object({
    id: z.string().min(1),
    type: z.literal("message"),
    text: z.union([z.string().min(1), ValueSourceSchema, LegacyVariableReferenceSchema]),
    durationMs: z.union([z.number().int().min(1), ValueSourceSchema, LegacyVariableReferenceSchema])
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
    x: z.union([z.number(), ValueSourceSchema, LegacyVariableReferenceSchema]).nullable().default(null),
    y: z.union([z.number(), ValueSourceSchema, LegacyVariableReferenceSchema]).nullable().default(null)
  }),
  z.object({
    id: z.string().min(1),
    type: z.literal("changeVariable"),
    scope: z.enum(["global", "object"]),
    variableId: z.string().min(1),
    operator: VariableOperatorSchema,
    target: z.enum(["self", "other", "instanceId"]).nullable().optional(),
    targetInstanceId: z.string().nullable().optional(),
    value: ValueExpressionSchema
  }),
  z.object({
    id: z.string().min(1),
    type: z.literal("randomizeVariable"),
    scope: z.enum(["global", "object"]),
    variableId: z.string().min(1),
    target: z.enum(["self", "other", "instanceId"]).nullable().optional(),
    targetInstanceId: z.string().nullable().optional(),
    min: z.union([z.number().int(), ValueSourceSchema, LegacyVariableReferenceSchema]),
    max: z.union([z.number().int(), ValueSourceSchema, LegacyVariableReferenceSchema]),
    step: z.union([z.number().int().positive(), ValueSourceSchema, LegacyVariableReferenceSchema]).optional()
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
    type: z.literal("goToRoom"),
    roomId: z.string().min(1)
  }),
  z.object({
    id: z.string().min(1),
    type: z.literal("restartRoom")
  }),
  z.object({
    id: z.string().min(1),
    type: z.literal("wait"),
    durationMs: z.union([z.number().int().min(1), ValueSourceSchema, LegacyVariableReferenceSchema])
  })
])

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

export type ObjectEventItemType = ObjectActionItem | ObjectIfItem

const ObjectActionItemSchema = z.object({
  id: z.string().min(1),
  type: z.literal("action"),
  action: ObjectActionSchema
})

const ObjectEventItemSchema: z.ZodType<ObjectEventItemType, z.ZodTypeDef, unknown> = z.lazy(() => {
  const ObjectBranchEntrySchema: z.ZodType<ObjectEventItemType, z.ZodTypeDef, unknown> = z.lazy(() =>
    z.union([
      ObjectEventItemSchema,
      ObjectActionSchema.transform((actionEntry) => ({
        id: `legacy-item-${actionEntry.id}`,
        type: "action" as const,
        action: actionEntry
      }))
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
      "OnDestroy",
      "OutsideRoom",
      "Timer",
      "MouseMove",
      "MouseDown",
      "MouseClick"
    ]),
    key: z.enum(["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "Space"]).nullable().default(null),
    keyboardMode: z.enum(["down", "press"]).nullable().optional(),
    targetObjectId: z.string().nullable().default(null),
    intervalMs: z.number().positive().nullable().default(null),
    items: z.array(ObjectEventItemSchema).optional(),
    actions: z.array(ObjectActionSchema).optional()
  })
  .transform(({ items, actions, ...eventEntry }) => ({
    ...eventEntry,
    items:
      items ??
      (actions ?? []).map((actionEntry) => ({
        id: `item-${actionEntry.id}`,
        type: "action" as const,
        action: actionEntry
      }))
  }))

const ObjectSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
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
