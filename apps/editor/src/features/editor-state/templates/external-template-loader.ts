import { ProjectSchemaV1, type ProjectV1 } from "@creadordejocs/project-format"
import type { GameTemplateId } from "./types.js"

type LoadExternalTemplateProjectInput = {
  templateId: GameTemplateId
  relativePath: string
  baseUrl?: string
  fetchImpl?: typeof fetch
}

function trimLeadingSlash(value: string): string {
  return value.startsWith("/") ? value.slice(1) : value
}

function ensureTrailingSlash(value: string): string {
  return value.endsWith("/") ? value : `${value}/`
}

export function buildExternalTemplateUrl(relativePath: string, baseUrl: string = import.meta.env.BASE_URL): string {
  const normalizedBaseUrl = ensureTrailingSlash(baseUrl || "/")
  const normalizedRelativePath = trimLeadingSlash(relativePath)
  return `${normalizedBaseUrl}${normalizedRelativePath}`
}

function createTemplateLoadError(message: string, cause?: unknown): Error {
  const error = new Error(message)
  if (cause !== undefined) {
    ;(error as Error & { cause?: unknown }).cause = cause
  }
  return error
}

export async function loadExternalTemplateProject({
  templateId,
  relativePath,
  baseUrl,
  fetchImpl
}: LoadExternalTemplateProjectInput): Promise<ProjectV1> {
  const templateUrl = buildExternalTemplateUrl(relativePath, baseUrl)
  const requestFetch = fetchImpl ?? fetch

  let response: Response
  try {
    response = await requestFetch(templateUrl)
  } catch (error) {
    throw createTemplateLoadError(
      `Template "${templateId}" failed to load from "${templateUrl}": network error`,
      error
    )
  }

  if (!response.ok) {
    throw createTemplateLoadError(
      `Template "${templateId}" failed to load from "${templateUrl}": status ${response.status} ${response.statusText}`.trim()
    )
  }

  let rawTemplate: unknown
  try {
    rawTemplate = await response.json()
  } catch (error) {
    throw createTemplateLoadError(
      `Template "${templateId}" failed to parse JSON from "${templateUrl}"`,
      error
    )
  }

  try {
    return ProjectSchemaV1.parse(rawTemplate)
  } catch (error) {
    throw createTemplateLoadError(
      `Template "${templateId}" has invalid schema at "${templateUrl}"`,
      error
    )
  }
}
