import type { KvStorageProvider } from "./kv-storage-provider.js"

const DB_NAME = "creadordejocs-kv-db"
const DB_VERSION = 1
const STORE_NAME = "kv"
const MIGRATION_PREFIX = "creadordejocs"

type KvRecord = {
  key: string
  value: string
}

export class IndexedDbKvProvider implements KvStorageProvider {
  private readonly cache = new Map<string, string>()
  private db: IDBDatabase | null = null

  async init(): Promise<void> {
    this.db = await openDatabase()
    const records = await getAllRecords(this.db)

    if (records.length > 0) {
      for (const record of records) {
        this.cache.set(record.key, record.value)
      }
      return
    }

    // IDB is empty — migrate from localStorage if available
    const migrated = migrateFromLocalStorage()
    if (migrated.length > 0) {
      await putRecords(this.db, migrated)
      for (const record of migrated) {
        this.cache.set(record.key, record.value)
      }
    }
  }

  getItem(key: string): string | null {
    return this.cache.get(key) ?? null
  }

  setItem(key: string, value: string): void {
    this.cache.set(key, value)
    if (this.db) {
      void persistSet(this.db, key, value)
    }
  }

  removeItem(key: string): void {
    this.cache.delete(key)
    if (this.db) {
      void persistRemove(this.db, key)
    }
  }

  /** Closes the underlying IDB connection. Useful for tests. */
  close(): void {
    this.db?.close()
    this.db = null
  }
}

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION)
    request.onerror = () => reject(request.error ?? new Error("IndexedDB open failed."))
    request.onupgradeneeded = () => {
      const db = request.result
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: "key" })
      }
    }
    request.onsuccess = () => resolve(request.result)
  })
}

function getAllRecords(db: IDBDatabase): Promise<KvRecord[]> {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, "readonly")
    transaction.onerror = () => reject(transaction.error ?? new Error("IndexedDB read failed."))
    const store = transaction.objectStore(STORE_NAME)
    const request = store.getAll()
    request.onerror = () => reject(request.error ?? new Error("IndexedDB getAll failed."))
    request.onsuccess = () => resolve((request.result as KvRecord[]) ?? [])
  })
}

function persistSet(db: IDBDatabase, key: string, value: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, "readwrite")
    transaction.onerror = () => reject(transaction.error ?? new Error("IndexedDB write failed."))
    const store = transaction.objectStore(STORE_NAME)
    store.put({ key, value } satisfies KvRecord)
    transaction.oncomplete = () => resolve()
  })
}

function persistRemove(db: IDBDatabase, key: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, "readwrite")
    transaction.onerror = () => reject(transaction.error ?? new Error("IndexedDB delete failed."))
    const store = transaction.objectStore(STORE_NAME)
    store.delete(key)
    transaction.oncomplete = () => resolve()
  })
}

function putRecords(db: IDBDatabase, records: KvRecord[]): Promise<void> {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, "readwrite")
    transaction.onerror = () => reject(transaction.error ?? new Error("IndexedDB batch write failed."))
    const store = transaction.objectStore(STORE_NAME)
    for (const record of records) {
      store.put(record)
    }
    transaction.oncomplete = () => resolve()
  })
}

function migrateFromLocalStorage(): KvRecord[] {
  const records: KvRecord[] = []
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i)
      if (!key?.startsWith(MIGRATION_PREFIX)) {
        continue
      }
      const value = localStorage.getItem(key)
      if (value !== null) {
        records.push({ key, value })
      }
    }
  } catch {
    // localStorage unavailable — nothing to migrate
  }
  return records
}
