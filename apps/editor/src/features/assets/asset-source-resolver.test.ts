import { afterEach, describe, expect, it, vi } from "vitest"
import { resolveAssetSource } from "./asset-source-resolver.js"

const remoteResolveMock = vi.fn((source: string) => Promise.resolve(`remote:${source}`))
const indexedDbResolveMock = vi.fn((source: string) => Promise.resolve(`local:${source}`))

vi.mock("./asset-storage-provider.js", () => ({
  getAssetStorageProvider: () =>
    Promise.resolve({
      upload: vi.fn(),
      resolve: (...args: [string]) => remoteResolveMock(...args)
    })
}))

vi.mock("./providers/indexeddb-asset-storage-provider.js", () => ({
  IndexedDbAssetStorageProvider: class {
    resolve(assetSource: string) {
      return indexedDbResolveMock(assetSource)
    }
  }
}))

describe("resolveAssetSource", () => {
  afterEach(() => {
    remoteResolveMock.mockClear()
    indexedDbResolveMock.mockClear()
  })

  it("returns null for empty string", async () => {
    expect(await resolveAssetSource("")).toBeNull()
  })

  it("returns null for whitespace-only string", async () => {
    expect(await resolveAssetSource("   ")).toBeNull()
  })

  it("returns https URL as-is without provider lookup", async () => {
    const result = await resolveAssetSource("https://cdn.example.com/image.png")
    expect(result).toBe("https://cdn.example.com/image.png")
    expect(remoteResolveMock).not.toHaveBeenCalled()
    expect(indexedDbResolveMock).not.toHaveBeenCalled()
  })

  it("resolves indexeddb sources with IndexedDb provider", async () => {
    const result = await resolveAssetSource("asset://indexeddb/sprite-1")
    expect(result).toBe("local:asset://indexeddb/sprite-1")
    expect(indexedDbResolveMock).toHaveBeenCalledWith("asset://indexeddb/sprite-1")
    expect(remoteResolveMock).not.toHaveBeenCalled()
  })

  it("delegates non-indexeddb non-http sources to configured provider", async () => {
    const result = await resolveAssetSource("asset://supabase/sprite-1")
    expect(result).toBe("remote:asset://supabase/sprite-1")
    expect(remoteResolveMock).toHaveBeenCalledWith("asset://supabase/sprite-1")
  })

  it("trims whitespace before resolving", async () => {
    const result = await resolveAssetSource("  asset://indexeddb/sprite-2  ")
    expect(result).toBe("local:asset://indexeddb/sprite-2")
    expect(indexedDbResolveMock).toHaveBeenCalledWith("asset://indexeddb/sprite-2")
  })
})
