import { describe, expect, it, vi } from "vitest"
import { HybridSupabaseAssetStorageProvider } from "./hybrid-supabase-asset-storage-provider.js"

describe("HybridSupabaseAssetStorageProvider", () => {
  it("uses Supabase upload when available", async () => {
    const supabaseUpload = vi.fn().mockResolvedValue({
      assetSource: "https://cdn.example.com/sprite.png",
      storagePath: "sprite/remote"
    })
    const indexedDbUpload = vi.fn()
    const enqueue = vi.fn()

    const provider = new HybridSupabaseAssetStorageProvider(
      {
        upload: supabaseUpload,
        resolve: vi.fn()
      },
      {
        upload: indexedDbUpload,
        resolve: vi.fn(),
        getFileByStoragePath: vi.fn()
      } as never,
      {
        enqueue,
        list: vi.fn().mockReturnValue([]),
        markFailed: vi.fn(),
        remove: vi.fn()
      }
    )

    const file = new File(["data"], "sprite.png", { type: "image/png" })
    const result = await provider.upload({
      file,
      kind: "sprite",
      resourceId: "sprite-1"
    })

    expect(result.assetSource).toBe("https://cdn.example.com/sprite.png")
    expect(indexedDbUpload).not.toHaveBeenCalled()
    expect(enqueue).not.toHaveBeenCalled()
  })

  it("falls back to IndexedDB and enqueues outbox when Supabase upload fails", async () => {
    const supabaseUpload = vi.fn().mockRejectedValue(new Error("network down"))
    const indexedDbUpload = vi.fn().mockResolvedValue({
      assetSource: "asset://indexeddb/sprite-local",
      storagePath: "sprite/sprite-local"
    })
    const enqueue = vi.fn()

    const provider = new HybridSupabaseAssetStorageProvider(
      {
        upload: supabaseUpload,
        resolve: vi.fn()
      },
      {
        upload: indexedDbUpload,
        resolve: vi.fn(),
        getFileByStoragePath: vi.fn()
      } as never,
      {
        enqueue,
        list: vi.fn().mockReturnValue([]),
        markFailed: vi.fn(),
        remove: vi.fn()
      }
    )

    const file = new File(["data"], "sprite.png", { type: "image/png" })
    const result = await provider.upload({
      file,
      kind: "sprite",
      resourceId: "sprite-1"
    })

    expect(result.assetSource).toBe("asset://indexeddb/sprite-local")
    expect(enqueue).toHaveBeenCalledWith(
      expect.objectContaining({
        kind: "sprite",
        resourceId: "sprite-1",
        localAssetSource: "asset://indexeddb/sprite-local",
        localStoragePath: "sprite/sprite-local"
      })
    )
  })

  it("flushes pending uploads and returns promoted sources", async () => {
    const supabaseUpload = vi.fn().mockResolvedValue({
      assetSource: "https://cdn.example.com/sprite-1.png",
      storagePath: "sprite/remote"
    })
    const remove = vi.fn()

    const provider = new HybridSupabaseAssetStorageProvider(
      {
        upload: supabaseUpload,
        resolve: vi.fn()
      },
      {
        upload: vi.fn(),
        resolve: vi.fn(),
        getFileByStoragePath: vi.fn().mockResolvedValue(new File(["data"], "sprite.png", { type: "image/png" }))
      } as never,
      {
        enqueue: vi.fn(),
        list: vi.fn().mockReturnValue([
          {
            id: "item-1",
            kind: "sprite",
            resourceId: "sprite-1",
            localAssetSource: "asset://indexeddb/sprite-local",
            localStoragePath: "sprite/sprite-local",
            attempts: 0,
            nextRetryAtMs: 0,
            createdAtMs: 1
          }
        ]),
        markFailed: vi.fn(),
        remove
      }
    )

    const promoted = await provider.flushPendingUploads()
    expect(promoted).toEqual([
      {
        kind: "sprite",
        resourceId: "sprite-1",
        fromAssetSource: "asset://indexeddb/sprite-local",
        toAssetSource: "https://cdn.example.com/sprite-1.png"
      }
    ])
    expect(remove).toHaveBeenCalledWith("item-1")
  })
})
