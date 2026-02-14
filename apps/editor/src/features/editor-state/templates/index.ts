import { createCoinDashTemplateProject } from "./coin-dash-template.js"
import { createDodgeTemplateProject } from "./dodge-template.js"
import { createLaneCrosserTemplateProject } from "./lane-crosser-template.js"
import { createSpaceShooterTemplateProject } from "./space-shooter-template.js"
import type { GameTemplateId, TemplateProjectResult } from "./types.js"

export const GAME_TEMPLATES = [
  {
    id: "dodge",
    name: "Dodge Arena",
    description: "Survive while enemies move across the room. Arrow keys to dodge."
  },
  {
    id: "coin-dash",
    name: "Coin Dash",
    description: "Collect the coin and avoid enemies. Great intro to score and collisions."
  },
  {
    id: "space-shooter",
    name: "Space Shooter",
    description: "Move your ship and shoot asteroids with Space. Arcade action basics."
  },
  {
    id: "lane-crosser",
    name: "Lane Crosser",
    description: "Cross traffic lanes and reach the goal zone safely."
  }
] as const

export function createTemplateProject(templateId: GameTemplateId): TemplateProjectResult {
  if (templateId === "dodge") {
    return createDodgeTemplateProject()
  }
  if (templateId === "coin-dash") {
    return createCoinDashTemplateProject()
  }
  if (templateId === "space-shooter") {
    return createSpaceShooterTemplateProject()
  }
  return createLaneCrosserTemplateProject()
}

export type { GameTemplateDefinition, GameTemplateId, TemplateProjectResult } from "./types.js"
