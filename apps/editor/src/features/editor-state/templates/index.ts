import { createCoinDashTemplateProject } from "./coin-dash-template.js"
import { createCursorCourierTemplateProject } from "./cursor-courier-template.js"
import { createLaneCrosserTemplateProject } from "./lane-crosser-template.js"
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
    id: "switch-vault",
    name: "Switch Vault",
    description: "Toggle the control switch and travel to the vault only when it is unlocked.",
    difficulty: "intermediate"
  },
  {
    id: "cursor-courier",
    name: "Cursor Courier",
    description: "Guide deliveries with mouse movement and hold-to-boost bursts.",
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
  if (templateId === "switch-vault") {
    return createSwitchVaultTemplateProject()
  }
  if (templateId === "cursor-courier") {
    return createCursorCourierTemplateProject()
  }
  return createSwitchVaultTemplateProject()
}

export type { GameTemplateDefinition, GameTemplateId, TemplateProjectResult } from "./types.js"
