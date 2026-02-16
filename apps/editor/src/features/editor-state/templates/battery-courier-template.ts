import { batteryCourierTemplateProject } from "./battery-courier-template.project.js"
import type { TemplateProjectResult } from "./types.js"

export function createBatteryCourierTemplateProject(): TemplateProjectResult {
  const project = structuredClone(batteryCourierTemplateProject)

  return {
    project,
    roomId: "room-bc4cb4d2-52c6-4e30-a6cc-c6465b9b09b5",
    focusObjectId: "object-4b1fc3d1-87a0-4296-ad11-b052efd9633e"
  }
}
