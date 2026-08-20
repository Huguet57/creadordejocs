import { readFileSync } from "node:fs"
import { resolve } from "node:path"
import { describe, expect, it } from "vitest"

const TRANSLATABLE_SOURCES = ["formatters.ts", "../bin/cli.ts"] as const
const HARDCODED_CATALAN =
  /[àèéíïòóúüçÀÈÉÍÏÒÓÚÜÇ]|Cap dada disponible|\b(?:Clics|Impressions|Tendència)\b|Últims \{?\w+\}? dies/

describe("SEO analytics translations", () => {
  it("keeps localized CLI copy in the i18n catalog", () => {
    const hardcodedMessages = TRANSLATABLE_SOURCES.flatMap((sourceFile) => {
      const source = readFileSync(resolve(import.meta.dirname, sourceFile), "utf8")
      const match = HARDCODED_CATALAN.exec(source)
      return match ? [`${sourceFile}: ${match[0]}`] : []
    })

    expect(hardcodedMessages).toEqual([])
  })
})
