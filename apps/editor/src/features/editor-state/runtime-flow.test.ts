import { describe, expect, it } from "vitest"
import type { ProjectV1, ObjectEventItemType } from "@creadordejocs/project-format"
import { createInitialRuntimeState, runRuntimeTick } from "./runtime.js"

function buildFlowProject(flowItem: ObjectEventItemType): ProjectV1 {
  return {
    version: 1,
    metadata: {
      id: "flow-project",
      name: "flow",
      locale: "ca",
      createdAtIso: new Date().toISOString()
    },
    resources: {
      sprites: [],
      sounds: []
    },
    variables: {
      global: [
        { id: "score", name: "score", type: "number", initialValue: 0 },
        { id: "numbers", name: "numbers", type: "list", itemType: "number", initialValue: [2, 3, 5] },
        { id: "stats", name: "stats", type: "map", itemType: "number", initialValue: { a: 4, b: 6 } }
      ],
      objectByObjectId: {}
    },
    objects: [
      {
        id: "obj-player",
        name: "Player",
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
            items: [flowItem]
          }
        ]
      }
    ],
    rooms: [{ id: "room-main", name: "Main", instances: [{ id: "inst-player", objectId: "obj-player", x: 0, y: 0 }] }],
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

describe("runtime flow items", () => {
  it("repeat executes child actions N times", () => {
    const project = buildFlowProject({
      id: "block-repeat",
      type: "repeat",
      count: 3,
      actions: [
        { id: "item-score", type: "action", action: { id: "add-score", type: "changeScore", delta: 2 } }
      ]
    })

    const result = runRuntimeTick(project, "room-main", new Set(), createInitialRuntimeState(project))
    expect(result.runtime.score).toBe(6)
  })

  it("forEachList exposes item and index locals", () => {
    const project = buildFlowProject({
      id: "block-foreach-list",
      type: "forEachList",
      scope: "global",
      variableId: "numbers",
      itemLocalVarName: "item",
      indexLocalVarName: "idx",
      actions: [
        {
          id: "item-add-item",
          type: "action",
          action: {
            id: "add-item",
            type: "changeScore",
            delta: { source: "iterationVariable", variableName: "item" }
          }
        },
        {
          id: "item-add-index",
          type: "action",
          action: {
            id: "add-index",
            type: "changeScore",
            delta: { source: "iterationVariable", variableName: "idx" }
          }
        }
      ]
    })

    const result = runRuntimeTick(project, "room-main", new Set(), createInitialRuntimeState(project))
    expect(result.runtime.score).toBe(13)
  })

  it("forEachMap exposes key and value locals", () => {
    const project = buildFlowProject({
      id: "block-foreach-map",
      type: "forEachMap",
      scope: "global",
      variableId: "stats",
      keyLocalVarName: "key",
      valueLocalVarName: "value",
      actions: [
        {
          id: "item-add-value",
          type: "action",
          action: {
            id: "add-value",
            type: "changeScore",
            delta: { source: "iterationVariable", variableName: "value" }
          }
        }
      ]
    })

    const result = runRuntimeTick(project, "room-main", new Set(), createInitialRuntimeState(project))
    expect(result.runtime.score).toBe(10)
  })

  it("repeat nested inside if block works", () => {
    const project = buildFlowProject({
      id: "block-if",
      type: "if",
      condition: { left: { source: "globalVariable", variableId: "score" }, operator: "==", right: 0 },
      thenActions: [
        {
          id: "block-repeat-nested",
          type: "repeat",
          count: 2,
          actions: [
            { id: "item-score2", type: "action", action: { id: "add-score2", type: "changeScore", delta: 5 } }
          ]
        }
      ],
      elseActions: []
    })

    const result = runRuntimeTick(project, "room-main", new Set(), createInitialRuntimeState(project))
    expect(result.runtime.score).toBe(10)
  })

  it("schema migrates old flow actions to new item format", async () => {
    const { ProjectSchemaV1 } = await import("@creadordejocs/project-format")
    const oldProject = {
      version: 1,
      metadata: { id: "test", name: "test", locale: "ca", createdAtIso: new Date().toISOString() },
      resources: { sprites: [], sounds: [] },
      variables: { global: [], objectByObjectId: {} },
      objects: [{
        id: "obj1", name: "Obj", spriteId: null, x: 0, y: 0, speed: 0, direction: 0,
        events: [{
          id: "ev1", type: "Step", key: null, targetObjectId: null, intervalMs: null,
          items: [{
            id: "item-old",
            type: "action",
            action: { id: "act-repeat", type: "repeat", count: 3, actions: [{ id: "a1", type: "changeScore", delta: 1 }] }
          }]
        }]
      }],
      rooms: [{ id: "r1", name: "Room", instances: [] }],
      scenes: [],
      metrics: { appStart: 0, projectLoad: 0, runtimeErrors: 0, tutorialCompletion: 0, stuckRate: 0, timeToFirstPlayableFunMs: null }
    }

    const parsed = ProjectSchemaV1.parse(oldProject)
    const firstItem = parsed.objects[0]!.events[0]!.items[0]!
    expect(firstItem.type).toBe("repeat")
    if (firstItem.type === "repeat") {
      expect(firstItem.count).toBe(3)
      expect(firstItem.actions).toHaveLength(1)
    }
  })
})
