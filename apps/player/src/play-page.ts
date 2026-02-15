import { loadProjectV1, type ProjectV1 } from "@creadordejocs/project-format"

type PublishedProjectPayload = {
  id: string
  projectSource: string
}

export function extractShareIdFromPath(pathname: string): string | null {
  const normalized = pathname.endsWith("/") && pathname !== "/" ? pathname.slice(0, -1) : pathname
  const match = /^\/play\/([^/]+)$/.exec(normalized)
  return match?.[1] ?? null
}

export async function loadPublishedProject(
  shareId: string,
  fetchImpl: (input: string) => Promise<Response> = (input) => fetch(input)
): Promise<ProjectV1> {
  const response = await fetchImpl(`/api/share/${shareId}`)
  if (response.status === 404) {
    throw new Error("Game not found.")
  }
  if (!response.ok) {
    throw new Error("Could not load shared game.")
  }

  const payload = (await response.json()) as Partial<PublishedProjectPayload>
  if (typeof payload.projectSource !== "string") {
    throw new Error("Invalid shared game payload.")
  }

  return loadProjectV1(payload.projectSource)
}

function clearNode(root: HTMLElement): void {
  while (root.firstChild) {
    root.removeChild(root.firstChild)
  }
}

function appendParagraph(root: HTMLElement, className: string, text: string): void {
  const paragraph = document.createElement("p")
  paragraph.className = className
  paragraph.textContent = text
  root.appendChild(paragraph)
}

export function renderPlayLoading(root: HTMLElement): void {
  clearNode(root)
  appendParagraph(root, "mvp-player-loading", "Loading shared game...")
}

export function renderPlayError(root: HTMLElement, message: string): void {
  clearNode(root)
  appendParagraph(root, "mvp-player-error", message)
}

export function renderPlayProject(root: HTMLElement, project: ProjectV1): void {
  clearNode(root)
  const container = document.createElement("section")
  container.className = "mvp-player-play-page"

  const title = document.createElement("h1")
  title.className = "mvp-player-title"
  title.textContent = project.metadata.name
  container.appendChild(title)

  appendParagraph(container, "mvp-player-subtitle", "Play-only mode")
  appendParagraph(
    container,
    "mvp-player-stats",
    `Rooms: ${project.rooms.length} · Objects: ${project.objects.length} · Sprites: ${project.resources.sprites.length}`
  )

  root.appendChild(container)
}
