import { switchVaultTemplateProject } from "./switch-vault-template.project.js"
import type { TemplateProjectResult } from "./types.js"

export function createSwitchVaultTemplateProject(): TemplateProjectResult {
  const project = structuredClone(switchVaultTemplateProject)

  return {
    project,
    roomId: "room-c0f60203-652a-44b6-bfc7-437cf2416ea7",
    focusObjectId: "object-bb296afa-0fb1-409e-aada-504fb0b84bd4"
  }
}
