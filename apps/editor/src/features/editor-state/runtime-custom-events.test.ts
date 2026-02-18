import { describe, expect, it } from "vitest"
import type { ProjectV1 } from "@creadordejocs/project-format"
import { createInitialRuntimeState, runRuntimeTick } from "./runtime.js"

function createCustomEventProject(opts: {
  emitterEventName?: string
  listenerEventName?: string
  sourceObjectId?: string | null
} = {}): ProjectV1 {
  const emitterEventName = opts.emitterEventName ?? "damage"
  const listenerEventName = opts.listenerEventName ?? "damage"
  const sourceObjectId = opts.sourceObjectId === undefined ? null : opts.sourceObjectId
  return {
    version: 1,
    metadata: {
      id: "project-custom-events",
      name: "Custom events test",
      locale: "ca",
      createdAtIso: new Date().toISOString()
    },
    resources: { sprites: [], sounds: [] },
    variables: { global: [], objectByObjectId: {} },
    objects: [
      {
        id: "object-emitter",
        name: "Emitter",
        spriteId: null,
        x: 0, y: 0, speed: 0, direction: 0,
        events: [
          {
            id: "event-step-emit",
            type: "Step",
            key: null,
            targetObjectId: null,
            intervalMs: null,
            items: [
              {
                id: "item-emit",
                type: "action",
                action: {
                  id: "action-emit",
                  type: "emitCustomEvent",
                  eventName: emitterEventName,
                  payload: 42
                }
              }
            ]
          }
        ]
      },
      {
        id: "object-listener",
        name: "Listener",
        spriteId: null,
        x: 100, y: 100, speed: 0, direction: 0,
        events: [
          {
            id: "event-custom",
            type: "CustomEvent",
            key: null,
            targetObjectId: null,
            intervalMs: null,
            eventName: listenerEventName,
            sourceObjectId,
            items: [
              {
                id: "item-score",
                type: "action",
                action: { id: "action-score", type: "changeScore", delta: 1 }
              }
            ]
          }
        ]
      }
    ],
    rooms: [
      {
        id: "room-main",
        name: "Main",
        instances: [
          { id: "instance-emitter", objectId: "object-emitter", x: 0, y: 0 },
          { id: "instance-listener", objectId: "object-listener", x: 100, y: 100 }
        ]
      }
    ],
    scenes: [],
    metrics: {
      appStart: 0, projectLoad: 0, runtimeErrors: 0,
      tutorialCompletion: 0, stuckRate: 0, timeToFirstPlayableFunMs: null
    }
  } as ProjectV1
}

function createMultiEmitProject(emitCount: number): ProjectV1 {
  const emitActions = Array.from({ length: emitCount }, (_, i) => ({
    id: `item-emit-${i}`,
    type: "action" as const,
    action: {
      id: `action-emit-${i}`,
      type: "emitCustomEvent" as const,
      eventName: "ping",
      payload: i + 1
    }
  }))

  return {
    version: 1,
    metadata: {
      id: "project-multi-emit",
      name: "Multi emit test",
      locale: "ca",
      createdAtIso: new Date().toISOString()
    },
    resources: { sprites: [], sounds: [] },
    variables: { global: [], objectByObjectId: {} },
    objects: [
      {
        id: "object-emitter",
        name: "Emitter",
        spriteId: null,
        x: 0, y: 0, speed: 0, direction: 0,
        events: [
          {
            id: "event-step-emit",
            type: "Step",
            key: null,
            targetObjectId: null,
            intervalMs: null,
            items: emitActions
          }
        ]
      },
      {
        id: "object-listener",
        name: "Listener",
        spriteId: null,
        x: 100, y: 100, speed: 0, direction: 0,
        events: [
          {
            id: "event-custom-all",
            type: "CustomEvent",
            key: null,
            targetObjectId: null,
            intervalMs: null,
            eventName: "ping",
            sourceObjectId: null,
            items: [
              {
                id: "item-score",
                type: "action",
                action: { id: "action-score", type: "changeScore", delta: 1 }
              }
            ]
          }
        ]
      }
    ],
    rooms: [
      {
        id: "room-main",
        name: "Main",
        instances: [
          { id: "instance-emitter", objectId: "object-emitter", x: 0, y: 0 },
          { id: "instance-listener", objectId: "object-listener", x: 100, y: 100 }
        ]
      }
    ],
    scenes: [],
    metrics: {
      appStart: 0, projectLoad: 0, runtimeErrors: 0,
      tutorialCompletion: 0, stuckRate: 0, timeToFirstPlayableFunMs: null
    }
  } as ProjectV1
}

describe("Custom Events", () => {
  it("emitCustomEvent triggers CustomEvent listener with matching eventName", () => {
    const project = createCustomEventProject()
    const runtime = createInitialRuntimeState(project)
    const result = runRuntimeTick(project, "room-main", new Set(), runtime)
    expect(result.runtime.score).toBe(1)
  })

  it("does not trigger listener when eventName does not match", () => {
    const project = createCustomEventProject({
      emitterEventName: "damage",
      listenerEventName: "heal"
    })
    const runtime = createInitialRuntimeState(project)
    const result = runRuntimeTick(project, "room-main", new Set(), runtime)
    expect(result.runtime.score).toBe(0)
  })

  it("fires once per queued event when multiple events emitted", () => {
    const project = createMultiEmitProject(3)
    const runtime = createInitialRuntimeState(project)
    const result = runRuntimeTick(project, "room-main", new Set(), runtime)
    expect(result.runtime.score).toBe(3)
  })

  it("filters by sourceObjectId when specified", () => {
    const project = createCustomEventProject({
      sourceObjectId: "object-other"
    })
    const runtime = createInitialRuntimeState(project)
    const result = runRuntimeTick(project, "room-main", new Set(), runtime)
    expect(result.runtime.score).toBe(0)
  })

  it("matches sourceObjectId when it matches emitter object", () => {
    const project = createCustomEventProject({
      sourceObjectId: "object-emitter"
    })
    const runtime = createInitialRuntimeState(project)
    const result = runRuntimeTick(project, "room-main", new Set(), runtime)
    expect(result.runtime.score).toBe(1)
  })

  it("events are cleared after dispatch (no re-trigger on next tick)", () => {
    const project = createCustomEventProject()
    const runtime = createInitialRuntimeState(project)
    const result1 = runRuntimeTick(project, "room-main", new Set(), runtime)
    expect(result1.runtime.score).toBe(1)

    const result2 = runRuntimeTick(result1.project, "room-main", new Set(), result1.runtime)
    expect(result2.runtime.score).toBe(2)
  })

  it("no custom events means no dispatch impact", () => {
    const project: ProjectV1 = {
      version: 1,
      metadata: {
        id: "project-no-custom",
        name: "No custom test",
        locale: "ca",
        createdAtIso: new Date().toISOString()
      },
      resources: { sprites: [], sounds: [] },
      variables: { global: [], objectByObjectId: {} },
      objects: [
        {
          id: "object-simple",
          name: "Simple",
          spriteId: null,
          x: 0, y: 0, speed: 0, direction: 0,
          events: [
            {
              id: "event-step",
              type: "Step",
              key: null,
              targetObjectId: null,
              intervalMs: null,
              items: [
                {
                  id: "item-score",
                  type: "action",
                  action: { id: "action-score", type: "changeScore", delta: 5 }
                }
              ]
            }
          ]
        }
      ],
      rooms: [
        {
          id: "room-main",
          name: "Main",
          instances: [{ id: "instance-simple", objectId: "object-simple", x: 0, y: 0 }]
        }
      ],
      scenes: [],
      metrics: {
        appStart: 0, projectLoad: 0, runtimeErrors: 0,
        tutorialCompletion: 0, stuckRate: 0, timeToFirstPlayableFunMs: null
      }
    } as ProjectV1

    const runtime = createInitialRuntimeState(project)
    const result = runRuntimeTick(project, "room-main", new Set(), runtime)
    expect(result.runtime.score).toBe(5)
  })
})
