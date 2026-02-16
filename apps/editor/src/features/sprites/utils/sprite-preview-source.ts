import type { ProjectV1 } from "@creadordejocs/project-format"
import { resolveAssetSource } from "../../assets/asset-source-resolver.js"
import { normalizePixelGrid } from "./sprite-grid.js"

type SpriteResource = ProjectV1["resources"]["sprites"][number]

export function spritePixelsToDataUrl(pixelsRgba: string[], width: number, height: number): string {
  if (!pixelsRgba.length || width <= 0 || height <= 0 || typeof document === "undefined") {
    return ""
  }

  const normalized = normalizePixelGrid(pixelsRgba, width, height)
  const canvas = document.createElement("canvas")
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext("2d")
  if (!ctx) {
    return ""
  }

  const imageData = ctx.createImageData(width, height)
  for (let index = 0; index < normalized.length; index += 1) {
    const color = normalized[index] ?? "#00000000"
    const offset = index * 4
    imageData.data[offset] = Number.parseInt(color.slice(1, 3), 16)
    imageData.data[offset + 1] = Number.parseInt(color.slice(3, 5), 16)
    imageData.data[offset + 2] = Number.parseInt(color.slice(5, 7), 16)
    imageData.data[offset + 3] = Number.parseInt(color.slice(7, 9), 16)
  }

  ctx.putImageData(imageData, 0, 0)
  return canvas.toDataURL("image/png")
}

export async function resolveSpritePreviewSource(spriteEntry: SpriteResource): Promise<string> {
  const resolved = await resolveAssetSource(spriteEntry.assetSource)
  if (resolved) {
    return resolved
  }
  return spritePixelsToDataUrl(spriteEntry.pixelsRgba, spriteEntry.width, spriteEntry.height)
}
