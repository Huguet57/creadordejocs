import { getAssetStorageProvider } from "./asset-storage-provider.js"

export async function resolveAssetSource(assetSource: string): Promise<string | null> {
  const normalized = assetSource.trim()
  if (!normalized) {
    return null
  }

  const provider = await getAssetStorageProvider()
  return provider.resolve(normalized)
}
