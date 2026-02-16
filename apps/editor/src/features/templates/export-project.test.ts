import { createEmptyProjectV1, serializeProjectV1 } from "@creadordejocs/project-format"
import { describe, expect, it, vi } from "vitest"
import { createProjectExportFilename, downloadProjectAsJson } from "./export-project.js"

describe("createProjectExportFilename", () => {
  it("builds a stable filename from project name and date", () => {
    const filename = createProjectExportFilename("Joc d'ara!!!", new Date("2026-02-16T09:20:00.000Z"))

    expect(filename).toBe("joc-d-ara-2026-02-16.json")
  })

  it("uses a fallback name when project name is empty", () => {
    const filename = createProjectExportFilename("   ", new Date("2026-02-16T09:20:00.000Z"))

    expect(filename).toBe("joc-2026-02-16.json")
  })
})

describe("downloadProjectAsJson", () => {
  it("serializes the project, triggers download, and cleans up URL resources", async () => {
    const project = createEmptyProjectV1("Joc prova")
    const click = vi.fn()
    const anchor = {
      href: "",
      download: "",
      click
    } as unknown as HTMLAnchorElement
    const createObjectUrl = vi.fn().mockReturnValue("blob:project")
    const revokeObjectUrl = vi.fn()
    const appendNode = vi.fn()
    const removeNode = vi.fn()

    const filename = downloadProjectAsJson(project, {
      createObjectUrl,
      revokeObjectUrl,
      createAnchor: () => anchor,
      appendNode,
      removeNode,
      now: () => new Date("2026-02-16T09:20:00.000Z")
    })

    const blob = createObjectUrl.mock.calls[0]?.[0] as Blob
    expect(blob).toBeInstanceOf(Blob)
    expect(blob.type).toBe("application/json;charset=utf-8")
    await expect(blob.text()).resolves.toBe(serializeProjectV1(project))
    expect(anchor.href).toBe("blob:project")
    expect(anchor.download).toBe("joc-prova-2026-02-16.json")
    expect(click).toHaveBeenCalledTimes(1)
    expect(appendNode).toHaveBeenCalledWith(anchor)
    expect(removeNode).toHaveBeenCalledWith(anchor)
    expect(revokeObjectUrl).toHaveBeenCalledWith("blob:project")
    expect(filename).toBe("joc-prova-2026-02-16.json")
  })
})
