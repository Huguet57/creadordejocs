import { useState } from "react"
import { AssetUploadError, uploadAsset, validateAssetFile } from "../../assets/asset-upload.js"
import { imageFileToRgbaMap } from "../utils/image-to-pixels.js"

type UseSpriteImportInput = {
  spriteId: string
  width: number
  height: number
  onSourceImported: (assetSource: string) => void
  onPixelsImported: (pixelsRgba: string[]) => void
}

export function useSpriteImport({ spriteId, width, height, onPixelsImported, onSourceImported }: UseSpriteImportInput) {
  const [isImporting, setIsImporting] = useState(false)
  const [message, setMessage] = useState("")

  const importFile = async (selectedFile: File): Promise<void> => {
    if (!validateAssetFile(selectedFile, "sprite")) {
      setMessage("Invalid format. Use PNG, JPG, GIF or WEBP.")
      return
    }
    setIsImporting(true)
    setMessage("")
    try {
      const uploadResult = await uploadAsset({
        file: selectedFile,
        kind: "sprite",
        resourceId: spriteId
      })
      const pixelsRgba = await imageFileToRgbaMap(selectedFile, width, height)
      onSourceImported(uploadResult.assetSource)
      onPixelsImported(pixelsRgba)
    } catch (error) {
      if (error instanceof AssetUploadError) {
        setMessage(`Upload failed: ${error.message}`)
      } else {
        setMessage("Upload failed. Verify storage configuration and retry.")
      }
    } finally {
      setIsImporting(false)
    }
  }

  return {
    isImporting,
    message,
    setMessage,
    importFile
  }
}
