import type { AssetStorageProvider, UploadAssetInput, UploadAssetResult } from "../asset-storage-provider.js"

const DB_NAME = "creadordejocs-assets-db"
const DB_VERSION = 1
const STORE_NAME = "uploaded_assets"
const SOURCE_PREFIX = "asset://indexeddb/"

type StoredAssetRecord = {
  id: string
  kind: "sprite" | "sound"
  resourceId: string
  fileName: string
  mimeType: string
  blob: Blob
  createdAt: number
}

export class IndexedDbAssetStorageProvider implements AssetStorageProvider {
  async upload({ file, kind, resourceId }: UploadAssetInput): Promise<UploadAssetResult> {
    const id = buildStoragePath({ fileName: file.name, kind, resourceId })
    const record: StoredAssetRecord = {
      id,
      kind,
      resourceId,
      fileName: file.name,
      mimeType: file.type || "application/octet-stream",
      blob: file,
      createdAt: Date.now()
    }

    const db = await openDatabase()
    await putRecord(db, record)

    return {
      assetSource: `${SOURCE_PREFIX}${id}`,
      storagePath: id
    }
  }
}

export async function resolveIndexedDbAssetSourceToObjectUrl(assetSource: string): Promise<string | null> {
  if (!assetSource.startsWith(SOURCE_PREFIX)) {
    return null
  }
  const id = assetSource.slice(SOURCE_PREFIX.length)
  if (!id) {
    return null
  }
  const db = await openDatabase()
  const record = await getRecord(db, id)
  if (!record) {
    return null
  }
  return URL.createObjectURL(record.blob)
}

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION)
    request.onerror = () => reject(request.error ?? new Error("IndexedDB open failed."))
    request.onupgradeneeded = () => {
      const db = request.result
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: "id" })
        store.createIndex("createdAt", "createdAt", { unique: false })
      }
    }
    request.onsuccess = () => resolve(request.result)
  })
}

function putRecord(db: IDBDatabase, record: StoredAssetRecord): Promise<void> {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, "readwrite")
    transaction.onerror = () => reject(transaction.error ?? new Error("IndexedDB write failed."))
    const store = transaction.objectStore(STORE_NAME)
    store.put(record)
    transaction.oncomplete = () => resolve()
  })
}

function getRecord(db: IDBDatabase, id: string): Promise<StoredAssetRecord | null> {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, "readonly")
    transaction.onerror = () => reject(transaction.error ?? new Error("IndexedDB read failed."))
    const store = transaction.objectStore(STORE_NAME)
    const request = store.get(id)
    request.onerror = () => reject(request.error ?? new Error("IndexedDB read failed."))
    request.onsuccess = () => resolve((request.result as StoredAssetRecord | undefined) ?? null)
  })
}

function buildStoragePath({
  fileName,
  kind,
  resourceId
}: {
  fileName: string
  kind: "sprite" | "sound"
  resourceId: string
}): string {
  const extension = getFileExtension(fileName) ?? "bin"
  const safeName = sanitizeName(fileName.replace(/\.[^/.]+$/, ""))
  const randomPart = crypto.randomUUID()
  return `${kind}/${resourceId}/${Date.now()}-${randomPart}-${safeName}.${extension}`
}

function getFileExtension(fileName: string): string | null {
  const fileExtensionRegExp = /\.([a-z0-9]+)$/i
  const match = fileExtensionRegExp.exec(fileName.toLowerCase())
  return match?.[1] ?? null
}

function sanitizeName(value: string): string {
  const normalized = value
    .toLowerCase()
    .replace(/[^a-z0-9-_]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
  return normalized || "asset"
}
