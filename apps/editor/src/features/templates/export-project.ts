import { serializeProjectV1, type ProjectV1 } from "@creadordejocs/project-format"

type DownloadProjectDeps = {
  createObjectUrl?: (blob: Blob) => string
  revokeObjectUrl?: (url: string) => void
  createAnchor?: () => HTMLAnchorElement
  appendNode?: (node: Node) => void
  removeNode?: (node: Node) => void
  now?: () => Date
}

function sanitizeFileName(value: string): string {
  const normalized = value.normalize("NFKD").replace(/[\u0300-\u036f]/g, "")
  const slug = normalized
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")

  return slug || "joc"
}

export function createProjectExportFilename(projectName: string, now: Date = new Date()): string {
  const datePrefix = now.toISOString().slice(0, 10)
  return `${sanitizeFileName(projectName)}-${datePrefix}.json`
}

export function downloadProjectAsJson(project: ProjectV1, deps: DownloadProjectDeps = {}): string {
  const createObjectUrl = deps.createObjectUrl ?? ((blob: Blob) => URL.createObjectURL(blob))
  const revokeObjectUrl = deps.revokeObjectUrl ?? ((url: string) => URL.revokeObjectURL(url))
  const createAnchor =
    deps.createAnchor ??
    (() => {
      if (typeof document === "undefined") {
        throw new Error("Document is not available.")
      }
      return document.createElement("a")
    })
  const appendNode =
    deps.appendNode ??
    ((node: Node) => {
      if (typeof document === "undefined") {
        throw new Error("Document is not available.")
      }
      document.body.appendChild(node)
    })
  const removeNode =
    deps.removeNode ??
    ((node: Node) => {
      if (typeof document === "undefined") {
        throw new Error("Document is not available.")
      }
      document.body.removeChild(node)
    })
  const currentDate = deps.now ? deps.now() : new Date()

  const projectSource = serializeProjectV1(project)
  const filename = createProjectExportFilename(project.metadata.name, currentDate)
  const objectUrl = createObjectUrl(new Blob([projectSource], { type: "application/json;charset=utf-8" }))
  const anchor = createAnchor()

  anchor.href = objectUrl
  anchor.download = filename

  appendNode(anchor)
  anchor.click()
  removeNode(anchor)
  revokeObjectUrl(objectUrl)

  return filename
}
