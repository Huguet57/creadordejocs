import { createBatteryCourierTemplateProject } from "./battery-courier-template.js"
import { createCoinDashTemplateProject } from "./coin-dash-template.js"
import { createLaneCrosserTemplateProject } from "./lane-crosser-template.js"
import { createMineResetTemplateProject } from "./mine-reset-template.js"
import { createSpaceShooterTemplateProject } from "./space-shooter-template.js"
import { createSwitchVaultTemplateProject } from "./switch-vault-template.js"
import type { GameTemplateId, TemplateProjectResult } from "./types.js"

export const GAME_TEMPLATES = [
  {
    id: "coin-dash",
    name: "Coin Dash",
    description: "Collect the coin and avoid enemies. Great intro to score and collisions.",
    difficulty: "starter"
  },
  {
    id: "space-shooter",
    name: "Space Shooter",
    description: "Move your ship and shoot asteroids with Space. Arcade action basics.",
    difficulty: "starter"
  },
  {
    id: "lane-crosser",
    name: "Lane Crosser",
    description: "Cross traffic lanes and reach the goal zone safely.",
    difficulty: "starter"
  },
  {
    id: "battery-courier",
    name: "Battery Courier",
    description: "Carry batteries and transfer charge using object/global variable copy.",
    difficulty: "intermediate"
  },
  {
    id: "mine-reset",
    name: "Mine Reset",
    description: "Collect chips and survive mines that force a full room restart.",
    difficulty: "intermediate"
  },
  {
    id: "switch-vault",
    name: "Switch Vault",
    description: "Toggle the control switch and travel to the vault only when it is unlocked.",
    difficulty: "intermediate"
  }
] as const

export function createTemplateProject(templateId: GameTemplateId): TemplateProjectResult {
  if (templateId === "coin-dash") {
    return createCoinDashTemplateProject()
  }
  if (templateId === "space-shooter") {
    return createSpaceShooterTemplateProject()
  }
  if (templateId === "lane-crosser") {
    return createLaneCrosserTemplateProject()
  }
  if (templateId === "battery-courier") {
    return createBatteryCourierTemplateProject()
  }
  if (templateId === "mine-reset") {
    return createMineResetTemplateProject()
  }
  return createSwitchVaultTemplateProject()
}

export type { GameTemplateDefinition, GameTemplateId, TemplateProjectResult } from "./types.js"
