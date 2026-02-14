import { resolveIndexedDbAssetSourceToObjectUrl } from "./providers/indexeddb-asset-storage-provider.js"

export async function resolveAssetSource(assetSource: string): Promise<string | null> {
  const normalized = assetSource.trim()
  if (!normalized) {
    return null
  }

  if (normalized.startsWith("asset://indexeddb/")) {
    return resolveIndexedDbAssetSourceToObjectUrl(normalized)
  }

  return normalized
}
