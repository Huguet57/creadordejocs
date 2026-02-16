import { cursorCourierTemplateProject } from "./cursor-courier-template.project.js"
import type { TemplateProjectResult } from "./types.js"

export function createCursorCourierTemplateProject(): TemplateProjectResult {
  const project = structuredClone(cursorCourierTemplateProject)

  return {
    project,
    roomId: "room-ce025869-75db-47e4-901d-d3dcc27c8305",
    focusObjectId: "object-baa05638-aa4f-4366-94a4-a1aee5d003ac"
  }
}
