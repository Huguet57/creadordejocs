import type { GameTemplateId } from "./types.js"

export type TemplateProjectSource =
  | {
      type: "inline"
    }
  | {
      type: "external"
      relativePath: string
    }

export const TEMPLATE_PROJECT_SOURCES: Record<GameTemplateId, TemplateProjectSource> = {
  "coin-dash": { type: "inline" },
  "space-shooter": { type: "inline" },
  "lane-crosser": { type: "inline" },
  "switch-vault": { type: "inline" },
  "cursor-courier": { type: "inline" },
  "pokemon-explorer": {
    type: "external",
    relativePath: "templates/pokemon-explorer-template.project.json"
  }
}
