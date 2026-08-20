import { generateUUID, loadProjectV1, parseProjectV1, serializeProjectV1, type ProjectV1 } from "@creadordejocs/project-format"
import { t } from "@/i18n/index.js"
import { getKvStorageProvider } from "./storage/get-kv-storage-provider.js"

const DEFAULT_SCOPE_USER_ID = "__local__"

export const LOCAL_PROJECTS_INDEX_KEY_PREFIX = "creadordejocs.editor.projects-index.v3."
export const LOCAL_PROJECT_KEY_PREFIX = "creadordejocs.editor.project.v3."
export const LOCAL_SNAPSHOTS_KEY_PREFIX = "creadordejocs.editor.snapshots.v3."
export const LOCAL_SNAPSHOT_INDEX_KEY_PREFIX = "creadordejocs.editor.snapshot-index.v4."
export const LOCAL_SNAPSHOT_DATA_KEY_PREFIX = "creadordejocs.editor.snapshot-data.v4."

export const LOCAL_PROJECTS_INDEX_KEY = `${LOCAL_PROJECTS_INDEX_KEY_PREFIX}${DEFAULT_SCOPE_USER_ID}`

export const LEGACY_LOCAL_PROJECTS_INDEX_KEY = "creadordejocs.editor.projects-index.v2"
export const LEGACY_LOCAL_PROJECT_KEY_PREFIX = "creadordejocs.editor.project.v2."
export const LEGACY_LOCAL_SNAPSHOTS_KEY_PREFIX = "creadordejocs.editor.snapshots.v2."

// Legacy keys kept as constants for reference.
export const LOCAL_PROJECT_KEY = "creadordejocs.editor.project.v1"
export const LOCAL_SNAPSHOTS_KEY = "creadordejocs.editor.snapshots.v1"

const MAX_SNAPSHOTS = 8
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

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

export type LocalSnapshotMeta = {
  id: string
  label: string
  savedAtIso: string
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

function normalizeScopeUserId(scopeUserId?: string | null): string {
  const trimmed = scopeUserId?.trim()
  if (!trimmed) {
    return DEFAULT_SCOPE_USER_ID
  }
  return trimmed.replace(/[^a-zA-Z0-9_.-]+/g, "_")
}

function projectsIndexKey(scopeUserId?: string | null): string {
  return `${LOCAL_PROJECTS_INDEX_KEY_PREFIX}${normalizeScopeUserId(scopeUserId)}`
}

function projectKey(projectId: string, scopeUserId?: string | null): string {
  return `${LOCAL_PROJECT_KEY_PREFIX}${normalizeScopeUserId(scopeUserId)}.${projectId}`
}

function snapshotKey(projectId: string, scopeUserId?: string | null): string {
  return `${LOCAL_SNAPSHOTS_KEY_PREFIX}${normalizeScopeUserId(scopeUserId)}.${projectId}`
}

function snapshotIndexKey(projectId: string, scopeUserId?: string | null): string {
  return `${LOCAL_SNAPSHOT_INDEX_KEY_PREFIX}${normalizeScopeUserId(scopeUserId)}.${projectId}`
}

function snapshotDataKey(projectId: string, snapshotId: string, scopeUserId?: string | null): string {
  return `${LOCAL_SNAPSHOT_DATA_KEY_PREFIX}${normalizeScopeUserId(scopeUserId)}.${projectId}.${snapshotId}`
}

const projectJsonCache = new WeakMap<ProjectV1, string>()

export function cachedSerializeProjectV1(project: ProjectV1): string {
  const cached = projectJsonCache.get(project)
  if (cached !== undefined) return cached
  const json = serializeProjectV1(project)
  projectJsonCache.set(project, json)
  return json
}

function legacyProjectKey(projectId: string): string {
  return `${LEGACY_LOCAL_PROJECT_KEY_PREFIX}${projectId}`
}

function legacySnapshotKey(projectId: string): string {
  return `${LEGACY_LOCAL_SNAPSHOTS_KEY_PREFIX}${projectId}`
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null
}

function isValidDate(value: string): boolean {
  return Number.isFinite(Date.parse(value))
}

function isUuid(value: string): boolean {
  return UUID_PATTERN.test(value.trim())
}

function normalizeProjectId(projectId: string): string {
  const trimmed = projectId.trim()
  if (trimmed && isUuid(trimmed)) {
    return trimmed
  }
  return generateUUID()
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
  return trimmed || t("controllerBlankProjectName")
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

function parseIndexFromRaw(raw: string | null): LocalProjectsIndexV2 {
  if (!raw) {
    return EMPTY_INDEX
  }

  try {
    const parsed = JSON.parse(raw) as unknown
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

function saveIndex(index: LocalProjectsIndexV2, scopeUserId?: string | null): LocalProjectsIndexV2 {
  const normalized = normalizeIndex(index)
  getKvStorageProvider().setItem(projectsIndexKey(scopeUserId), JSON.stringify(normalized))
  return normalized
}

function loadLegacyProjectFromLocalStorage(projectId: string): ProjectV1 | null {
  const source = getKvStorageProvider().getItem(legacyProjectKey(projectId))
  if (!source) {
    return null
  }

  try {
    return loadProjectV1(source)
  } catch {
    return null
  }
}

function loadLegacySnapshotsFromLocalStorage(projectId: string): LocalSnapshot[] {
  const source = getKvStorageProvider().getItem(legacySnapshotKey(projectId))
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

function loadLegacyProjectsIndex(): LocalProjectsIndexV2 {
  const source = getKvStorageProvider().getItem(LEGACY_LOCAL_PROJECTS_INDEX_KEY)
  return parseIndexFromRaw(source)
}

function persistLegacyProjectsIndex(index: LocalProjectsIndexV2): void {
  const normalized = normalizeIndex(index)
  getKvStorageProvider().setItem(LEGACY_LOCAL_PROJECTS_INDEX_KEY, JSON.stringify(normalized))
}

function clearImportedLegacyEntries(legacyIndex: LocalProjectsIndexV2, importedProjectIds: Set<string>): void {
  if (!importedProjectIds.size) {
    return
  }

  for (const projectId of importedProjectIds) {
    getKvStorageProvider().removeItem(legacyProjectKey(projectId))
    getKvStorageProvider().removeItem(legacySnapshotKey(projectId))
  }

  const remainingProjects = legacyIndex.projects.filter((summary) => !importedProjectIds.has(summary.projectId))
  if (!remainingProjects.length) {
    getKvStorageProvider().removeItem(LEGACY_LOCAL_PROJECTS_INDEX_KEY)
    return
  }

  const nextActiveProjectId =
    legacyIndex.activeProjectId && remainingProjects.some((entry) => entry.projectId === legacyIndex.activeProjectId)
      ? legacyIndex.activeProjectId
      : (remainingProjects[0]?.projectId ?? null)

  persistLegacyProjectsIndex({
    version: 2,
    activeProjectId: nextActiveProjectId,
    projects: remainingProjects
  })
}

export function loadProjectsIndexFromLocalStorage(scopeUserId?: string | null): LocalProjectsIndexV2 {
  const source = getKvStorageProvider().getItem(projectsIndexKey(scopeUserId))
  return parseIndexFromRaw(source)
}

export function listLocalProjects(scopeUserId?: string | null): LocalProjectSummary[] {
  return loadProjectsIndexFromLocalStorage(scopeUserId).projects
}

export function getActiveProjectIdFromLocalStorage(scopeUserId?: string | null): string | null {
  return loadProjectsIndexFromLocalStorage(scopeUserId).activeProjectId
}

export function setActiveProjectIdInLocalStorage(projectId: string, scopeUserId?: string | null): boolean {
  const index = loadProjectsIndexFromLocalStorage(scopeUserId)
  if (!index.projects.some((project) => project.projectId === projectId)) {
    return false
  }

  saveIndex({ ...index, activeProjectId: projectId }, scopeUserId)
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

export function saveProjectByIdLocally(
  projectId: string,
  project: ProjectV1,
  options: SaveProjectOptions = {},
  scopeUserId?: string | null
): LocalProjectSummary {
  const normalizedProjectId = normalizeProjectId(projectId)
  const targetProject = withProjectId(project, normalizedProjectId)
  const updatedAtIso = options.updatedAtIso ?? nowIso()
  const summary: LocalProjectSummary = {
    projectId: normalizedProjectId,
    name: normalizeProjectName(targetProject.metadata.name),
    updatedAtIso
  }

  const kv = getKvStorageProvider()
  const needsIdMigration = normalizedProjectId !== projectId
  const snapshotsToCarry = needsIdMigration ? loadSnapshotMetadata(projectId, scopeUserId) : []
  kv.setItem(projectKey(normalizedProjectId, scopeUserId), cachedSerializeProjectV1(targetProject))
  if (needsIdMigration) {
    if (snapshotsToCarry.length > 0) {
      const trimmed = snapshotsToCarry.slice(0, MAX_SNAPSHOTS)
      for (const entry of trimmed) {
        const data = kv.getItem(snapshotDataKey(projectId, entry.id, scopeUserId))
        if (data) {
          kv.setItem(snapshotDataKey(normalizedProjectId, entry.id, scopeUserId), data)
        }
      }
      kv.setItem(snapshotIndexKey(normalizedProjectId, scopeUserId), JSON.stringify(trimmed))
    }
    kv.removeItem(projectKey(projectId, scopeUserId))
    removeSnapshotData(projectId, scopeUserId)
  }

  const index = loadProjectsIndexFromLocalStorage(scopeUserId)
  const projects = index.projects.some((entry) => entry.projectId === normalizedProjectId || entry.projectId === projectId)
    ? index.projects.map((entry) => (entry.projectId === normalizedProjectId || entry.projectId === projectId ? summary : entry))
    : [...index.projects, summary]

  const activeProjectId =
    options.setActive
      ? normalizedProjectId
      : index.activeProjectId === projectId
        ? normalizedProjectId
        : (index.activeProjectId ?? normalizedProjectId)
  saveIndex({ version: 2, activeProjectId, projects }, scopeUserId)

  return summary
}

export function createLocalProject(project: ProjectV1, scopeUserId?: string | null): LocalProjectSummary {
  const projectId = normalizeProjectId(project.metadata.id || generateUUID())
  return saveProjectByIdLocally(projectId, project, { setActive: true }, scopeUserId)
}

export function saveProjectLocally(project: ProjectV1, projectId?: string, scopeUserId?: string | null): void {
  const activeProjectId = getActiveProjectIdFromLocalStorage(scopeUserId)
  const targetProjectId = projectId ?? activeProjectId ?? project.metadata.id
  if (!targetProjectId) {
    return
  }

  const shouldSetActive = !activeProjectId || activeProjectId === targetProjectId
  saveProjectByIdLocally(targetProjectId, project, { setActive: shouldSetActive }, scopeUserId)
}

export function loadProjectFromLocalStorage(projectId?: string, scopeUserId?: string | null): ProjectV1 | null {
  const source = loadProjectSourceFromLocalStorage(projectId, scopeUserId)
  if (!source) {
    return null
  }

  try {
    return loadProjectV1(source)
  } catch {
    return null
  }
}

export function parseProjectFromLocalStorage(projectId?: string, scopeUserId?: string | null): ProjectV1 | null {
  const source = loadProjectSourceFromLocalStorage(projectId, scopeUserId)
  if (!source) {
    return null
  }

  try {
    return parseProjectV1(source)
  } catch {
    return null
  }
}

export function loadProjectSourceFromLocalStorage(projectId?: string, scopeUserId?: string | null): string | null {
  const targetProjectId = projectId ?? getActiveProjectIdFromLocalStorage(scopeUserId)
  if (!targetProjectId) {
    return null
  }

  return getKvStorageProvider().getItem(projectKey(targetProjectId, scopeUserId))
}

export function renameLocalProject(projectId: string, nextName: string, scopeUserId?: string | null): LocalProjectSummary | null {
  const project = loadProjectFromLocalStorage(projectId, scopeUserId)
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

  const isActive = getActiveProjectIdFromLocalStorage(scopeUserId) === projectId
  return saveProjectByIdLocally(projectId, renamedProject, { setActive: isActive }, scopeUserId)
}

function removeSnapshotData(projectId: string, scopeUserId?: string | null): void {
  const kv = getKvStorageProvider()
  const meta = loadSnapshotMetadata(projectId, scopeUserId)
  for (const entry of meta) {
    kv.removeItem(snapshotDataKey(projectId, entry.id, scopeUserId))
  }
  kv.removeItem(snapshotIndexKey(projectId, scopeUserId))
  // Also remove v3 key in case migration hasn't run yet
  kv.removeItem(snapshotKey(projectId, scopeUserId))
}

export function deleteLocalProject(projectId: string, scopeUserId?: string | null): void {
  getKvStorageProvider().removeItem(projectKey(projectId, scopeUserId))
  removeSnapshotData(projectId, scopeUserId)

  const index = loadProjectsIndexFromLocalStorage(scopeUserId)
  const projects = index.projects.filter((entry) => entry.projectId !== projectId)
  const nextActive = index.activeProjectId === projectId ? (projects[0]?.projectId ?? null) : index.activeProjectId

  saveIndex(
    {
      version: 2,
      activeProjectId: nextActive,
      projects
    },
    scopeUserId
  )
}

export function ensureLocalProjectState(
  createInitialProject: () => ProjectV1,
  scopeUserId?: string | null
): {
  project: ProjectV1
  activeProjectId: string
  projects: LocalProjectSummary[]
} {
  const index = loadProjectsIndexFromLocalStorage(scopeUserId)
  const checked: LocalProjectSummary[] = []

  for (const summary of index.projects) {
    const loaded = loadProjectFromLocalStorage(summary.projectId, scopeUserId)
    if (!loaded) {
      continue
    }

    if (!isUuid(summary.projectId) || loaded.metadata.id !== summary.projectId) {
      const migrated = saveProjectByIdLocally(
        summary.projectId,
        loaded,
        {
          updatedAtIso: summary.updatedAtIso,
          setActive: summary.projectId === index.activeProjectId
        },
        scopeUserId
      )
      checked.push(migrated)
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
    const created = createLocalProject(initialProject, scopeUserId)
    const loaded = loadProjectFromLocalStorage(created.projectId, scopeUserId)
    return {
      project: loaded ?? initialProject,
      activeProjectId: created.projectId,
      projects: [created]
    }
  }

  const activeFromStorage = loadProjectsIndexFromLocalStorage(scopeUserId).activeProjectId
  const activeProjectId = checked.some((entry) => entry.projectId === activeFromStorage)
    ? activeFromStorage!
    : checked[0]!.projectId
  const activeProject = loadProjectFromLocalStorage(activeProjectId, scopeUserId)

  saveIndex(
    {
      version: 2,
      activeProjectId,
      projects: checked
    },
    scopeUserId
  )

  if (activeProject) {
    return {
      project: activeProject,
      activeProjectId,
      projects: checked
    }
  }

  // Active entry became invalid unexpectedly between reads. Recreate a safe fallback.
  const fallbackProject = createInitialProject()
  const created = createLocalProject(fallbackProject, scopeUserId)
  const loaded = loadProjectFromLocalStorage(created.projectId, scopeUserId)

  return {
    project: loaded ?? fallbackProject,
    activeProjectId: created.projectId,
    projects: listLocalProjects(scopeUserId)
  }
}

function migrateV3SnapshotsIfNeeded(projectId: string, scopeUserId?: string | null): void {
  const kv = getKvStorageProvider()
  const oldKey = snapshotKey(projectId, scopeUserId)
  const source = kv.getItem(oldKey)
  if (!source) return

  try {
    const parsed = JSON.parse(source) as unknown
    if (!Array.isArray(parsed)) {
      kv.removeItem(oldKey)
      return
    }

    const meta: LocalSnapshotMeta[] = []
    for (const value of parsed) {
      if (typeof value !== "object" || value === null) continue
      const candidate = value as Partial<LocalSnapshot>
      if (
        typeof candidate.id === "string" &&
        typeof candidate.label === "string" &&
        typeof candidate.savedAtIso === "string" &&
        typeof candidate.projectSource === "string"
      ) {
        kv.setItem(snapshotDataKey(projectId, candidate.id, scopeUserId), candidate.projectSource)
        meta.push({ id: candidate.id, label: candidate.label, savedAtIso: candidate.savedAtIso })
      }
    }

    kv.setItem(snapshotIndexKey(projectId, scopeUserId), JSON.stringify(meta))
    kv.removeItem(oldKey)
  } catch {
    kv.removeItem(oldKey)
  }
}

export function loadSnapshotMetadata(projectId?: string, scopeUserId?: string | null): LocalSnapshotMeta[] {
  const targetProjectId = projectId ?? getActiveProjectIdFromLocalStorage(scopeUserId)
  if (!targetProjectId) {
    return []
  }

  migrateV3SnapshotsIfNeeded(targetProjectId, scopeUserId)

  const source = getKvStorageProvider().getItem(snapshotIndexKey(targetProjectId, scopeUserId))
  if (!source) {
    return []
  }

  try {
    const parsed = JSON.parse(source) as unknown
    if (!Array.isArray(parsed)) {
      return []
    }

    return parsed.filter((value): value is LocalSnapshotMeta => {
      if (typeof value !== "object" || value === null) {
        return false
      }
      const candidate = value as Partial<LocalSnapshotMeta>
      return (
        typeof candidate.id === "string" &&
        typeof candidate.label === "string" &&
        typeof candidate.savedAtIso === "string"
      )
    })
  } catch {
    return []
  }
}

/** @deprecated Use loadSnapshotMetadata instead. Kept for backward compatibility in tests. */
export function loadSnapshotsFromLocalStorage(projectId?: string, scopeUserId?: string | null): LocalSnapshotMeta[] {
  return loadSnapshotMetadata(projectId, scopeUserId)
}

export function saveCheckpointSnapshot(
  project: ProjectV1,
  label: string,
  projectId?: string,
  scopeUserId?: string | null
): LocalSnapshotMeta[] {
  const targetProjectId = projectId ?? getActiveProjectIdFromLocalStorage(scopeUserId)
  if (!targetProjectId) {
    return []
  }

  const kv = getKvStorageProvider()
  const snapshotId = generateUUID()
  const projectSource = cachedSerializeProjectV1(project)
  const newMeta: LocalSnapshotMeta = { id: snapshotId, label, savedAtIso: nowIso() }

  kv.setItem(snapshotDataKey(targetProjectId, snapshotId, scopeUserId), projectSource)

  const existing = loadSnapshotMetadata(targetProjectId, scopeUserId)
  const merged = [newMeta, ...existing].slice(0, MAX_SNAPSHOTS)

  // Clean up data keys for trimmed snapshots
  for (const trimmed of existing.slice(MAX_SNAPSHOTS - 1)) {
    kv.removeItem(snapshotDataKey(targetProjectId, trimmed.id, scopeUserId))
  }

  kv.setItem(snapshotIndexKey(targetProjectId, scopeUserId), JSON.stringify(merged))
  return merged
}

export function loadSnapshotProject(snapshotId: string, projectId?: string, scopeUserId?: string | null): ProjectV1 | null {
  const targetProjectId = projectId ?? getActiveProjectIdFromLocalStorage(scopeUserId)
  if (!targetProjectId) {
    return null
  }

  // Ensure migration before reading data keys
  migrateV3SnapshotsIfNeeded(targetProjectId, scopeUserId)

  const source = getKvStorageProvider().getItem(snapshotDataKey(targetProjectId, snapshotId, scopeUserId))
  if (!source) {
    return null
  }

  try {
    return loadProjectV1(source)
  } catch {
    return null
  }
}

export function listLegacyLocalProjects(): LocalProjectSummary[] {
  return loadLegacyProjectsIndex().projects
}

export function hasLegacyLocalProjects(): boolean {
  return listLegacyLocalProjects().length > 0
}

export function importLegacyLocalProjectsToScope(scopeUserId?: string | null): { imported: number; activeProjectId: string | null } {
  const legacyIndex = loadLegacyProjectsIndex()
  let imported = 0
  const cleanedLegacyProjectIds = new Set<string>()

  for (const summary of legacyIndex.projects) {
    const project = loadLegacyProjectFromLocalStorage(summary.projectId)
    if (!project) {
      // Legacy index can reference missing/corrupt records; prune them so prompts don't loop forever.
      cleanedLegacyProjectIds.add(summary.projectId)
      continue
    }

    const savedSummary = saveProjectByIdLocally(
      summary.projectId,
      project,
      {
        updatedAtIso: summary.updatedAtIso,
        setActive: summary.projectId === legacyIndex.activeProjectId
      },
      scopeUserId
    )

    const legacySnapshots = loadLegacySnapshotsFromLocalStorage(summary.projectId)
    if (legacySnapshots.length > 0) {
      const kv = getKvStorageProvider()
      const trimmed = legacySnapshots.slice(0, MAX_SNAPSHOTS)
      const meta: LocalSnapshotMeta[] = []
      for (const snap of trimmed) {
        kv.setItem(snapshotDataKey(savedSummary.projectId, snap.id, scopeUserId), snap.projectSource)
        meta.push({ id: snap.id, label: snap.label, savedAtIso: snap.savedAtIso })
      }
      kv.setItem(snapshotIndexKey(savedSummary.projectId, scopeUserId), JSON.stringify(meta))
    }

    imported += 1
    cleanedLegacyProjectIds.add(summary.projectId)
  }

  if (cleanedLegacyProjectIds.size > 0) {
    clearImportedLegacyEntries(legacyIndex, cleanedLegacyProjectIds)
  }

  return {
    imported,
    activeProjectId: getActiveProjectIdFromLocalStorage(scopeUserId)
  }
}
