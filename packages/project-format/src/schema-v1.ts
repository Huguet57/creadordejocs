import { z } from "zod"

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
  imagePath: z.string()
})

const SoundResourceSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  audioPath: z.string()
})

const ProjectResourcesSchema = z.object({
  sprites: z.array(SpriteResourceSchema),
  sounds: z.array(SoundResourceSchema)
})

const ObjectSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  spriteId: z.string().nullable(),
  x: z.number(),
  y: z.number(),
  speed: z.number(),
  direction: z.number()
})

const RoomInstanceSchema = z.object({
  id: z.string().min(1),
  objectId: z.string().min(1),
  x: z.number(),
  y: z.number()
})

const RoomSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  instances: z.array(RoomInstanceSchema)
})

const ProjectMetricsSchema = z.object({
  appStart: z.number().int().nonnegative().default(0),
  projectLoad: z.number().int().nonnegative().default(0),
  runtimeErrors: z.number().int().nonnegative().default(0),
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
      id: crypto.randomUUID(),
      name,
      locale: "ca",
      createdAtIso: new Date().toISOString()
    },
    resources: {
      sprites: [],
      sounds: []
    },
    objects: [],
    rooms: [],
    scenes: [],
    metrics: {
      appStart: 0,
      projectLoad: 0,
      runtimeErrors: 0,
      timeToFirstPlayableFunMs: null
    }
  }
}
