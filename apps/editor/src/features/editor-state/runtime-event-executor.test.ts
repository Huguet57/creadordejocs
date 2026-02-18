import { describe, expect, it } from "vitest"
import type { ProjectV1 } from "@creadordejocs/project-format"
import { createInitialRuntimeState } from "./runtime.js"
import { runEventItems } from "./runtime-event-executor.js"
import { ROOM_HEIGHT, ROOM_WIDTH } from "./runtime-types.js"

type RuntimeEventItem = ProjectV1["objects"][number]["events"][number]["items"][number]

function createProjectWithItems(
  items: RuntimeEventItem[],
  globalVariables: ProjectV1["variables"]["global"] = []
): ProjectV1 {
  return {
    version: 1,
    metadata: {
      id: "runtime-event-executor-project",
      name: "Runtime event executor",
      locale: "ca",
      createdAtIso: new Date().toISOString()
    },
    resources: {
      sprites: [],
      sounds: []
    },
    variables: {
      global: globalVariables,
      objectByObjectId: {}
    },
    objects: [
      {
        id: "object-actor",
        name: "Actor",
        spriteId: null,
        x: 0,
        y: 0,
        speed: 0,
        direction: 0,
        events: [
          {
            id: "event-step",
            type: "Step",
            key: null,
            keyboardMode: null,
            targetObjectId: null,
            intervalMs: null,
            items
          }
        ]
      }
    ],
    rooms: [{ id: "room-main", name: "Main", instances: [{ id: "instance-actor", objectId: "object-actor", x: 0, y: 0 }] }],
    scenes: [],
    metrics: {
      appStart: 0,
      projectLoad: 0,
      runtimeErrors: 0,
      tutorialCompletion: 0,
      stuckRate: 0,
      timeToFirstPlayableFunMs: null
    }
  }
}

function runItems(
  project: ProjectV1,
  items: RuntimeEventItem[],
  runtime: ReturnType<typeof createInitialRuntimeState>
) {
  const room = project.rooms[0]
  if (!room) {
    throw new Error("Missing room")
  }
  const instance = room.instances[0]
  if (!instance) {
    throw new Error("Missing actor instance")
  }
  return runEventItems(
    project,
    room.id,
    ROOM_WIDTH,
    ROOM_HEIGHT,
    instance,
    items,
    runtime,
    { x: instance.x, y: instance.y },
    null,
    room.instances
  )
}

describe("runtime event executor", () => {
  it("executes sequential action items in order", () => {
    const items: RuntimeEventItem[] = [
      {
        id: "item-change-sprite",
        type: "action",
        action: { id: "action-change-sprite", type: "changeSprite", spriteId: "sprite-up", target: "self" }
      },
      {
        id: "item-move",
        type: "action",
        action: { id: "action-move", type: "move", dx: 5, dy: 0 }
      }
    ]
    const project = createProjectWithItems(items)
    const result = runItems(project, items, createInitialRuntimeState(project))

    expect(result.instance.x).toBe(5)
    expect(result.runtime.spriteOverrideByInstanceId["instance-actor"]).toBe("sprite-up")
    expect(result.halted).toBe(false)
  })

  it("halts on wait and resumes later ticks", () => {
    const items: RuntimeEventItem[] = [
      {
        id: "item-wait",
        type: "action",
        action: { id: "action-wait", type: "wait", durationMs: 200 }
      },
      {
        id: "item-score",
        type: "action",
        action: { id: "action-score", type: "changeScore", delta: 1 }
      }
    ]
    const project = createProjectWithItems(items)

    const first = runItems(project, items, createInitialRuntimeState(project))
    const second = runItems(project, items, first.runtime)
    const third = runItems(project, items, second.runtime)

    expect(first.halted).toBe(true)
    expect(second.halted).toBe(true)
    expect(third.halted).toBe(false)
    expect(third.scoreDelta).toBe(1)
  })

  it("propagates wait halt out of if blocks", () => {
    const items: RuntimeEventItem[] = [
      {
        id: "item-if",
        type: "if",
        condition: {
          left: { source: "globalVariable", variableId: "global-flag" },
          operator: "==",
          right: 1
        },
        thenActions: [{ id: "item-if-wait", type: "action", action: { id: "action-if-wait", type: "wait", durationMs: 200 } }],
        elseActions: []
      },
      {
        id: "item-after-if",
        type: "action",
        action: { id: "action-after-if", type: "changeScore", delta: 5 }
      }
    ]
    const project = createProjectWithItems(items, [{ id: "global-flag", name: "flag", type: "number", initialValue: 1 }])

    const first = runItems(project, items, createInitialRuntimeState(project))
    const second = runItems(project, items, first.runtime)
    const third = runItems(project, items, second.runtime)

    expect(first.halted).toBe(true)
    expect(first.scoreDelta).toBe(0)
    expect(third.halted).toBe(false)
    expect(third.scoreDelta).toBe(5)
  })

  it("propagates wait halt out of repeat blocks", () => {
    const items: RuntimeEventItem[] = [
      {
        id: "item-repeat",
        type: "repeat",
        count: 2,
        actions: [{ id: "item-repeat-wait", type: "action", action: { id: "action-repeat-wait", type: "wait", durationMs: 200 } }]
      },
      {
        id: "item-after-repeat",
        type: "action",
        action: { id: "action-after-repeat", type: "changeScore", delta: 5 }
      }
    ]
    const project = createProjectWithItems(items)

    const first = runItems(project, items, createInitialRuntimeState(project))
    const second = runItems(project, items, first.runtime)
    const third = runItems(project, items, second.runtime)

    expect(first.halted).toBe(true)
    expect(second.halted).toBe(true)
    expect(third.halted).toBe(true)
    expect(first.scoreDelta).toBe(0)
    expect(third.scoreDelta).toBe(0)
  })

  it("propagates wait halt out of forEachList blocks", () => {
    const items: RuntimeEventItem[] = [
      {
        id: "item-for-each",
        type: "forEachList",
        scope: "global",
        variableId: "global-list",
        itemLocalVarName: "item",
        actions: [{ id: "item-for-each-wait", type: "action", action: { id: "action-for-each-wait", type: "wait", durationMs: 200 } }]
      },
      {
        id: "item-after-for-each",
        type: "action",
        action: { id: "action-after-for-each", type: "changeScore", delta: 5 }
      }
    ]
    const project = createProjectWithItems(items, [
      { id: "global-list", name: "list", type: "list", itemType: "number", initialValue: [1, 2] }
    ])

    const first = runItems(project, items, createInitialRuntimeState(project))
    const second = runItems(project, items, first.runtime)
    const third = runItems(project, items, second.runtime)

    expect(first.halted).toBe(true)
    expect(second.halted).toBe(true)
    expect(third.halted).toBe(true)
    expect(first.scoreDelta).toBe(0)
    expect(third.scoreDelta).toBe(0)
  })
})
