import type { AssetKind } from "../asset-upload.js"
import type { AssetStorageProvider, UploadAssetInput, UploadAssetResult } from "../asset-storage-provider.js"
import { enqueueAssetUpload, listAssetOutboxItems, markAssetOutboxItemFailed, removeAssetOutboxItem } from "../../storage/asset-outbox.js"
import { IndexedDbAssetStorageProvider } from "./indexeddb-asset-storage-provider.js"
import { SupabaseAssetStorageProvider } from "./supabase-asset-storage-provider.js"

export type AssetSourcePromotion = {
  kind: AssetKind
  resourceId: string
  fromAssetSource: string
  toAssetSource: string
}

type AssetOutboxDeps = {
  enqueue: typeof enqueueAssetUpload
  list: typeof listAssetOutboxItems
  markFailed: typeof markAssetOutboxItemFailed
  remove: typeof removeAssetOutboxItem
}

const defaultOutboxDeps: AssetOutboxDeps = {
  enqueue: enqueueAssetUpload,
  list: listAssetOutboxItems,
  markFailed: markAssetOutboxItemFailed,
  remove: removeAssetOutboxItem
}

export class HybridSupabaseAssetStorageProvider implements AssetStorageProvider {
  constructor(
    private readonly supabaseProvider: AssetStorageProvider = new SupabaseAssetStorageProvider(),
    private readonly indexedDbProvider: IndexedDbAssetStorageProvider = new IndexedDbAssetStorageProvider(),
    private readonly outbox: AssetOutboxDeps = defaultOutboxDeps
  ) {}

  async upload(input: UploadAssetInput): Promise<UploadAssetResult> {
    try {
      return await this.supabaseProvider.upload(input)
    } catch {
      const localResult = await this.indexedDbProvider.upload(input)
      this.outbox.enqueue({
        kind: input.kind,
        resourceId: input.resourceId,
        localAssetSource: localResult.assetSource,
        localStoragePath: localResult.storagePath
      })
      return localResult
    }
  }

  async resolve(assetSource: string): Promise<string | null> {
    const localResolved = await this.indexedDbProvider.resolve(assetSource)
    if (localResolved) {
      return localResolved
    }
    return this.supabaseProvider.resolve(assetSource)
  }

  async flushPendingUploads(): Promise<AssetSourcePromotion[]> {
    const promotions: AssetSourcePromotion[] = []
    const nowMs = Date.now()
    const pending = this.outbox.list()

    for (const item of pending) {
      if (item.nextRetryAtMs > nowMs) {
        continue
      }

      const file = await this.indexedDbProvider.getFileByStoragePath(item.localStoragePath)
      if (!file) {
        this.outbox.remove(item.id)
        continue
      }

      try {
        const uploaded = await this.supabaseProvider.upload({
          file,
          kind: item.kind,
          resourceId: item.resourceId
        })
        this.outbox.remove(item.id)
        promotions.push({
          kind: item.kind,
          resourceId: item.resourceId,
          fromAssetSource: item.localAssetSource,
          toAssetSource: uploaded.assetSource
        })
      } catch {
        this.outbox.markFailed(item.id, nowMs)
      }
    }

    return promotions
  }
}
