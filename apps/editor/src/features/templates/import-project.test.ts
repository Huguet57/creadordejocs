import { createEmptyProjectV1, serializeProjectV1 } from "@creadordejocs/project-format"
import { describe, expect, it, vi } from "vitest"
import { importProjectFromFile, readProjectFileAsText } from "./import-project.js"

describe("readProjectFileAsText", () => {
  it("reads file text content", async () => {
    const file = new File(["hello"], "project.json", { type: "application/json" })

    await expect(readProjectFileAsText(file)).resolves.toBe("hello")
  })
})

describe("importProjectFromFile", () => {
  it("loads a full ProjectV1 payload from JSON file", async () => {
    const project = createEmptyProjectV1("Projecte importat")
    const file = new File([serializeProjectV1(project)], "project.json", { type: "application/json" })

    const loaded = await importProjectFromFile(file)

    expect(loaded.metadata.name).toBe("Projecte importat")
    expect(loaded.version).toBe(1)
    expect(loaded.resources.sprites).toEqual(project.resources.sprites)
    expect(loaded.objects).toEqual(project.objects)
    expect(loaded.rooms).toEqual(project.rooms)
  })

  it("propagates parse errors for invalid JSON payloads", async () => {
    const file = new File(["{"], "broken.json", { type: "application/json" })

    await expect(importProjectFromFile(file)).rejects.toBeInstanceOf(Error)
  })

  it("uses provided reader and parser dependencies", async () => {
    const parser = vi.fn().mockReturnValue(createEmptyProjectV1("Mocked"))
    const reader = vi.fn().mockResolvedValue("{\"version\":1}")
    const file = new File(["ignored"], "mock.json", { type: "application/json" })

    const loaded = await importProjectFromFile(file, { readText: reader, parseProject: parser })

    expect(reader).toHaveBeenCalledWith(file)
    expect(parser).toHaveBeenCalledWith("{\"version\":1}")
    expect(loaded.metadata.name).toBe("Mocked")
  })
})
