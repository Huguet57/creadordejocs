import { createEmptyProjectV1 } from "@creadordejocs/project-format"
import { caMessages, type EditorMessageKey } from "./i18n/ca.js"

const localeCatalog = {
  ca: caMessages
} as const

type LocaleCode = keyof typeof localeCatalog

function t(locale: LocaleCode, key: EditorMessageKey): string {
  return localeCatalog[locale][key]
}

const initialProject = createEmptyProjectV1("Primer joc")
console.info(`[${t("ca", "appTitle")}] ${t("ca", "bootMessage")}`, initialProject.metadata.name)
