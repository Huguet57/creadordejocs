import { useState } from "react"
import { AssetUploadError, uploadAsset, validateAssetFile } from "../../assets/asset-upload.js"
import {
  cropAndScaleToRgbaMap,
  getImageDataFromElement,
  loadImageElement,
  type CropRect
} from "../utils/image-to-pixels.js"

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
  const [pendingFile, setPendingFile] = useState<File | null>(null)
  const [pendingImage, setPendingImage] = useState<HTMLImageElement | null>(null)
  const [isCropOpen, setIsCropOpen] = useState(false)

  const openCropModal = async (selectedFile: File): Promise<void> => {
    if (!validateAssetFile(selectedFile, "sprite")) {
      setMessage("Invalid format. Use PNG, JPG, GIF or WEBP.")
      return
    }
    setMessage("")
    try {
      const imageElement = await loadImageElement(selectedFile)
      setPendingFile(selectedFile)
      setPendingImage(imageElement)
      setIsCropOpen(true)
    } catch {
      setMessage("Failed to load image.")
    }
  }

  const confirmCrop = async (crop: CropRect): Promise<void> => {
    if (!pendingFile || !pendingImage) return
    setIsCropOpen(false)
    setIsImporting(true)
    setMessage("")
    try {
      const uploadResult = await uploadAsset({
        file: pendingFile,
        kind: "sprite",
        resourceId: spriteId
      })
      const sourceData = getImageDataFromElement(pendingImage)
      const pixelsRgba = cropAndScaleToRgbaMap(sourceData.data, sourceData.width, crop, width, height)
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
      setPendingFile(null)
      setPendingImage(null)
    }
  }

  const cancelCrop = () => {
    setIsCropOpen(false)
    setPendingFile(null)
    setPendingImage(null)
  }

  return {
    isImporting,
    isCropOpen,
    pendingImage,
    message,
    setMessage,
    openCropModal,
    confirmCrop,
    cancelCrop
  }
}
