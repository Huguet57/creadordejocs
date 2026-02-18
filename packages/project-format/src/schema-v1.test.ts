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

describe("schema v1 room folders", () => {
  it("parses a project with roomFolders in resources", () => {
    const project = createEmptyProjectV1("Room folders")
    ;(project.resources as Record<string, unknown>).roomFolders = [
      { id: "rf-1", name: "World 1", parentId: null }
    ]

    const parsed = ProjectSchemaV1.parse(project)
    expect(parsed.resources.roomFolders).toHaveLength(1)
    expect(parsed.resources.roomFolders![0]!.name).toBe("World 1")
  })

  it("parses a project with folderId on a room", () => {
    const project = createEmptyProjectV1("Room with folder")
    ;(project.resources as Record<string, unknown>).roomFolders = [
      { id: "rf-1", name: "World 1", parentId: null }
    ]
    project.rooms = [
      { id: "room-1", name: "Level 1", folderId: "rf-1", instances: [] }
    ]

    const parsed = ProjectSchemaV1.parse(project)
    expect(parsed.rooms[0]!.folderId).toBe("rf-1")
  })

  it("parses rooms with width and height", () => {
    const project = createEmptyProjectV1("Room size")
    project.rooms = [
      { id: "room-1", name: "Level 1", width: 1200, height: 700, instances: [] } as typeof project.rooms[number]
    ]

    const parsed = ProjectSchemaV1.parse(project)
    expect(parsed.rooms[0]!.width).toBe(1200)
    expect(parsed.rooms[0]!.height).toBe(700)
  })

  it("parses a legacy project without roomFolders", () => {
    const project = createEmptyProjectV1("Legacy")
    // Explicitly remove roomFolders to simulate legacy data
    delete (project.resources as Record<string, unknown>).roomFolders

    const parsed = ProjectSchemaV1.parse(project)
    expect(parsed.resources.roomFolders).toBeUndefined()
  })

  it("parses a legacy room without folderId", () => {
    const project = createEmptyProjectV1("Legacy rooms")
    project.rooms = [
      { id: "room-1", name: "Sala 1", instances: [] } as typeof project.rooms[number]
    ]

    const parsed = ProjectSchemaV1.parse(project)
    expect(parsed.rooms[0]!.folderId).toBeUndefined()
  })

  it("parses a legacy room without width and height", () => {
    const project = createEmptyProjectV1("Legacy room size")
    project.rooms = [
      { id: "room-1", name: "Sala 1", folderId: null, instances: [] } as typeof project.rooms[number]
    ]

    const parsed = ProjectSchemaV1.parse(project)
    expect(parsed.rooms[0]!.width).toBeUndefined()
    expect(parsed.rooms[0]!.height).toBeUndefined()
  })
})
