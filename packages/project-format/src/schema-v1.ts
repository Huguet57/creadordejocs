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

const ProjectMetricsSchema = z.object({
  appStart: z.number().int().nonnegative().default(0),
  projectLoad: z.number().int().nonnegative().default(0),
  runtimeErrors: z.number().int().nonnegative().default(0)
})

export const ProjectSchemaV1 = z.object({
  version: z.literal(1),
  metadata: z.object({
    id: z.string().min(1),
    name: z.string().min(1),
    locale: z.literal("ca"),
    createdAtIso: z.string().datetime()
  }),
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
    scenes: [],
    metrics: {
      appStart: 0,
      projectLoad: 0,
      runtimeErrors: 0
    }
  }
}
