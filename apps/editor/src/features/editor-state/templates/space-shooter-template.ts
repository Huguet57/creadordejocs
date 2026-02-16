import { spaceShooterTemplateProject } from "./space-shooter-template.project.js"
import type { TemplateProjectResult } from "./types.js"

export function createSpaceShooterTemplateProject(): TemplateProjectResult {
  const project = structuredClone(spaceShooterTemplateProject)

  return {
    project,
    roomId: "room-fe1911a9-b9cf-4421-ac3e-1632ff523bd7",
    focusObjectId: "object-488c73eb-af13-4a15-9397-f09594dd9925"
  }
}
