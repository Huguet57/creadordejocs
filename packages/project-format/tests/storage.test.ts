import { describe, expect, it } from "vitest"
import { createEmptyProjectV1, parseProjectV1, serializeProjectV1 } from "../src/index.js"

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
})
