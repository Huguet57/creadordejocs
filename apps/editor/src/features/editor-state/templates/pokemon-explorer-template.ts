import { loadExternalTemplateProject } from "./external-template-loader.js"
import type { TemplateProjectResult } from "./types.js"

const DEFAULT_POKEMON_EXPLORER_TEMPLATE_PATH = "templates/pokemon-explorer-template.project.json"

export async function createPokemonExplorerTemplateProject(
  relativePath: string = DEFAULT_POKEMON_EXPLORER_TEMPLATE_PATH
): Promise<TemplateProjectResult> {
  const project = await loadExternalTemplateProject({
    templateId: "pokemon-explorer",
    relativePath
  })

  return {
    project,
    roomId: "room-r1",
    focusObjectId: "object-o1"
  }
}
