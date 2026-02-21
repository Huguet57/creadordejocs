import { getAssetStorageProvider } from "./asset-storage-provider.js"
import { IndexedDbAssetStorageProvider } from "./providers/indexeddb-asset-storage-provider.js"

const INDEXEDDB_ASSET_SOURCE_PREFIX = "asset://indexeddb/"
const indexedDbProvider = new IndexedDbAssetStorageProvider()

function isAbsoluteHttpSource(value: string): boolean {
  return value.startsWith("http://") || value.startsWith("https://")
}

export async function resolveAssetSource(assetSource: string): Promise<string | null> {
  const normalized = assetSource.trim()
  if (!normalized) {
    return null
  }

  if (isAbsoluteHttpSource(normalized)) {
    return normalized
  }

  if (normalized.startsWith(INDEXEDDB_ASSET_SOURCE_PREFIX)) {
    return indexedDbProvider.resolve(normalized)
  }

  const provider = await getAssetStorageProvider()
  return provider.resolve(normalized)
}
