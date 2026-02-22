import { ProjectSchemaV1 } from "@creadordejocs/project-format"
import type { TemplateProjectResult } from "./types.js"

export async function createPokemonExplorerTemplateProject(): Promise<TemplateProjectResult> {
  const { default: raw } = await import("./pokemon-explorer-template.project.json")
  const project = ProjectSchemaV1.parse(raw)

  return {
    project,
    roomId: "room-r1",
    focusObjectId: "object-o1"
  }
}
