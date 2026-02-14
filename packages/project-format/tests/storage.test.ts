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
})
