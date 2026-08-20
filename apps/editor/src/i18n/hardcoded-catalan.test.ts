import { readdirSync, readFileSync } from "node:fs"
import { relative, resolve } from "node:path"
import { describe, expect, it } from "vitest"
import { type EditorMessageKey } from "./ca.js"
import { MESSAGES_BY_LOCALE } from "./locales.js"

const HARDCODED_CATALAN_UI =
  /[àèéíïòóúüçÀÈÉÍÏÒÓÚÜÇ]|Afegir event|Duplica event|Elimina event|Objecte nou|Variables de bloc|Nou joc|Carpeta buida|So nou/

const EXTRACTED_MESSAGE_KEYS = [
  "controllerBlankProjectName",
  "eventListCtxDelete",
  "eventListCtxDuplicate",
  "objectListNewPlaceholder",
  "rightValueIterationSection",
  "roomListEmptyFolder",
  "soundsDefaultName"
] as const satisfies readonly EditorMessageKey[]

function listSourceFiles(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = resolve(directory, entry.name)
    if (entry.isDirectory()) return listSourceFiles(path)
    return /\.(?:ts|tsx)$/.test(entry.name) ? [path] : []
  })
}

describe("editor UI translations", () => {
  it("keeps Catalan UI copy in the locale catalog", () => {
    const sourceRoot = resolve(import.meta.dirname, "..")
    const hardcodedMessages = listSourceFiles(sourceRoot).flatMap((sourceFile) => {
      const relativePath = relative(sourceRoot, sourceFile)
      if (
        relativePath.startsWith("i18n/") ||
        relativePath.startsWith("seo/") ||
        relativePath.includes("/templates/") ||
        relativePath.includes(".test.")
      ) {
        return []
      }
      const source = readFileSync(sourceFile, "utf8")
      const match = HARDCODED_CATALAN_UI.exec(source)
      return match ? [`${relativePath}: ${match[0]}`] : []
    })

    expect(hardcodedMessages).toEqual([])
  })

  it("provides Spanish and English translations for every extracted message", () => {
    for (const key of EXTRACTED_MESSAGE_KEYS) {
      expect(MESSAGES_BY_LOCALE.es[key]).not.toBe(MESSAGES_BY_LOCALE.ca[key])
      expect(MESSAGES_BY_LOCALE.en[key]).not.toBe(MESSAGES_BY_LOCALE.ca[key])
    }
  })
})
