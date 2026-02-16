import { mineResetTemplateProject } from "./mine-reset-template.project.js"
import type { TemplateProjectResult } from "./types.js"

export function createMineResetTemplateProject(): TemplateProjectResult {
  const project = structuredClone(mineResetTemplateProject)

  return {
    project,
    roomId: "room-0dc28a5a-ffe7-4fe4-9243-69236f2fc475",
    focusObjectId: "object-5b61680e-b432-4618-99a8-4a97e33af79d"
  }
}
