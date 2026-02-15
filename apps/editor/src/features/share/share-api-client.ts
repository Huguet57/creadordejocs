import { serializeProjectV1, type ProjectV1 } from "@creadordejocs/project-format"

type PublishResponse = {
  id: string
}

type PublishOptions = {
  apiBaseUrl?: string
}

type ClipboardLike = Pick<Clipboard, "writeText">

function trimTrailingSlash(value: string): string {
  return value.endsWith("/") ? value.slice(0, -1) : value
}

function resolveApiBaseUrl(override?: string): string {
  if (override) {
    return trimTrailingSlash(override)
  }
  const configured = import.meta.env.VITE_SHARE_API_BASE_URL?.trim()
  if (configured) {
    return trimTrailingSlash(configured)
  }
  return ""
}

export function buildSharePermalink(origin: string, shareId: string): string {
  return `${trimTrailingSlash(origin)}/play/${shareId}`
}

export async function publishProjectToShareApi(project: ProjectV1, options: PublishOptions = {}): Promise<PublishResponse> {
  const response = await fetch(`${resolveApiBaseUrl(options.apiBaseUrl)}/api/share`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      projectSource: serializeProjectV1(project)
    })
  })

  if (!response.ok) {
    throw new Error("Could not publish game.")
  }

  const payload = (await response.json()) as Partial<PublishResponse>
  if (!payload.id) {
    throw new Error("Could not publish game.")
  }
  return { id: payload.id }
}

export async function loadPublishedProject(shareId: string, options: PublishOptions = {}): Promise<ProjectV1> {
  const response = await fetch(`${resolveApiBaseUrl(options.apiBaseUrl)}/api/share/${shareId}`)
  if (response.status === 404) {
    throw new Error("Game not found.")
  }
  if (!response.ok) {
    throw new Error("Could not load shared game.")
  }
  const payload = (await response.json()) as { projectSource?: string }
  if (typeof payload.projectSource !== "string") {
    throw new Error("Invalid shared game payload.")
  }
  const { loadProjectV1 } = await import("@creadordejocs/project-format")
  return loadProjectV1(payload.projectSource)
}

export async function copyPermalinkToClipboard(permalink: string, clipboard: ClipboardLike = navigator.clipboard): Promise<void> {
  await clipboard.writeText(permalink)
}
