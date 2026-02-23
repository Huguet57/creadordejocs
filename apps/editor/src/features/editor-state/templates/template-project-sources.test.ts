import { describe, expect, it } from "vitest"
import { TEMPLATE_PROJECT_SOURCES } from "./template-project-sources.js"

describe("template-project-sources", () => {
  it("marks pokemon explorer as an external template source", () => {
    expect(TEMPLATE_PROJECT_SOURCES["pokemon-explorer"]).toEqual({
      type: "external",
      relativePath: "templates/pokemon-explorer-template.project.json"
    })
  })

  it("keeps all other templates inline", () => {
    for (const [templateId, source] of Object.entries(TEMPLATE_PROJECT_SOURCES)) {
      if (templateId !== "pokemon-explorer") {
        expect(source).toEqual({ type: "inline" })
      }
    }
  })
})
