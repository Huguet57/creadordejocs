import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { InMemoryKvProvider } from "./in-memory-kv-provider.js"
import { LocalStorageKvProvider } from "./local-storage-provider.js"
import { getKvStorageProvider, resetKvStorageProvider, setKvStorageProvider } from "./get-kv-storage-provider.js"
import type { KvStorageProvider } from "./kv-storage-provider.js"

describe("InMemoryKvProvider", () => {
  const createProvider = (): KvStorageProvider => new InMemoryKvProvider()

  it("returns null for missing keys", () => {
    expect(createProvider().getItem("nonexistent")).toBeNull()
  })

  it("stores and retrieves a value", () => {
    const provider = createProvider()
    provider.setItem("key", "value")
    expect(provider.getItem("key")).toBe("value")
  })

  it("overwrites existing values", () => {
    const provider = createProvider()
    provider.setItem("key", "old")
    provider.setItem("key", "new")
    expect(provider.getItem("key")).toBe("new")
  })

  it("removes a key", () => {
    const provider = createProvider()
    provider.setItem("key", "value")
    provider.removeItem("key")
    expect(provider.getItem("key")).toBeNull()
  })

  it("removing a non-existent key does not throw", () => {
    expect(() => createProvider().removeItem("missing")).not.toThrow()
  })
})

describe("LocalStorageKvProvider", () => {
  const store = new Map<string, string>()

  beforeEach(() => {
    store.clear()
    vi.stubGlobal("localStorage", {
      getItem: (key: string) => store.get(key) ?? null,
      setItem: (key: string, value: string) => store.set(key, value),
      removeItem: (key: string) => store.delete(key)
    })
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  const createProvider = (): KvStorageProvider => new LocalStorageKvProvider()

  it("returns null for missing keys", () => {
    expect(createProvider().getItem("nonexistent")).toBeNull()
  })

  it("stores and retrieves a value", () => {
    const provider = createProvider()
    provider.setItem("key", "value")
    expect(provider.getItem("key")).toBe("value")
  })

  it("overwrites existing values", () => {
    const provider = createProvider()
    provider.setItem("key", "old")
    provider.setItem("key", "new")
    expect(provider.getItem("key")).toBe("new")
  })

  it("removes a key", () => {
    const provider = createProvider()
    provider.setItem("key", "value")
    provider.removeItem("key")
    expect(provider.getItem("key")).toBeNull()
  })

  it("removing a non-existent key does not throw", () => {
    expect(() => createProvider().removeItem("missing")).not.toThrow()
  })

  it("returns null when localStorage is unavailable", () => {
    vi.stubGlobal("localStorage", {
      getItem: () => {
        throw new Error("SecurityError")
      }
    })
    expect(createProvider().getItem("key")).toBeNull()
  })
})

describe("getKvStorageProvider", () => {
  afterEach(() => {
    resetKvStorageProvider()
  })

  it("returns the same instance on repeated calls", () => {
    const first = getKvStorageProvider()
    const second = getKvStorageProvider()
    expect(first).toBe(second)
  })

  it("returns a new instance after reset", () => {
    const first = getKvStorageProvider()
    resetKvStorageProvider()
    const second = getKvStorageProvider()
    expect(first).not.toBe(second)
  })

  it("uses a custom provider after setKvStorageProvider", () => {
    const custom = new InMemoryKvProvider()
    setKvStorageProvider(custom)
    expect(getKvStorageProvider()).toBe(custom)
  })
})
