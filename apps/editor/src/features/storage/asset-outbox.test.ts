import { afterEach, beforeEach, describe, expect, it } from "vitest"
import { InMemoryKvProvider } from "./in-memory-kv-provider.js"
import { resetKvStorageProvider, setKvStorageProvider } from "./get-kv-storage-provider.js"
import {
  enqueueAssetUpload,
  listAssetOutboxItems,
  markAssetOutboxItemFailed,
  removeAssetOutboxItem
} from "./asset-outbox.js"

describe("asset-outbox", () => {
  let kv: InMemoryKvProvider

  beforeEach(() => {
    kv = new InMemoryKvProvider()
    setKvStorageProvider(kv)
  })

  afterEach(() => {
    resetKvStorageProvider()
  })

  it("enqueues pending asset upload entry", () => {
    enqueueAssetUpload({
      kind: "sprite",
      resourceId: "sprite-1",
      localAssetSource: "asset://indexeddb/sprite-1",
      localStoragePath: "sprite/sprite-1"
    })

    const outbox = listAssetOutboxItems()
    expect(outbox).toHaveLength(1)
    expect(outbox[0]?.kind).toBe("sprite")
    expect(outbox[0]?.attempts).toBe(0)
  })

  it("deduplicates by localAssetSource", () => {
    enqueueAssetUpload({
      kind: "sprite",
      resourceId: "sprite-1",
      localAssetSource: "asset://indexeddb/sprite-1",
      localStoragePath: "sprite/sprite-1"
    })
    enqueueAssetUpload({
      kind: "sprite",
      resourceId: "sprite-1",
      localAssetSource: "asset://indexeddb/sprite-1",
      localStoragePath: "sprite/sprite-1-v2"
    })

    const outbox = listAssetOutboxItems()
    expect(outbox).toHaveLength(1)
    expect(outbox[0]?.localStoragePath).toBe("sprite/sprite-1-v2")
  })

  it("marks failure with retry delay", () => {
    enqueueAssetUpload({
      kind: "sound",
      resourceId: "sound-1",
      localAssetSource: "asset://indexeddb/sound-1",
      localStoragePath: "sound/sound-1"
    })
    const item = listAssetOutboxItems()[0]
    expect(item).toBeDefined()

    markAssetOutboxItemFailed(item!.id, 10_000)
    const failed = listAssetOutboxItems()[0]
    expect(failed?.attempts).toBe(1)
    expect((failed?.nextRetryAtMs ?? 0) > 10_000).toBe(true)
  })

  it("removes item after successful sync", () => {
    enqueueAssetUpload({
      kind: "sound",
      resourceId: "sound-1",
      localAssetSource: "asset://indexeddb/sound-1",
      localStoragePath: "sound/sound-1"
    })
    const item = listAssetOutboxItems()[0]
    expect(item).toBeDefined()

    removeAssetOutboxItem(item!.id)
    expect(listAssetOutboxItems()).toEqual([])
  })
})
