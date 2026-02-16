import { laneCrosserTemplateProject } from "./lane-crosser-template.project.js"
import type { TemplateProjectResult } from "./types.js"

export function createLaneCrosserTemplateProject(): TemplateProjectResult {
  const project = structuredClone(laneCrosserTemplateProject)

  return {
    project,
    roomId: "room-daf3cc1f-5068-4e25-9cfc-9fb43e3ee47a",
    focusObjectId: "object-f35b2bbc-2906-4e22-9e1c-666fc3f0e802"
  }
}
