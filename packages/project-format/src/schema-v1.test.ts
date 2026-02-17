import { describe, expect, it } from "vitest"
import { ProjectSchemaV1, createEmptyProjectV1 } from "./schema-v1.js"

describe("schema v1 collections", () => {
  it("accepts list and map variable definitions", () => {
    const project = createEmptyProjectV1("Collections")
    project.variables.global = [
      {
        id: "numbers",
        name: "numbers",
        type: "list",
        itemType: "number",
        initialValue: [1, 2, 3]
      },
      {
        id: "flags",
        name: "flags",
        type: "map",
        itemType: "boolean",
        initialValue: { a: true, b: false }
      }
    ]

    const parsed = ProjectSchemaV1.parse(project)
    expect(parsed.variables.global).toHaveLength(2)
  })

  it("rejects list values with mismatched itemType", () => {
    const project = createEmptyProjectV1("Bad list")
    project.variables.global = [
      {
        id: "mixed",
        name: "mixed",
        type: "list",
        itemType: "number",
        initialValue: [1, "oops"]
      }
    ]

    expect(() => ProjectSchemaV1.parse(project)).toThrow()
  })

  it("rejects map values with mismatched itemType", () => {
    const project = createEmptyProjectV1("Bad map")
    project.variables.global = [
      {
        id: "stats",
        name: "stats",
        type: "map",
        itemType: "string",
        initialValue: { hp: "10", mp: 2 }
      }
    ]

    expect(() => ProjectSchemaV1.parse(project)).toThrow()
  })
})
