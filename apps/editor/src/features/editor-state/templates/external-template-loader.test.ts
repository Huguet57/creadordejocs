import { ProjectSchemaV1 } from "@creadordejocs/project-format"
import type { ProjectV1 } from "@creadordejocs/project-format"
import { describe, expect, it, vi } from "vitest"
import { buildExternalTemplateUrl, loadExternalTemplateProject } from "./external-template-loader.js"

describe("external-template-loader", () => {
  it("builds a URL at root base path", () => {
    expect(buildExternalTemplateUrl("templates/pokemon.project.json", "/")).toBe(
      "/templates/pokemon.project.json"
    )
  })

  it("builds a URL for nested base path and trims leading slash", () => {
    expect(buildExternalTemplateUrl("/templates/pokemon.project.json", "/editor/")).toBe(
      "/editor/templates/pokemon.project.json"
    )
  })

  it("loads and parses an external template project", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(new Response(JSON.stringify({ any: "payload" }), { status: 200 }))
    const parseResult = { id: "project-id" } as unknown as ProjectV1
    const parseSpy = vi.spyOn(ProjectSchemaV1, "parse").mockReturnValue(parseResult)

    const project = await loadExternalTemplateProject({
      templateId: "pokemon-explorer",
      relativePath: "templates/pokemon.project.json",
      baseUrl: "/editor/",
      fetchImpl: fetchMock as typeof fetch
    })

    expect(fetchMock).toHaveBeenCalledWith("/editor/templates/pokemon.project.json")
    expect(parseSpy).toHaveBeenCalledWith({ any: "payload" })
    expect(project).toBe(parseResult)
  })

  it("throws a controlled error when the response is not ok", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response("missing", { status: 404, statusText: "Not Found" }))

    await expect(
      loadExternalTemplateProject({
        templateId: "pokemon-explorer",
        relativePath: "templates/pokemon.project.json",
        fetchImpl: fetchMock as typeof fetch
      })
    ).rejects.toThrow('Template "pokemon-explorer" failed to load from "/templates/pokemon.project.json": status 404 Not Found')
  })

  it("throws a controlled error when JSON parsing fails", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(new Response("not-json", { status: 200, headers: { "Content-Type": "application/json" } }))

    await expect(
      loadExternalTemplateProject({
        templateId: "pokemon-explorer",
        relativePath: "templates/pokemon.project.json",
        fetchImpl: fetchMock as typeof fetch
      })
    ).rejects.toThrow('Template "pokemon-explorer" failed to parse JSON from "/templates/pokemon.project.json"')
  })
})
