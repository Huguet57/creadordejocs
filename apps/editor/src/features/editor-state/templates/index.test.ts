import { readFileSync } from "node:fs"
import { dirname, resolve } from "node:path"
import { fileURLToPath } from "node:url"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { createTemplateProject, GAME_TEMPLATES } from "./index.js"
import type { GameTemplateId } from "./types.js"

const INTERMEDIATE_TEMPLATE_IDS: GameTemplateId[] = [
  "switch-vault",
  "cursor-courier"
]
const ADVANCED_TEMPLATE_IDS: GameTemplateId[] = ["pokemon-explorer"]
const ELSE_ENABLED_TEMPLATE_IDS: GameTemplateId[] = [
  "lane-crosser",
  "switch-vault",
  "cursor-courier",
  "pokemon-explorer"
]
const NESTED_IF_TEMPLATE_IDS: GameTemplateId[] = []
const DISTRIBUTED_LOGIC_TEMPLATE_IDS: GameTemplateId[] = ["switch-vault", "pokemon-explorer"]

const templatesDir = dirname(fileURLToPath(import.meta.url))
const pokemonTemplatePath = resolve(templatesDir, "../../../../public/templates/pokemon-explorer-template.project.json")
const pokemonTemplateRaw = JSON.parse(readFileSync(pokemonTemplatePath, "utf-8")) as unknown
const originalFetch = globalThis.fetch

async function projectHasIfBlocks(templateId: GameTemplateId): Promise<boolean> {
  const created = await createTemplateProject(templateId)
  return created.project.objects.some((objectEntry) =>
    objectEntry.events.some((eventEntry) => eventEntry.items.some((itemEntry) => itemEntry.type === "if"))
  )
}

type EventItems = Awaited<ReturnType<typeof createTemplateProject>>["project"]["objects"][number]["events"][number]["items"]

function getItemBranches(itemEntry: EventItems[number]): EventItems[] {
  if (itemEntry.type === "if") return [itemEntry.thenActions, itemEntry.elseActions]
  if (itemEntry.type === "repeat" || itemEntry.type === "forEachList" || itemEntry.type === "forEachMap") return [itemEntry.actions]
  return []
}

function itemsContainActionType(items: EventItems, actionType: string): boolean {
  return items.some((itemEntry) => {
    if (itemEntry.type === "action") {
      return itemEntry.action.type === actionType
    }
    return getItemBranches(itemEntry).some((branch) => itemsContainActionType(branch, actionType))
  })
}

function collectActionTypes(items: EventItems, target: Set<string>): void {
  for (const itemEntry of items) {
    if (itemEntry.type === "action") {
      target.add(itemEntry.action.type)
    } else {
      for (const branch of getItemBranches(itemEntry)) {
        collectActionTypes(branch, target)
      }
    }
  }
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
  beforeEach(() => {
    globalThis.fetch = vi.fn((input: RequestInfo | URL) => {
      const requestUrl =
        typeof input === "string" ? input : input instanceof URL ? input.toString() : input.url
      if (requestUrl.endsWith("/templates/pokemon-explorer-template.project.json")) {
        return Promise.resolve(new Response(JSON.stringify(pokemonTemplateRaw), { status: 200 }))
      }
      return Promise.resolve(new Response("template not found", { status: 404 }))
    }) as typeof fetch
  })

  afterEach(() => {
    globalThis.fetch = originalFetch
    vi.restoreAllMocks()
  })

  it("exposes exactly two intermediate templates", () => {
    const intermediate = GAME_TEMPLATES.filter((entry) => entry.difficulty === "intermediate")

    expect(intermediate).toHaveLength(2)
    expect(intermediate.map((entry) => entry.id)).toEqual(INTERMEDIATE_TEMPLATE_IDS)
  })

  it.each(INTERMEDIATE_TEMPLATE_IDS)("builds %s with conditionals and a playable room", async (templateId) => {
    const created = await createTemplateProject(templateId)

    expect(created.project.rooms.length).toBeGreaterThan(0)
    expect(created.project.objects.some((entry) => entry.id === created.focusObjectId)).toBe(true)
    expect(await projectHasIfBlocks(templateId)).toBe(true)
  })

  it("exposes exactly one advanced template", () => {
    const advanced = GAME_TEMPLATES.filter((entry) => entry.difficulty === "advanced")

    expect(advanced).toHaveLength(1)
    expect(advanced.map((entry) => entry.id)).toEqual(ADVANCED_TEMPLATE_IDS)
  })

  it.each(ADVANCED_TEMPLATE_IDS)("builds %s with multiple rooms and conditionals", async (templateId) => {
    const created = await createTemplateProject(templateId)
    const actionTypes = new Set<string>()
    for (const objectEntry of created.project.objects) {
      for (const eventEntry of objectEntry.events) {
        collectActionTypes(eventEntry.items, actionTypes)
      }
    }

    expect(created.project.rooms.length).toBeGreaterThan(1)
    expect(created.project.objects.some((entry) => entry.id === created.focusObjectId)).toBe(true)
    expect(await projectHasIfBlocks(templateId)).toBe(true)
    expect(actionTypes.has("goToRoom")).toBe(true)
  })

  it.each([["switch-vault", "goToRoom"]] as const)("builds %s with distinctive action %s", async (templateId, actionType) => {
    const created = await createTemplateProject(templateId)
    const hasAction = created.project.objects.some((objectEntry) =>
      objectEntry.events.some((eventEntry) => itemsContainActionType(eventEntry.items, actionType))
    )

    expect(hasAction).toBe(true)
  })

  it.each(DISTRIBUTED_LOGIC_TEMPLATE_IDS)("distributes runtime logic beyond the focus object for %s", async (templateId) => {
    const created = await createTemplateProject(templateId)
    const nonFocusObjectsWithEvents = created.project.objects.filter(
      (objectEntry) => objectEntry.id !== created.focusObjectId && objectEntry.events.length > 0
    )

    expect(nonFocusObjectsWithEvents.length).toBeGreaterThanOrEqual(2)
  })

  it.each(ELSE_ENABLED_TEMPLATE_IDS)("builds %s with at least one populated else branch", async (templateId) => {
    const created = await createTemplateProject(templateId)
    const hasElseActions = created.project.objects.some((objectEntry) =>
      objectEntry.events.some((eventEntry) =>
        eventEntry.items.some((itemEntry) => itemEntry.type === "if" && itemEntry.elseActions.length > 0)
      )
    )

    expect(hasElseActions).toBe(true)
  })

  it.each(NESTED_IF_TEMPLATE_IDS)("builds %s with at least one nested if block", async (templateId) => {
    const created = await createTemplateProject(templateId)
    const hasNestedIf = created.project.objects.some((objectEntry) =>
      objectEntry.events.some((eventEntry) => itemsContainNestedIf(eventEntry.items))
    )

    expect(hasNestedIf).toBe(true)
  })

  it.each(GAME_TEMPLATES.map((entry) => entry.id))("builds %s without obsolete playSound actions", async (templateId) => {
    const created = await createTemplateProject(templateId)
    const hasPlaySound = created.project.objects.some((objectEntry) =>
      objectEntry.events.some((eventEntry) => itemsContainActionType(eventEntry.items, "playSound"))
    )

    expect(hasPlaySound).toBe(false)
  })
})
