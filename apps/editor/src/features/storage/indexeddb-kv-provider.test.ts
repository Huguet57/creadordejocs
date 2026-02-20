import "fake-indexeddb/auto"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { IndexedDbKvProvider } from "./indexeddb-kv-provider.js"

const DB_NAME = "creadordejocs-kv-db"

function deleteDatabase(): Promise<void> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.deleteDatabase(DB_NAME)
    request.onsuccess = () => resolve()
    request.onerror = () => reject(request.error ?? new Error("deleteDatabase failed"))
    request.onblocked = () => resolve()
  })
}

/** Let pending microtasks (IDB writes) flush. */
function flush(): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, 50))
}

describe("IndexedDbKvProvider", () => {
  let provider: IndexedDbKvProvider

  beforeEach(async () => {
    provider = new IndexedDbKvProvider()
    await provider.init()
  })

  afterEach(async () => {
    await flush()
    provider.close()
    await deleteDatabase()
  })

  it("returns null for missing keys", () => {
    expect(provider.getItem("nonexistent")).toBeNull()
  })

  it("stores and retrieves a value", () => {
    provider.setItem("key", "value")
    expect(provider.getItem("key")).toBe("value")
  })

  it("overwrites existing values", () => {
    provider.setItem("key", "old")
    provider.setItem("key", "new")
    expect(provider.getItem("key")).toBe("new")
  })

  it("removes a key", () => {
    provider.setItem("key", "value")
    provider.removeItem("key")
    expect(provider.getItem("key")).toBeNull()
  })

  it("removing a non-existent key does not throw", () => {
    expect(() => provider.removeItem("missing")).not.toThrow()
  })

  it("persists data to IndexedDB and reloads on init", async () => {
    provider.setItem("creadordejocs.test.a", "alpha")
    provider.setItem("creadordejocs.test.b", "beta")
    await flush()
    provider.close()

    const fresh = new IndexedDbKvProvider()
    await fresh.init()

    expect(fresh.getItem("creadordejocs.test.a")).toBe("alpha")
    expect(fresh.getItem("creadordejocs.test.b")).toBe("beta")

    fresh.close()
  })

  it("persists remove to IndexedDB", async () => {
    provider.setItem("creadordejocs.test.x", "exists")
    await flush()

    provider.removeItem("creadordejocs.test.x")
    await flush()
    provider.close()

    const fresh = new IndexedDbKvProvider()
    await fresh.init()

    expect(fresh.getItem("creadordejocs.test.x")).toBeNull()

    fresh.close()
  })
})

describe("IndexedDbKvProvider — localStorage migration", () => {
  const store = new Map<string, string>()

  beforeEach(() => {
    store.clear()
    vi.stubGlobal("localStorage", {
      get length() {
        return store.size
      },
      key(index: number) {
        return [...store.keys()][index] ?? null
      },
      getItem(key: string) {
        return store.get(key) ?? null
      },
      setItem(key: string, value: string) {
        store.set(key, value)
      },
      removeItem(key: string) {
        store.delete(key)
      }
    })
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it("migrates localStorage data with creadordejocs prefix on first init", async () => {
    store.set("creadordejocs.editor.projects-index.v2", '{"version":2}')
    store.set("creadordejocs.editor.project.v2.abc", '{"test":true}')
    store.set("unrelated-key", "should-be-ignored")

    const provider = new IndexedDbKvProvider()
    await provider.init()

    expect(provider.getItem("creadordejocs.editor.projects-index.v2")).toBe('{"version":2}')
    expect(provider.getItem("creadordejocs.editor.project.v2.abc")).toBe('{"test":true}')
    expect(provider.getItem("unrelated-key")).toBeNull()

    provider.close()
    await deleteDatabase()
  })

  it("does not re-migrate when IDB already has data", async () => {
    const first = new IndexedDbKvProvider()
    await first.init()
    first.setItem("creadordejocs.existing", "from-idb")
    await flush()
    first.close()

    // Add localStorage data that should NOT be migrated
    store.set("creadordejocs.new-key", "from-localstorage")

    const second = new IndexedDbKvProvider()
    await second.init()

    expect(second.getItem("creadordejocs.existing")).toBe("from-idb")
    expect(second.getItem("creadordejocs.new-key")).toBeNull()

    second.close()
    await deleteDatabase()
  })
})
