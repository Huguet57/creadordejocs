import { ProjectSchemaV1, type ProjectV1 } from "./schema-v1.js"
import { incrementMetric } from "./metrics.js"

export function serializeProjectV1(project: ProjectV1): string {
  return JSON.stringify(project)
}

export function parseProjectV1(source: string): ProjectV1 {
  const parsed = JSON.parse(source) as unknown
  return ProjectSchemaV1.parse(parsed)
}

export function loadProjectV1(source: string): ProjectV1 {
  const project = parseProjectV1(source)
  return incrementMetric(project, "projectLoad")
}
