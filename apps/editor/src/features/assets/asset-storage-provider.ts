import { IndexedDbAssetStorageProvider } from "./providers/indexeddb-asset-storage-provider.js"
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
}

let providerPromise: Promise<AssetStorageProvider> | null = null

export async function getAssetStorageProvider(): Promise<AssetStorageProvider> {
  if (providerPromise) {
    return providerPromise
  }

  providerPromise = loadProvider()
  return providerPromise
}

async function loadProvider(): Promise<AssetStorageProvider> {
  const configuredProvider = import.meta.env.VITE_ASSET_STORAGE_PROVIDER ?? "indexeddb"
  if (configuredProvider === "supabase") {
    const module = await import("./providers/supabase-asset-storage-provider.js")
    return new module.SupabaseAssetStorageProvider()
  }
  return new IndexedDbAssetStorageProvider()
}
