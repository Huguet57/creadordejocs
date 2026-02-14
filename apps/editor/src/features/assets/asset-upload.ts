import { getAssetStorageProvider } from "./asset-storage-provider.js"

const SPRITE_EXTENSIONS = new Set(["png", "jpg", "jpeg", "gif", "webp"])
const SOUND_EXTENSIONS = new Set(["wav", "mp3", "ogg"])

export type AssetKind = "sprite" | "sound"

type UploadAssetInput = {
  file: File
  kind: AssetKind
  resourceId: string
}

type UploadAssetResult = {
  assetSource: string
  storagePath: string
}

export class AssetUploadError extends Error {
  constructor(message: string) {
    super(message)
    this.name = "AssetUploadError"
  }
}

export function validateAssetFile(file: File, kind: AssetKind): boolean {
  const extension = getFileExtension(file.name)
  if (!extension) return false
  if (kind === "sprite") return SPRITE_EXTENSIONS.has(extension)
  return SOUND_EXTENSIONS.has(extension)
}

export async function uploadAsset({ file, kind, resourceId }: UploadAssetInput): Promise<UploadAssetResult> {
  if (!validateAssetFile(file, kind)) {
    throw new AssetUploadError(`Invalid ${kind} format: ${file.name}`)
  }
  try {
    const provider = await getAssetStorageProvider()
    return await provider.upload({ file, kind, resourceId })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown upload error"
    throw new AssetUploadError(message)
  }
}

function getFileExtension(fileName: string): string | null {
  const fileExtensionRegExp = /\.([a-z0-9]+)$/i
  const match = fileExtensionRegExp.exec(fileName.toLowerCase())
  return match?.[1] ?? null
}
