import { loadProjectV1, serializeProjectV1, type ProjectV1 } from "@creadordejocs/project-format"

export const LOCAL_PROJECT_KEY = "creadordejocs.editor.project.v1"

export type SaveStatus = "idle" | "saved" | "saving" | "error"

export function saveProjectLocally(project: ProjectV1): void {
  const serialized = serializeProjectV1(project)
  localStorage.setItem(LOCAL_PROJECT_KEY, serialized)
}

export function loadProjectFromLocalStorage(): ProjectV1 | null {
  const source = localStorage.getItem(LOCAL_PROJECT_KEY)
  if (!source) {
    return null
  }

  return loadProjectV1(source)
}
