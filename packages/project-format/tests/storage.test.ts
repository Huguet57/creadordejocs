import { describe, expect, it } from "vitest"
import {
  createEmptyProjectV1,
  loadProjectV1,
  parseProjectV1,
  serializeProjectV1,
  setTimeToFirstPlayableFunMs
} from "../src/index.js"

describe("project format v1", () => {
  it("serializes and parses a valid project", () => {
    const project = createEmptyProjectV1("Test project")
    const source = serializeProjectV1(project)
    const loaded = parseProjectV1(source)

    expect(loaded.version).toBe(1)
    expect(loaded.metadata.locale).toBe("ca")
    expect(loaded.metadata.name).toBe("Test project")
  })

  it("rejects invalid payloads", () => {
    const invalid = JSON.stringify({ version: 2 })
    expect(() => parseProjectV1(invalid)).toThrow()
  })

  it("increments projectLoad when loading from storage helper", () => {
    const project = createEmptyProjectV1("Load metrics")
    const source = serializeProjectV1(project)
    const loaded = loadProjectV1(source)

    expect(loaded.metrics.projectLoad).toBe(1)
  })

  it("stores timeToFirstPlayableFun only once", () => {
    const project = createEmptyProjectV1("Telemetry baseline")
    const first = setTimeToFirstPlayableFunMs(project, 1200)
    const second = setTimeToFirstPlayableFunMs(first, 900)

    expect(first.metrics.timeToFirstPlayableFunMs).toBe(1200)
    expect(second.metrics.timeToFirstPlayableFunMs).toBe(1200)
  })

  it("loads legacy payloads without variables using schema defaults", () => {
    const project = createEmptyProjectV1("Legacy")
    const legacySource = JSON.stringify({
      ...project,
      variables: undefined
    })
    const loaded = parseProjectV1(legacySource)

    expect(loaded.variables.global).toEqual([])
    expect(loaded.variables.objectByObjectId).toEqual({})
  })

  it("parses event items containing an if block", () => {
    const project = createEmptyProjectV1("If items")
    const source = JSON.stringify({
      ...project,
      objects: [
        {
          id: "object-player",
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
              targetObjectId: null,
              intervalMs: null,
              items: [
                {
                  id: "if-1",
                  type: "if",
                  condition: {
                    left: { scope: "global", variableId: "global-score" },
                    operator: ">=",
                    right: 10
                  },
                  actions: [{ id: "action-score", type: "changeScore", delta: 1 }]
                }
              ]
            }
          ]
        }
      ]
    })
    const loaded = parseProjectV1(source)
    const firstItem = loaded.objects[0]?.events[0]?.items[0]

    expect(firstItem?.type).toBe("if")
    if (firstItem?.type !== "if") {
      throw new Error("Expected if item")
    }
    expect(firstItem.condition.operator).toBe(">=")
    expect(firstItem.actions).toHaveLength(1)
  })

  it("loads legacy payloads using actions[] and normalizes them to items[]", () => {
    const project = createEmptyProjectV1("Legacy actions")
    const legacySource = JSON.stringify({
      ...project,
      objects: [
        {
          id: "object-player",
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
              targetObjectId: null,
              intervalMs: null,
              actions: [{ id: "action-move", type: "move", dx: 3, dy: 4 }]
            }
          ]
        }
      ]
    })

    const loaded = parseProjectV1(legacySource)
    const eventEntry = loaded.objects[0]?.events[0]
    const firstItem = eventEntry?.items[0]

    expect(eventEntry).toBeDefined()
    expect(firstItem?.type).toBe("action")
    if (firstItem?.type !== "action") {
      throw new Error("Expected action item")
    }
    expect(firstItem.action.type).toBe("move")
    if (firstItem.action.type === "move") {
      expect(firstItem.action.dx).toBe(3)
    }
    expect(serializeProjectV1(loaded)).toContain("\"items\"")
    expect(serializeProjectV1(loaded)).not.toContain("\"actions\"")
  })
})
