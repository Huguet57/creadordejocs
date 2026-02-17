import { describe, expect, it } from "vitest"
import type { ProjectV1 } from "@creadordejocs/project-format"
import { createInitialRuntimeState, runRuntimeTick } from "./runtime.js"

type EventAction = Extract<ProjectV1["objects"][number]["events"][number]["items"][number], { type: "action" }>["action"]

function buildFlowProject(action: EventAction): ProjectV1 {
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
            mouseMode: "down",
            targetObjectId: null,
            intervalMs: null,
            items: [{ id: "item-flow", type: "action", action }]
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

describe("runtime flow actions", () => {
  it("repeat executes child actions N times", () => {
    const project = buildFlowProject({
      id: "action-repeat",
      type: "repeat",
      count: 3,
      actions: [{ id: "add-score", type: "changeScore", delta: 2 }]
    })

    const result = runRuntimeTick(project, "room-main", new Set(), createInitialRuntimeState(project))
    expect(result.runtime.score).toBe(6)
  })

  it("forEachList exposes item and index locals", () => {
    const project = buildFlowProject({
      id: "action-foreach-list",
      type: "forEachList",
      scope: "global",
      variableId: "numbers",
      itemLocalVarName: "item",
      indexLocalVarName: "idx",
      actions: [
        {
          id: "add-item",
          type: "changeScore",
          delta: { source: "iterationVariable", variableName: "item" }
        },
        {
          id: "add-index",
          type: "changeScore",
          delta: { source: "iterationVariable", variableName: "idx" }
        }
      ]
    })

    const result = runRuntimeTick(project, "room-main", new Set(), createInitialRuntimeState(project))
    expect(result.runtime.score).toBe(13)
  })

  it("forEachMap exposes key and value locals", () => {
    const project = buildFlowProject({
      id: "action-foreach-map",
      type: "forEachMap",
      scope: "global",
      variableId: "stats",
      keyLocalVarName: "key",
      valueLocalVarName: "value",
      actions: [{ id: "add-value", type: "changeScore", delta: { source: "iterationVariable", variableName: "value" } }]
    })

    const result = runRuntimeTick(project, "room-main", new Set(), createInitialRuntimeState(project))
    expect(result.runtime.score).toBe(10)
  })
})
