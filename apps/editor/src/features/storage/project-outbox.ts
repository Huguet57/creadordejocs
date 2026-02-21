import { generateUUID } from "@creadordejocs/project-format"
import { getKvStorageProvider } from "./get-kv-storage-provider.js"

const PROJECT_OUTBOX_KEY_PREFIX = "creadordejocs.editor.project-outbox.v1."
const RETRY_BASE_MS = 2000
const RETRY_MAX_MS = 5 * 60 * 1000

export type ProjectOutboxOperation = "upsert" | "delete"

export type ProjectOutboxItem = {
  id: string
  projectId: string
  operation: ProjectOutboxOperation
  name: string | null
  projectSource: string | null
  updatedAtIso: string
  attempts: number
  nextRetryAtMs: number
  createdAtMs: number
}

type EnqueueUpsertInput = {
  projectId: string
  name: string
  projectSource: string
  updatedAtIso: string
}

type EnqueueDeleteInput = {
  projectId: string
  updatedAtIso: string
}

function normalizeScope(scopeUserId: string): string {
  const trimmed = scopeUserId.trim()
  if (!trimmed) {
    return "__local__"
  }
  return trimmed.replace(/[^a-zA-Z0-9_.-]+/g, "_")
}

function outboxKey(scopeUserId: string): string {
  return `${PROJECT_OUTBOX_KEY_PREFIX}${normalizeScope(scopeUserId)}`
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null
}

function isProjectOutboxItem(value: unknown): value is ProjectOutboxItem {
  if (!isRecord(value)) {
    return false
  }

  return (
    typeof value.id === "string" &&
    typeof value.projectId === "string" &&
    (value.operation === "upsert" || value.operation === "delete") &&
    (typeof value.name === "string" || value.name === null) &&
    (typeof value.projectSource === "string" || value.projectSource === null) &&
    typeof value.updatedAtIso === "string" &&
    typeof value.attempts === "number" &&
    typeof value.nextRetryAtMs === "number" &&
    typeof value.createdAtMs === "number"
  )
}

function loadOutbox(scopeUserId: string): ProjectOutboxItem[] {
  const source = getKvStorageProvider().getItem(outboxKey(scopeUserId))
  if (!source) {
    return []
  }

  try {
    const parsed = JSON.parse(source) as unknown
    if (!Array.isArray(parsed)) {
      return []
    }
    return parsed.filter((entry): entry is ProjectOutboxItem => isProjectOutboxItem(entry))
  } catch {
    return []
  }
}

function byPriority(left: ProjectOutboxItem, right: ProjectOutboxItem): number {
  if (left.nextRetryAtMs !== right.nextRetryAtMs) {
    return left.nextRetryAtMs - right.nextRetryAtMs
  }
  return left.createdAtMs - right.createdAtMs
}

function saveOutbox(scopeUserId: string, entries: ProjectOutboxItem[]): ProjectOutboxItem[] {
  const normalized = [...entries].sort(byPriority)
  getKvStorageProvider().setItem(outboxKey(scopeUserId), JSON.stringify(normalized))
  return normalized
}

function replaceEntriesForProject(entries: ProjectOutboxItem[], projectId: string, replacement: ProjectOutboxItem): ProjectOutboxItem[] {
  const filtered = entries.filter((entry) => entry.projectId !== projectId)
  return [...filtered, replacement]
}

export function listProjectOutboxItems(scopeUserId: string): ProjectOutboxItem[] {
  return [...loadOutbox(scopeUserId)].sort(byPriority)
}

export function enqueueProjectUpsert(scopeUserId: string, input: EnqueueUpsertInput): ProjectOutboxItem {
  const nowMs = Date.now()
  const outboxItem: ProjectOutboxItem = {
    id: generateUUID(),
    projectId: input.projectId,
    operation: "upsert",
    name: input.name,
    projectSource: input.projectSource,
    updatedAtIso: input.updatedAtIso,
    attempts: 0,
    nextRetryAtMs: 0,
    createdAtMs: nowMs
  }

  const current = loadOutbox(scopeUserId)
  saveOutbox(scopeUserId, replaceEntriesForProject(current, input.projectId, outboxItem))
  return outboxItem
}

export function enqueueProjectDelete(scopeUserId: string, input: EnqueueDeleteInput): ProjectOutboxItem {
  const nowMs = Date.now()
  const outboxItem: ProjectOutboxItem = {
    id: generateUUID(),
    projectId: input.projectId,
    operation: "delete",
    name: null,
    projectSource: null,
    updatedAtIso: input.updatedAtIso,
    attempts: 0,
    nextRetryAtMs: 0,
    createdAtMs: nowMs
  }

  const current = loadOutbox(scopeUserId)
  saveOutbox(scopeUserId, replaceEntriesForProject(current, input.projectId, outboxItem))
  return outboxItem
}

function getRetryDelayMs(nextAttempt: number): number {
  return Math.min(RETRY_BASE_MS * 2 ** Math.max(0, nextAttempt - 1), RETRY_MAX_MS)
}

export function markProjectOutboxItemFailed(scopeUserId: string, itemId: string, nowMs = Date.now()): void {
  const current = loadOutbox(scopeUserId)
  const next = current.map((entry) => {
    if (entry.id !== itemId) {
      return entry
    }
    const attempts = entry.attempts + 1
    return {
      ...entry,
      attempts,
      nextRetryAtMs: nowMs + getRetryDelayMs(attempts)
    }
  })
  saveOutbox(scopeUserId, next)
}

export function removeProjectOutboxItem(scopeUserId: string, itemId: string): void {
  const current = loadOutbox(scopeUserId)
  const next = current.filter((entry) => entry.id !== itemId)
  saveOutbox(scopeUserId, next)
}

export function copyProjectOutboxItems(sourceScopeUserId: string, targetScopeUserId: string): number {
  const source = loadOutbox(sourceScopeUserId)
  if (!source.length) {
    return 0
  }

  const target = loadOutbox(targetScopeUserId)
  const targetByProjectId = new Map(target.map((entry) => [entry.projectId, entry] as const))
  let copied = 0

  for (const sourceItem of source) {
    targetByProjectId.set(sourceItem.projectId, {
      ...sourceItem,
      id: generateUUID(),
      attempts: 0,
      nextRetryAtMs: 0,
      createdAtMs: Date.now()
    })
    copied += 1
  }

  saveOutbox(targetScopeUserId, [...targetByProjectId.values()])
  return copied
}
