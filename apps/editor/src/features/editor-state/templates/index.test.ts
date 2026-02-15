import { describe, expect, it } from "vitest"
import { createTemplateProject, GAME_TEMPLATES } from "./index.js"
import type { GameTemplateId } from "./types.js"

const INTERMEDIATE_TEMPLATE_IDS: GameTemplateId[] = [
  "battery-courier",
  "mine-reset",
  "switch-vault"
]
const ELSE_ENABLED_TEMPLATE_IDS: GameTemplateId[] = [
  "battery-courier",
  "mine-reset",
  "lane-crosser",
  "switch-vault"
]
const NESTED_IF_TEMPLATE_IDS: GameTemplateId[] = ["battery-courier", "mine-reset"]

function projectHasIfBlocks(templateId: GameTemplateId): boolean {
  const created = createTemplateProject(templateId)
  return created.project.objects.some((objectEntry) =>
    objectEntry.events.some((eventEntry) => eventEntry.items.some((itemEntry) => itemEntry.type === "if"))
  )
}

type EventItems = ReturnType<typeof createTemplateProject>["project"]["objects"][number]["events"][number]["items"]

function itemsContainActionType(items: EventItems, actionType: string): boolean {
  return items.some((itemEntry) => {
    if (itemEntry.type === "action") {
      return itemEntry.action.type === actionType
    }
    return (
      itemsContainActionType(itemEntry.thenActions, actionType) || itemsContainActionType(itemEntry.elseActions, actionType)
    )
  })
}

function itemsContainNestedIf(items: EventItems): boolean {
  return items.some(
    (itemEntry) =>
      itemEntry.type === "if" &&
      (itemEntry.thenActions.some((child) => child.type === "if") ||
        itemEntry.elseActions.some((child) => child.type === "if"))
  )
}

describe("template catalog", () => {
  it("exposes exactly three intermediate templates", () => {
    const intermediate = GAME_TEMPLATES.filter((entry) => entry.difficulty === "intermediate")

    expect(intermediate).toHaveLength(3)
    expect(intermediate.map((entry) => entry.id)).toEqual(INTERMEDIATE_TEMPLATE_IDS)
  })

  it.each(INTERMEDIATE_TEMPLATE_IDS)("builds %s with conditionals and a playable room", (templateId) => {
    const created = createTemplateProject(templateId)

    expect(created.project.rooms.length).toBeGreaterThan(0)
    expect(created.project.objects.some((entry) => entry.id === created.focusObjectId)).toBe(true)
    expect(projectHasIfBlocks(templateId)).toBe(true)
  })

  it.each([
    ["battery-courier", "copyVariable"],
    ["mine-reset", "restartRoom"],
    ["switch-vault", "goToRoom"]
  ] as const)("builds %s with distinctive action %s", (templateId, actionType) => {
    const created = createTemplateProject(templateId)
    const hasAction = created.project.objects.some((objectEntry) =>
      objectEntry.events.some((eventEntry) => itemsContainActionType(eventEntry.items, actionType))
    )

    expect(hasAction).toBe(true)
  })

  it.each(INTERMEDIATE_TEMPLATE_IDS)("distributes runtime logic beyond the focus object for %s", (templateId) => {
    const created = createTemplateProject(templateId)
    const nonFocusObjectsWithEvents = created.project.objects.filter(
      (objectEntry) => objectEntry.id !== created.focusObjectId && objectEntry.events.length > 0
    )

    expect(nonFocusObjectsWithEvents.length).toBeGreaterThanOrEqual(2)
  })

  it.each(ELSE_ENABLED_TEMPLATE_IDS)("builds %s with at least one populated else branch", (templateId) => {
    const created = createTemplateProject(templateId)
    const hasElseActions = created.project.objects.some((objectEntry) =>
      objectEntry.events.some((eventEntry) =>
        eventEntry.items.some((itemEntry) => itemEntry.type === "if" && itemEntry.elseActions.length > 0)
      )
    )

    expect(hasElseActions).toBe(true)
  })

  it.each(NESTED_IF_TEMPLATE_IDS)("builds %s with at least one nested if block", (templateId) => {
    const created = createTemplateProject(templateId)
    const hasNestedIf = created.project.objects.some((objectEntry) =>
      objectEntry.events.some((eventEntry) => itemsContainNestedIf(eventEntry.items))
    )

    expect(hasNestedIf).toBe(true)
  })
})
