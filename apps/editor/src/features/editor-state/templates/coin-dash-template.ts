import { ProjectSchemaV1 } from "@creadordejocs/project-format"
import { coinDashTemplateProject } from "./coin-dash-template.project.js"
import type { TemplateProjectResult } from "./types.js"

export function createCoinDashTemplateProject(): TemplateProjectResult {
  const project = ProjectSchemaV1.parse(coinDashTemplateProject)
  const coinsRemainingVariable = project.variables.global.find((variable) => variable.name === "coinsRemaining")
  const coinObject = project.objects.find((objectEntry) => objectEntry.name === "Coin")
  const coinCollisionEvent = coinObject?.events.find((eventEntry) => eventEntry.type === "Collision")

  if (coinsRemainingVariable && coinCollisionEvent) {
    const hasWinIfBlock = coinCollisionEvent.items.some((itemEntry) => itemEntry.type === "if")
    if (!hasWinIfBlock) {
      const destroySelfIndex = coinCollisionEvent.items.findIndex(
        (itemEntry) => itemEntry.type === "action" && itemEntry.action.type === "destroySelf"
      )
      const winIfBlock = {
        id: "if-coin-dash-win-check",
        type: "if",
        condition: {
          left: { scope: "global", variableId: coinsRemainingVariable.id },
          operator: "<=",
          right: { source: "literal", value: 0 }
        },
        thenActions: [
          {
            id: "item-coin-dash-end-game",
            type: "action",
            action: {
              id: "action-coin-dash-end-game",
              type: "endGame",
              message: { source: "literal", value: "Has recollit totes les monedes. Has guanyat!" }
            }
          }
        ],
        elseActions: []
      } as (typeof coinCollisionEvent.items)[number]
      const insertIndex = destroySelfIndex === -1 ? coinCollisionEvent.items.length : destroySelfIndex
      coinCollisionEvent.items.splice(insertIndex, 0, winIfBlock)
    }
  }

  return {
    project,
    roomId: "room-d8a841f3-88aa-48b9-ad4d-0eaa7ca5df68",
    focusObjectId: "object-26c1a67d-d6da-4da3-bd3b-fe582affd820"
  }
}
