import { ProjectSchemaV1, type ProjectV1 } from "@creadordejocs/project-format"
import { z } from "zod"
import type { GameTemplateId } from "./types.js"

export type DataOnlyTemplate = {
  id: GameTemplateId | (string & {})
  name: string
  description: string
  project: ProjectV1
}

const DataOnlyTemplateSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  description: z.string().min(1),
  project: ProjectSchemaV1
})

const DataOnlyTemplateCollectionSchema = z.object({
  templates: z.array(DataOnlyTemplateSchema)
})

function normalizeTemplateId(templateId: string): DataOnlyTemplate["id"] {
  return templateId as DataOnlyTemplate["id"]
}

function mapTemplate(template: z.infer<typeof DataOnlyTemplateSchema>): DataOnlyTemplate {
  return {
    id: normalizeTemplateId(template.id),
    name: template.name,
    description: template.description,
    project: template.project
  }
}

export function parseDataOnlyTemplateJson(jsonText: string): DataOnlyTemplate {
  const parsed = DataOnlyTemplateSchema.parse(JSON.parse(jsonText))
  return mapTemplate(parsed)
}

export function parseDataOnlyTemplatesJson(jsonText: string): DataOnlyTemplate[] {
  const parsed = DataOnlyTemplateCollectionSchema.parse(JSON.parse(jsonText))
  return parsed.templates.map(mapTemplate)
}

export function parseDataOnlyTemplateData(data: unknown): DataOnlyTemplate {
  return mapTemplate(DataOnlyTemplateSchema.parse(data))
}

export function parseDataOnlyTemplatesData(data: unknown): DataOnlyTemplate[] {
  const parsed = DataOnlyTemplateCollectionSchema.parse(data)
  return parsed.templates.map(mapTemplate)
}
