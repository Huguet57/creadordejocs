import { createBatteryCourierTemplateProject } from "./battery-courier-template.js"
import { createCoinDashTemplateProject } from "./coin-dash-template.js"
import { createCursorCourierTemplateProject } from "./cursor-courier-template.js"
import { createLaneCrosserTemplateProject } from "./lane-crosser-template.js"
import { createMineResetTemplateProject } from "./mine-reset-template.js"
import { createSpaceShooterTemplateProject } from "./space-shooter-template.js"
import { createSwitchVaultTemplateProject } from "./switch-vault-template.js"
import { createTurretGauntletTemplateProject } from "./turret-gauntlet-template.js"
import { createVaultCalibratorTemplateProject } from "./vault-calibrator-template.js"
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
  },
  {
    id: "turret-gauntlet",
    name: "Turret Gauntlet",
    description: "Aim with the mouse and click to survive incoming drone waves.",
    difficulty: "advanced"
  },
  {
    id: "cursor-courier",
    name: "Cursor Courier",
    description: "Guide deliveries with mouse movement and hold-to-boost bursts.",
    difficulty: "advanced"
  },
  {
    id: "vault-calibrator",
    name: "Vault Calibrator",
    description: "Calibrate the lock by clicking the right mouse zone, then escape.",
    difficulty: "advanced"
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
  if (templateId === "switch-vault") {
    return createSwitchVaultTemplateProject()
  }
  if (templateId === "turret-gauntlet") {
    return createTurretGauntletTemplateProject()
  }
  if (templateId === "cursor-courier") {
    return createCursorCourierTemplateProject()
  }
  return createVaultCalibratorTemplateProject()
}

export type { GameTemplateDefinition, GameTemplateId, TemplateProjectResult } from "./types.js"
