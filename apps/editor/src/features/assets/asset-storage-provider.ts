import { IndexedDbAssetStorageProvider } from "./providers/indexeddb-asset-storage-provider.js"
import type { AssetSourcePromotion } from "./providers/hybrid-supabase-asset-storage-provider.js"
import type { AssetKind } from "./asset-upload.js"

export type UploadAssetInput = {
  file: File
  kind: AssetKind
  resourceId: string
}

export type UploadAssetResult = {
  assetSource: string
  storagePath: string
}

export type AssetStorageProvider = {
  upload(input: UploadAssetInput): Promise<UploadAssetResult>
  resolve(assetSource: string): Promise<string | null>
  flushPendingUploads?(): Promise<AssetSourcePromotion[]>
}

let providerPromise: Promise<AssetStorageProvider> | null = null

export async function getAssetStorageProvider(): Promise<AssetStorageProvider> {
  if (providerPromise) {
    return providerPromise
  }

  providerPromise = loadProvider()
  return providerPromise
}

export async function flushPendingAssetUploads(): Promise<AssetSourcePromotion[]> {
  const provider = await getAssetStorageProvider()
  if (!provider.flushPendingUploads) {
    return []
  }
  return provider.flushPendingUploads()
}

async function loadProvider(): Promise<AssetStorageProvider> {
  const configuredProvider = import.meta.env.VITE_ASSET_STORAGE_PROVIDER ?? "supabase"
  if (configuredProvider === "supabase") {
    const module = await import("./providers/hybrid-supabase-asset-storage-provider.js")
    return new module.HybridSupabaseAssetStorageProvider()
  }
  return new IndexedDbAssetStorageProvider()
}
