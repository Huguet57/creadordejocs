import { t } from "@/i18n/index.js"
import { createCoinDashTemplateProject } from "./coin-dash-template.js"
import { createCursorCourierTemplateProject } from "./cursor-courier-template.js"
import { createLaneCrosserTemplateProject } from "./lane-crosser-template.js"
import { createPokemonExplorerTemplateProject } from "./pokemon-explorer-template.js"
import { createSpaceShooterTemplateProject } from "./space-shooter-template.js"
import { createSwitchVaultTemplateProject } from "./switch-vault-template.js"
import type { GameTemplateDefinition, GameTemplateId, TemplateProjectResult } from "./types.js"

export const GAME_TEMPLATES: readonly GameTemplateDefinition[] = [
  {
    id: "coin-dash",
    name: "Coin Dash",
    description: t("templateCoinDashDesc"),
    difficulty: "starter"
  },
  {
    id: "space-shooter",
    name: "Space Shooter",
    description: t("templateSpaceShooterDesc"),
    difficulty: "starter"
  },
  {
    id: "lane-crosser",
    name: "Lane Crosser",
    description: t("templateLaneCrosserDesc"),
    difficulty: "starter"
  },
  {
    id: "switch-vault",
    name: "Switch Vault",
    description: t("templateSwitchVaultDesc"),
    difficulty: "intermediate"
  },
  {
    id: "cursor-courier",
    name: "Cursor Courier",
    description: t("templateCursorCourierDesc"),
    difficulty: "intermediate"
  },
  {
    id: "pokemon-explorer",
    name: "Pokémon Explorer",
    description: t("templatePokemonExplorerDesc"),
    difficulty: "advanced"
  }
]

export async function createTemplateProject(templateId: GameTemplateId): Promise<TemplateProjectResult> {
  if (templateId === "coin-dash") {
    return createCoinDashTemplateProject()
  }
  if (templateId === "space-shooter") {
    return createSpaceShooterTemplateProject()
  }
  if (templateId === "lane-crosser") {
    return createLaneCrosserTemplateProject()
  }
  if (templateId === "switch-vault") {
    return createSwitchVaultTemplateProject()
  }
  if (templateId === "cursor-courier") {
    return createCursorCourierTemplateProject()
  }
  if (templateId === "pokemon-explorer") {
    return createPokemonExplorerTemplateProject()
  }
  return createSwitchVaultTemplateProject()
}

export type { GameTemplateDefinition, GameTemplateId, TemplateProjectResult } from "./types.js"
