import { generateUUID } from "@creadordejocs/project-format"
import type { AssetKind } from "../assets/asset-upload.js"
import { getKvStorageProvider } from "./get-kv-storage-provider.js"

const ASSET_OUTBOX_KEY = "creadordejocs.editor.asset-outbox.v1"
const RETRY_BASE_MS = 2000
const RETRY_MAX_MS = 5 * 60 * 1000

export type AssetOutboxItem = {
  id: string
  kind: AssetKind
  resourceId: string
  localAssetSource: string
  localStoragePath: string
  attempts: number
  nextRetryAtMs: number
  createdAtMs: number
}

type EnqueueAssetUploadInput = {
  kind: AssetKind
  resourceId: string
  localAssetSource: string
  localStoragePath: string
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null
}

function isAssetOutboxItem(value: unknown): value is AssetOutboxItem {
  if (!isRecord(value)) {
    return false
  }
  return (
    typeof value.id === "string" &&
    (value.kind === "sprite" || value.kind === "sound") &&
    typeof value.resourceId === "string" &&
    typeof value.localAssetSource === "string" &&
    typeof value.localStoragePath === "string" &&
    typeof value.attempts === "number" &&
    typeof value.nextRetryAtMs === "number" &&
    typeof value.createdAtMs === "number"
  )
}

function byPriority(left: AssetOutboxItem, right: AssetOutboxItem): number {
  if (left.nextRetryAtMs !== right.nextRetryAtMs) {
    return left.nextRetryAtMs - right.nextRetryAtMs
  }
  return left.createdAtMs - right.createdAtMs
}

function loadOutbox(): AssetOutboxItem[] {
  const source = getKvStorageProvider().getItem(ASSET_OUTBOX_KEY)
  if (!source) {
    return []
  }

  try {
    const parsed = JSON.parse(source) as unknown
    if (!Array.isArray(parsed)) {
      return []
    }
    return parsed.filter((entry): entry is AssetOutboxItem => isAssetOutboxItem(entry))
  } catch {
    return []
  }
}

function saveOutbox(entries: AssetOutboxItem[]): AssetOutboxItem[] {
  const normalized = [...entries].sort(byPriority)
  getKvStorageProvider().setItem(ASSET_OUTBOX_KEY, JSON.stringify(normalized))
  return normalized
}

function getRetryDelayMs(nextAttempt: number): number {
  return Math.min(RETRY_BASE_MS * 2 ** Math.max(0, nextAttempt - 1), RETRY_MAX_MS)
}

export function listAssetOutboxItems(): AssetOutboxItem[] {
  return [...loadOutbox()].sort(byPriority)
}

export function enqueueAssetUpload(input: EnqueueAssetUploadInput): AssetOutboxItem {
  const nowMs = Date.now()
  const current = loadOutbox()
  const nextItem: AssetOutboxItem = {
    id: generateUUID(),
    kind: input.kind,
    resourceId: input.resourceId,
    localAssetSource: input.localAssetSource,
    localStoragePath: input.localStoragePath,
    attempts: 0,
    nextRetryAtMs: 0,
    createdAtMs: nowMs
  }

  const next = [...current.filter((entry) => entry.localAssetSource !== input.localAssetSource), nextItem]
  saveOutbox(next)
  return nextItem
}

export function markAssetOutboxItemFailed(itemId: string, nowMs = Date.now()): void {
  const current = loadOutbox()
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
  saveOutbox(next)
}

export function removeAssetOutboxItem(itemId: string): void {
  const current = loadOutbox()
  saveOutbox(current.filter((entry) => entry.id !== itemId))
}
