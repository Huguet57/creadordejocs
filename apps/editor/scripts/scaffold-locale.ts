import { existsSync, readFileSync, writeFileSync } from "node:fs"
import { resolve } from "node:path"
import { fileURLToPath } from "node:url"

type CliArgs = {
  code: string
  localeName: string
  htmlLang: string
  ogLocale: string
  brandName: string
  dryRun: boolean
}

function parseArgs(argv: string[]): CliArgs {
  const getArg = (name: string): string | undefined => {
    const index = argv.indexOf(name)
    if (index === -1) return undefined
    return argv[index + 1]
  }

  const code = (getArg("--code") ?? "").trim().toLowerCase()
  if (!/^[a-z]{2,5}(?:-[a-z]{2,5})?$/.test(code)) {
    throw new Error("Missing or invalid --code. Example: --code fr")
  }

  const localeName = (getArg("--name") ?? code.toUpperCase()).trim()
  const htmlLang = (getArg("--html-lang") ?? code).trim()
  const ogLocale = (getArg("--og-locale") ?? `${code}_${code.toUpperCase()}`).trim()
  const brandName = (getArg("--brand-name") ?? "CreadorDeJocs").trim()
  const dryRun = argv.includes("--dry-run")

  return { code, localeName, htmlLang, ogLocale, brandName, dryRun }
}

function insertBeforeObjectClosing(
  content: string,
  objectPrefix: string,
  snippet: string,
  separator = ","
): string {
  const objectStart = content.indexOf(objectPrefix)
  if (objectStart === -1) {
    throw new Error(`Could not find object prefix: ${objectPrefix}`)
  }

  const braceOpen = content.indexOf("{", objectStart)
  if (braceOpen === -1) {
    throw new Error(`Could not find object opening brace for: ${objectPrefix}`)
  }

  let depth = 0
  let closingIndex = -1
  for (let i = braceOpen; i < content.length; i += 1) {
    const char = content[i]
    if (char === "{") depth += 1
    if (char === "}") {
      depth -= 1
      if (depth === 0) {
        closingIndex = i
        break
      }
    }
  }

  if (closingIndex === -1) {
    throw new Error(`Could not find object closing brace for: ${objectPrefix}`)
  }

  const before = content.slice(0, closingIndex)
  const after = content.slice(closingIndex)
  const needsSeparator = !before.trimEnd().endsWith("{")
  return `${before}${needsSeparator ? separator : ""}\n${snippet}\n${after}`
}

function addLocaleToSupportedLocales(content: string, code: string): string {
  const arrayRegex = /export const SUPPORTED_LOCALES = \[([^\]]*)\] as const/
  const match = arrayRegex.exec(content)
  if (!match) {
    throw new Error("Could not find SUPPORTED_LOCALES array.")
  }

  const localeListRaw = match[1]
  if (localeListRaw === undefined) {
    throw new Error("Could not parse SUPPORTED_LOCALES array entries.")
  }

  const entries = localeListRaw
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean)
  const quotedCode = `"${code}"`
  if (entries.includes(quotedCode)) {
    throw new Error(`Locale '${code}' already exists in SUPPORTED_LOCALES.`)
  }
  entries.push(quotedCode)
  const replacement = `export const SUPPORTED_LOCALES = [${entries.join(", ")}] as const`
  return content.replace(arrayRegex, replacement)
}

function updateLocalesFile(content: string, args: CliArgs): string {
  const importLine = `import { ${args.code}Messages } from "./${args.code}.js"`
  if (!content.includes(importLine)) {
    const importAnchor = `import { esMessages } from "./es.js"\n`
    if (!content.includes(importAnchor)) {
      throw new Error("Could not find expected imports block in locales.ts.")
    }
    content = content.replace(importAnchor, `${importAnchor}${importLine}\n`)
  }

  content = addLocaleToSupportedLocales(content, args.code)

  content = insertBeforeObjectClosing(
    content,
    "export const MESSAGES_BY_LOCALE: Record<SupportedLocale, LocaleMessages> = {",
    `  ${args.code}: ${args.code}Messages`
  )

  content = insertBeforeObjectClosing(
    content,
    "export const LOCALE_MANIFEST: Record<SupportedLocale, LocaleManifestEntry> = {",
    `  ${args.code}: {
    code: "${args.code}",
    htmlLang: "${args.htmlLang}",
    ogLocale: "${args.ogLocale}",
    brandName: "${args.brandName}",
    isDefault: false,
    isIndexable: true
  }`
  )

  return content
}

function updateSeoLocalesFile(content: string, args: CliArgs): string {
  content = insertBeforeObjectClosing(
    content,
    "export const RUNTIME_SEO_BY_LOCALE: Record<SupportedLocale, RuntimeSeoMeta> = {",
    `  ${args.code}: {
    landingTitle: "[TODO ${args.localeName}] Translate landing title",
    editorTitle: "[TODO ${args.localeName}] Translate editor title",
    playTitle: "[TODO ${args.localeName}] Translate play title"
  }`
  )

  content = insertBeforeObjectClosing(
    content,
    "export const BUILD_SEO_BY_LOCALE: Record<SupportedLocale, BuildSeoMeta> = {",
    `  ${args.code}: {
    title: "[TODO ${args.localeName}] Translate page title",
    description: "[TODO ${args.localeName}] Translate meta description",
    keywords: "[TODO ${args.localeName}] Add keywords",
    ogTitle: "[TODO ${args.localeName}] Translate OG title",
    ogDescription: "[TODO ${args.localeName}] Translate OG description",
    twitterTitle: "[TODO ${args.localeName}] Translate Twitter title",
    twitterDescription: "[TODO ${args.localeName}] Translate Twitter description",
    schemaDescription: "[TODO ${args.localeName}] Translate schema description",
    faq: [
      {
        q: "[TODO ${args.localeName}] FAQ question 1",
        a: "[TODO ${args.localeName}] FAQ answer 1"
      }
    ]
  }`
  )

  content = insertBeforeObjectClosing(
    content,
    "export const SEO_BY_LOCALE: SeoConfigByLocale = {",
    `  ${args.code}: { runtime: RUNTIME_SEO_BY_LOCALE.${args.code}, build: BUILD_SEO_BY_LOCALE.${args.code} }`
  )

  return content
}

function createMessagesFile(code: string): string {
  return `import { caMessages } from "./ca.js"

export const ${code}Messages: Record<keyof typeof caMessages, string> = {
  ...caMessages
} as const
`
}

function main(): void {
  const args = parseArgs(process.argv.slice(2))

  const scriptDir = resolve(fileURLToPath(import.meta.url), "..")
  const editorRoot = resolve(scriptDir, "..")
  const localesPath = resolve(editorRoot, "src/i18n/locales.ts")
  const seoLocalesPath = resolve(editorRoot, "src/seo/seo-locales.ts")
  const messagesPath = resolve(editorRoot, `src/i18n/${args.code}.ts`)

  if (existsSync(messagesPath)) {
    throw new Error(`File already exists: ${messagesPath}`)
  }

  const localesContent = readFileSync(localesPath, "utf-8")
  const seoLocalesContent = readFileSync(seoLocalesPath, "utf-8")

  const nextLocales = updateLocalesFile(localesContent, args)
  const nextSeoLocales = updateSeoLocalesFile(seoLocalesContent, args)
  const nextMessages = createMessagesFile(args.code)

  if (args.dryRun) {
    console.log("[dry-run] locale scaffold preview")
    console.log(`  would create: ${messagesPath}`)
    console.log(`  would update: ${localesPath}`)
    console.log(`  would update: ${seoLocalesPath}`)
    return
  }

  writeFileSync(messagesPath, nextMessages, "utf-8")
  writeFileSync(localesPath, nextLocales, "utf-8")
  writeFileSync(seoLocalesPath, nextSeoLocales, "utf-8")

  console.log(`Locale scaffold created for '${args.code}'.`)
  console.log(`Next steps:`)
  console.log(`  1) Translate ${messagesPath}`)
  console.log(`  2) Replace TODO SEO placeholders in ${seoLocalesPath}`)
  console.log(`  3) Run npm run typecheck && npm run editor:build`)
}

main()
