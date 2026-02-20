import { generateUUID, loadProjectV1, serializeProjectV1, type ProjectV1 } from "@creadordejocs/project-format"
import { getKvStorageProvider } from "./storage/get-kv-storage-provider.js"

export const LOCAL_PROJECTS_INDEX_KEY = "creadordejocs.editor.projects-index.v2"
export const LOCAL_PROJECT_KEY_PREFIX = "creadordejocs.editor.project.v2."
export const LOCAL_SNAPSHOTS_KEY_PREFIX = "creadordejocs.editor.snapshots.v2."

// Legacy keys kept as constants for reference.
export const LOCAL_PROJECT_KEY = "creadordejocs.editor.project.v1"
export const LOCAL_SNAPSHOTS_KEY = "creadordejocs.editor.snapshots.v1"

const MAX_SNAPSHOTS = 8

export type SaveStatus = "idle" | "saved" | "saving" | "error"

export type LocalProjectSummary = {
  projectId: string
  name: string
  updatedAtIso: string
}

export type LocalProjectsIndexV2 = {
  version: 2
  activeProjectId: string | null
  projects: LocalProjectSummary[]
}

export type LocalSnapshot = {
  id: string
  label: string
  savedAtIso: string
  projectSource: string
}

type SaveProjectOptions = {
  updatedAtIso?: string
  setActive?: boolean
}

const EMPTY_INDEX: LocalProjectsIndexV2 = {
  version: 2,
  activeProjectId: null,
  projects: []
}

function projectKey(projectId: string): string {
  return `${LOCAL_PROJECT_KEY_PREFIX}${projectId}`
}

function snapshotKey(projectId: string): string {
  return `${LOCAL_SNAPSHOTS_KEY_PREFIX}${projectId}`
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null
}

function isValidDate(value: string): boolean {
  return Number.isFinite(Date.parse(value))
}

function isLocalProjectSummary(value: unknown): value is LocalProjectSummary {
  if (!isRecord(value)) {
    return false
  }
  return (
    typeof value.projectId === "string" &&
    value.projectId.length > 0 &&
    typeof value.name === "string" &&
    typeof value.updatedAtIso === "string" &&
    isValidDate(value.updatedAtIso)
  )
}

function normalizeProjectName(name: string): string {
  const trimmed = name.trim()
  return trimmed || "Nou joc"
}

function normalizeProjectSummary(summary: LocalProjectSummary): LocalProjectSummary {
  return {
    projectId: summary.projectId,
    name: normalizeProjectName(summary.name),
    updatedAtIso: summary.updatedAtIso
  }
}

function nowIso(): string {
  return new Date().toISOString()
}

function normalizeIndex(index: LocalProjectsIndexV2): LocalProjectsIndexV2 {
  const deduped = new Map<string, LocalProjectSummary>()
  for (const project of index.projects) {
    if (!isLocalProjectSummary(project)) {
      continue
    }
    deduped.set(project.projectId, normalizeProjectSummary(project))
  }

  const projects = [...deduped.values()]
  const activeProjectId = index.activeProjectId && deduped.has(index.activeProjectId) ? index.activeProjectId : (projects[0]?.projectId ?? null)

  return {
    version: 2,
    activeProjectId,
    projects
  }
}

function saveIndex(index: LocalProjectsIndexV2): LocalProjectsIndexV2 {
  const normalized = normalizeIndex(index)
  getKvStorageProvider().setItem(LOCAL_PROJECTS_INDEX_KEY, JSON.stringify(normalized))
  return normalized
}

export function loadProjectsIndexFromLocalStorage(): LocalProjectsIndexV2 {
  const source = getKvStorageProvider().getItem(LOCAL_PROJECTS_INDEX_KEY)
  if (!source) {
    return EMPTY_INDEX
  }

  try {
    const parsed = JSON.parse(source) as unknown
    if (!isRecord(parsed)) {
      return EMPTY_INDEX
    }
    if (parsed.version !== 2 || !Array.isArray(parsed.projects)) {
      return EMPTY_INDEX
    }

    const candidate: LocalProjectsIndexV2 = {
      version: 2,
      activeProjectId: typeof parsed.activeProjectId === "string" ? parsed.activeProjectId : null,
      projects: parsed.projects.filter((value): value is LocalProjectSummary => isLocalProjectSummary(value))
    }
    return normalizeIndex(candidate)
  } catch {
    return EMPTY_INDEX
  }
}

export function listLocalProjects(): LocalProjectSummary[] {
  return loadProjectsIndexFromLocalStorage().projects
}

export function getActiveProjectIdFromLocalStorage(): string | null {
  return loadProjectsIndexFromLocalStorage().activeProjectId
}

export function setActiveProjectIdInLocalStorage(projectId: string): boolean {
  const index = loadProjectsIndexFromLocalStorage()
  if (!index.projects.some((project) => project.projectId === projectId)) {
    return false
  }

  saveIndex({ ...index, activeProjectId: projectId })
  return true
}

function withProjectId(project: ProjectV1, projectId: string): ProjectV1 {
  if (project.metadata.id === projectId) {
    return project
  }

  return {
    ...project,
    metadata: {
      ...project.metadata,
      id: projectId
    }
  }
}

export function saveProjectByIdLocally(projectId: string, project: ProjectV1, options: SaveProjectOptions = {}): LocalProjectSummary {
  const targetProject = withProjectId(project, projectId)
  const updatedAtIso = options.updatedAtIso ?? nowIso()
  const summary: LocalProjectSummary = {
    projectId,
    name: normalizeProjectName(targetProject.metadata.name),
    updatedAtIso
  }

  getKvStorageProvider().setItem(projectKey(projectId), serializeProjectV1(targetProject))

  const index = loadProjectsIndexFromLocalStorage()
  const projects = index.projects.some((entry) => entry.projectId === projectId)
    ? index.projects.map((entry) => (entry.projectId === projectId ? summary : entry))
    : [...index.projects, summary]

  const activeProjectId = options.setActive ? projectId : (index.activeProjectId ?? projectId)
  saveIndex({ version: 2, activeProjectId, projects })

  return summary
}

export function createLocalProject(project: ProjectV1): LocalProjectSummary {
  const projectId = project.metadata.id || generateUUID()
  return saveProjectByIdLocally(projectId, project, { setActive: true })
}

export function saveProjectLocally(project: ProjectV1, projectId?: string): void {
  const activeProjectId = getActiveProjectIdFromLocalStorage()
  const targetProjectId = projectId ?? activeProjectId ?? project.metadata.id
  if (!targetProjectId) {
    return
  }

  const shouldSetActive = !activeProjectId || activeProjectId === targetProjectId
  saveProjectByIdLocally(targetProjectId, project, { setActive: shouldSetActive })
}

export function loadProjectFromLocalStorage(projectId?: string): ProjectV1 | null {
  const targetProjectId = projectId ?? getActiveProjectIdFromLocalStorage()
  if (!targetProjectId) {
    return null
  }

  const source = getKvStorageProvider().getItem(projectKey(targetProjectId))
  if (!source) {
    return null
  }

  try {
    return loadProjectV1(source)
  } catch {
    return null
  }
}

export function renameLocalProject(projectId: string, nextName: string): LocalProjectSummary | null {
  const project = loadProjectFromLocalStorage(projectId)
  if (!project) {
    return null
  }

  const trimmed = nextName.trim()
  if (!trimmed) {
    return null
  }

  const renamedProject: ProjectV1 = {
    ...project,
    metadata: {
      ...project.metadata,
      name: trimmed
    }
  }

  const isActive = getActiveProjectIdFromLocalStorage() === projectId
  return saveProjectByIdLocally(projectId, renamedProject, { setActive: isActive })
}

export function deleteLocalProject(projectId: string): void {
  getKvStorageProvider().removeItem(projectKey(projectId))
  getKvStorageProvider().removeItem(snapshotKey(projectId))

  const index = loadProjectsIndexFromLocalStorage()
  const projects = index.projects.filter((entry) => entry.projectId !== projectId)
  const nextActive = index.activeProjectId === projectId ? (projects[0]?.projectId ?? null) : index.activeProjectId

  saveIndex({
    version: 2,
    activeProjectId: nextActive,
    projects
  })
}

export function ensureLocalProjectState(createInitialProject: () => ProjectV1): {
  project: ProjectV1
  activeProjectId: string
  projects: LocalProjectSummary[]
} {
  const index = loadProjectsIndexFromLocalStorage()
  const checked: LocalProjectSummary[] = []

  for (const summary of index.projects) {
    const loaded = loadProjectFromLocalStorage(summary.projectId)
    if (!loaded) {
      continue
    }

    const normalized: LocalProjectSummary = {
      projectId: summary.projectId,
      name: normalizeProjectName(loaded.metadata.name),
      updatedAtIso: summary.updatedAtIso
    }
    checked.push(normalized)
  }

  if (!checked.length) {
    const initialProject = createInitialProject()
    const created = createLocalProject(initialProject)
    const loaded = loadProjectFromLocalStorage(created.projectId)
    return {
      project: loaded ?? initialProject,
      activeProjectId: created.projectId,
      projects: [created]
    }
  }

  const activeProjectId = checked.some((entry) => entry.projectId === index.activeProjectId)
    ? index.activeProjectId!
    : checked[0]!.projectId
  const activeProject = loadProjectFromLocalStorage(activeProjectId)

  saveIndex({
    version: 2,
    activeProjectId,
    projects: checked
  })

  if (activeProject) {
    return {
      project: activeProject,
      activeProjectId,
      projects: checked
    }
  }

  // Active entry became invalid unexpectedly between reads. Recreate a safe fallback.
  const fallbackProject = createInitialProject()
  const created = createLocalProject(fallbackProject)
  const loaded = loadProjectFromLocalStorage(created.projectId)

  return {
    project: loaded ?? fallbackProject,
    activeProjectId: created.projectId,
    projects: listLocalProjects()
  }
}

export function loadSnapshotsFromLocalStorage(projectId?: string): LocalSnapshot[] {
  const targetProjectId = projectId ?? getActiveProjectIdFromLocalStorage()
  if (!targetProjectId) {
    return []
  }

  const source = getKvStorageProvider().getItem(snapshotKey(targetProjectId))
  if (!source) {
    return []
  }

  try {
    const parsed = JSON.parse(source) as unknown
    if (!Array.isArray(parsed)) {
      return []
    }

    return parsed.filter((value): value is LocalSnapshot => {
      if (typeof value !== "object" || value === null) {
        return false
      }
      const candidate = value as Partial<LocalSnapshot>
      return (
        typeof candidate.id === "string" &&
        typeof candidate.label === "string" &&
        typeof candidate.savedAtIso === "string" &&
        typeof candidate.projectSource === "string"
      )
    })
  } catch {
    return []
  }
}

export function saveCheckpointSnapshot(project: ProjectV1, label: string, projectId?: string): LocalSnapshot[] {
  const targetProjectId = projectId ?? getActiveProjectIdFromLocalStorage()
  if (!targetProjectId) {
    return []
  }

  const snapshots = loadSnapshotsFromLocalStorage(targetProjectId)
  const next: LocalSnapshot = {
    id: generateUUID(),
    label,
    savedAtIso: nowIso(),
    projectSource: serializeProjectV1(project)
  }
  const merged = [next, ...snapshots].slice(0, MAX_SNAPSHOTS)
  getKvStorageProvider().setItem(snapshotKey(targetProjectId), JSON.stringify(merged))
  return merged
}

export function loadSnapshotProject(snapshotId: string, projectId?: string): ProjectV1 | null {
  const snapshot = loadSnapshotsFromLocalStorage(projectId).find((entry) => entry.id === snapshotId)
  if (!snapshot) {
    return null
  }

  try {
    return loadProjectV1(snapshot.projectSource)
  } catch {
    return null
  }
}
