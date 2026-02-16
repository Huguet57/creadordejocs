import { rgbaChannelsToHex } from "./pixel-rgba.js"

export type CropRect = {
  x: number
  y: number
  width: number
  height: number
}

export function scaleNearestRgbaPixels(
  sourcePixels: Uint8ClampedArray,
  sourceWidth: number,
  sourceHeight: number,
  targetWidth: number,
  targetHeight: number
): Uint8ClampedArray {
  const targetPixels = new Uint8ClampedArray(targetWidth * targetHeight * 4)
  for (let y = 0; y < targetHeight; y += 1) {
    const sourceY = Math.min(sourceHeight - 1, Math.floor((y * sourceHeight) / targetHeight))
    for (let x = 0; x < targetWidth; x += 1) {
      const sourceX = Math.min(sourceWidth - 1, Math.floor((x * sourceWidth) / targetWidth))
      const sourceIndex = (sourceY * sourceWidth + sourceX) * 4
      const targetIndex = (y * targetWidth + x) * 4
      targetPixels[targetIndex] = sourcePixels[sourceIndex] ?? 0
      targetPixels[targetIndex + 1] = sourcePixels[sourceIndex + 1] ?? 0
      targetPixels[targetIndex + 2] = sourcePixels[sourceIndex + 2] ?? 0
      targetPixels[targetIndex + 3] = sourcePixels[sourceIndex + 3] ?? 0
    }
  }
  return targetPixels
}

export function cropRgbaPixels(
  sourcePixels: Uint8ClampedArray,
  sourceWidth: number,
  crop: CropRect
): Uint8ClampedArray {
  const cx = Math.max(0, Math.round(crop.x))
  const cy = Math.max(0, Math.round(crop.y))
  const cw = Math.max(1, Math.round(crop.width))
  const ch = Math.max(1, Math.round(crop.height))
  const croppedPixels = new Uint8ClampedArray(cw * ch * 4)
  for (let y = 0; y < ch; y += 1) {
    for (let x = 0; x < cw; x += 1) {
      const srcIdx = ((cy + y) * sourceWidth + (cx + x)) * 4
      const dstIdx = (y * cw + x) * 4
      croppedPixels[dstIdx] = sourcePixels[srcIdx] ?? 0
      croppedPixels[dstIdx + 1] = sourcePixels[srcIdx + 1] ?? 0
      croppedPixels[dstIdx + 2] = sourcePixels[srcIdx + 2] ?? 0
      croppedPixels[dstIdx + 3] = sourcePixels[srcIdx + 3] ?? 0
    }
  }
  return croppedPixels
}

function rawPixelsToRgbaHex(pixels: Uint8ClampedArray): string[] {
  const result: string[] = []
  for (let i = 0; i < pixels.length; i += 4) {
    result.push(rgbaChannelsToHex(pixels[i] ?? 0, pixels[i + 1] ?? 0, pixels[i + 2] ?? 0, pixels[i + 3] ?? 0))
  }
  return result
}

export async function loadImageElement(file: File): Promise<HTMLImageElement> {
  const objectUrl = URL.createObjectURL(file)
  try {
    return await new Promise<HTMLImageElement>((resolve, reject) => {
      const imageElement = new Image()
      imageElement.onload = () => resolve(imageElement)
      imageElement.onerror = () => reject(new Error("Failed to load image"))
      imageElement.src = objectUrl
    })
  } finally {
    URL.revokeObjectURL(objectUrl)
  }
}

export function getImageDataFromElement(image: HTMLImageElement): { width: number; height: number; data: Uint8ClampedArray } {
  const canvas = document.createElement("canvas")
  canvas.width = image.naturalWidth
  canvas.height = image.naturalHeight
  const context = canvas.getContext("2d")
  if (!context) {
    throw new Error("2d context unavailable")
  }
  context.clearRect(0, 0, canvas.width, canvas.height)
  context.drawImage(image, 0, 0)
  const imageData = context.getImageData(0, 0, canvas.width, canvas.height)
  return { width: canvas.width, height: canvas.height, data: imageData.data }
}

export function cropAndScaleToRgbaMap(
  sourceData: Uint8ClampedArray,
  sourceWidth: number,
  crop: CropRect,
  targetWidth: number,
  targetHeight: number
): string[] {
  const cropped = cropRgbaPixels(sourceData, sourceWidth, crop)
  const cw = Math.max(1, Math.round(crop.width))
  const ch = Math.max(1, Math.round(crop.height))
  const scaled = scaleNearestRgbaPixels(cropped, cw, ch, targetWidth, targetHeight)
  return rawPixelsToRgbaHex(scaled)
}

export async function imageFileToRgbaMap(file: File, width: number, height: number): Promise<string[]> {
  const image = await loadImageElement(file)
  const source = getImageDataFromElement(image)
  const scaled = scaleNearestRgbaPixels(source.data, source.width, source.height, width, height)
  return rawPixelsToRgbaHex(scaled)
}
