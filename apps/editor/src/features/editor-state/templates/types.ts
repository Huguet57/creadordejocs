import type { ProjectV1 } from "@creadordejocs/project-format"

export type GameTemplateId = "coin-dash" | "space-shooter" | "lane-crosser"

export type GameTemplateDefinition = {
  id: GameTemplateId
  name: string
  description: string
}

export type TemplateProjectResult = {
  project: ProjectV1
  roomId: string
  focusObjectId: string
}
