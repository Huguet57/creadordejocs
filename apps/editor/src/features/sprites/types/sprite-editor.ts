export type SpriteEditorTool = "pencil" | "eraser" | "bucket_fill" | "magic_wand" | "color_picker"

export type SpriteToolConnectivity = 4 | 8

export type SpriteToolOptionsMap = {
  pencil: Record<string, never>
  eraser: Record<string, never>
  bucket_fill: {
    connectivity: SpriteToolConnectivity
  }
  magic_wand: {
    connectivity: SpriteToolConnectivity
    tolerance: number
  }
  color_picker: Record<string, never>
}

export type SpriteToolOptionsState = {
  [ToolName in SpriteEditorTool]: SpriteToolOptionsMap[ToolName]
}

export type SpriteDraft = {
  id: string
  name: string
  width: number
  height: number
  pixelsRgba: string[]
  assetSource: string
}
