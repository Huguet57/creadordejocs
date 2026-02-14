import type { AssetStorageProvider, UploadAssetInput, UploadAssetResult } from "../asset-storage-provider.js"
import { createSupabaseClientFromEnv, getSupabaseBucketName } from "../../../lib/supabase.js"

export class SupabaseAssetStorageProvider implements AssetStorageProvider {
  async upload({ file, kind, resourceId }: UploadAssetInput): Promise<UploadAssetResult> {
    const bucket = getSupabaseBucketName()
    const storagePath = buildStoragePath({ fileName: file.name, kind, resourceId })
    const supabase = createSupabaseClientFromEnv()
    const uploadOptions = file.type
      ? { cacheControl: "3600", upsert: false, contentType: file.type }
      : { cacheControl: "3600", upsert: false }

    const { error: uploadError } = await supabase.storage.from(bucket).upload(storagePath, file, uploadOptions)
    if (uploadError) {
      throw new Error(uploadError.message)
    }

    const {
      data: { publicUrl }
    } = supabase.storage.from(bucket).getPublicUrl(storagePath)
    if (!publicUrl) {
      throw new Error("Upload completed but no public URL was returned.")
    }

    return { assetSource: publicUrl, storagePath }
  }
}

function buildStoragePath({
  fileName,
  kind,
  resourceId
}: {
  fileName: string
  kind: "sprite" | "sound"
  resourceId: string
}): string {
  const extension = getFileExtension(fileName) ?? "bin"
  const safeName = sanitizeName(fileName.replace(/\.[^/.]+$/, ""))
  const randomPart = crypto.randomUUID()
  return `${kind}/${resourceId}/${Date.now()}-${randomPart}-${safeName}.${extension}`
}

function getFileExtension(fileName: string): string | null {
  const fileExtensionRegExp = /\.([a-z0-9]+)$/i
  const match = fileExtensionRegExp.exec(fileName.toLowerCase())
  return match?.[1] ?? null
}

function sanitizeName(value: string): string {
  const normalized = value
    .toLowerCase()
    .replace(/[^a-z0-9-_]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
  return normalized || "asset"
}
