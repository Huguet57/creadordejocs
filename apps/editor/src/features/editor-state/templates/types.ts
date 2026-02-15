import type { ProjectV1 } from "@creadordejocs/project-format"

export type GameTemplateId =
  | "coin-dash"
  | "space-shooter"
  | "lane-crosser"
  | "battery-courier"
  | "mine-reset"
  | "switch-vault"

export type TemplateDifficulty = "starter" | "intermediate"

export type GameTemplateDefinition = {
  id: GameTemplateId
  name: string
  description: string
  difficulty: TemplateDifficulty
}

export type TemplateProjectResult = {
  project: ProjectV1
  roomId: string
  focusObjectId: string
}
