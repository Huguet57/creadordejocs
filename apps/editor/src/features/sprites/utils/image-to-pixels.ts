import { rgbaChannelsToHex } from "./pixel-rgba.js"

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

async function readImageDataFromFile(file: File): Promise<{ width: number; height: number; data: Uint8ClampedArray }> {
  const objectUrl = URL.createObjectURL(file)
  try {
    const image = await new Promise<HTMLImageElement>((resolve, reject) => {
      const imageElement = new Image()
      imageElement.onload = () => resolve(imageElement)
      imageElement.onerror = () => reject(new Error("Failed to load image"))
      imageElement.src = objectUrl
    })
    const canvas = document.createElement("canvas")
    canvas.width = image.width
    canvas.height = image.height
    const context = canvas.getContext("2d")
    if (!context) {
      throw new Error("2d context unavailable")
    }
    context.clearRect(0, 0, canvas.width, canvas.height)
    context.drawImage(image, 0, 0)
    const imageData = context.getImageData(0, 0, canvas.width, canvas.height)
    return { width: canvas.width, height: canvas.height, data: imageData.data }
  } finally {
    URL.revokeObjectURL(objectUrl)
  }
}

export async function imageFileToRgbaMap(file: File, width: number, height: number): Promise<string[]> {
  const source = await readImageDataFromFile(file)
  const scaled = scaleNearestRgbaPixels(source.data, source.width, source.height, width, height)
  const rgbaValues: string[] = []
  for (let index = 0; index < scaled.length; index += 4) {
    rgbaValues.push(rgbaChannelsToHex(scaled[index] ?? 0, scaled[index + 1] ?? 0, scaled[index + 2] ?? 0, scaled[index + 3] ?? 0))
  }
  return rgbaValues
}
