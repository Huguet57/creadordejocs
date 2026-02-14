import { createEmptyProjectV1 } from "@creadordejocs/project-format"
import { describe, expect, it } from "vitest"
import {
  parseDataOnlyTemplateJson,
  parseDataOnlyTemplatesData
} from "../../apps/editor/src/features/editor-state/templates/data-only-template-loader.js"

describe("data-only template loader", () => {
  it("parses one template from JSON text", () => {
    const payload = {
      id: "json-template",
      name: "JSON Template",
      description: "Loaded from plain JSON",
      project: createEmptyProjectV1("JSON Project")
    }
    const template = parseDataOnlyTemplateJson(JSON.stringify(payload))

    expect(template.id).toBe("json-template")
    expect(template.project.metadata.name).toBe("JSON Project")
  })

  it("parses a template collection from data", () => {
    const payload = {
      templates: [
        {
          id: "t1",
          name: "Template 1",
          description: "One",
          project: createEmptyProjectV1("P1")
        },
        {
          id: "t2",
          name: "Template 2",
          description: "Two",
          project: createEmptyProjectV1("P2")
        }
      ]
    }
    const templates = parseDataOnlyTemplatesData(payload)

    expect(templates).toHaveLength(2)
    expect(templates[1]?.id).toBe("t2")
  })
})
