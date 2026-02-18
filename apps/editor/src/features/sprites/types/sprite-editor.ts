export type SpriteEditorTool = "pencil" | "eraser" | "bucket_fill" | "magic_wand" | "color_picker" | "select" | "move"

export type SpriteToolConnectivity = 4 | 8

export type SpriteToolOptionsMap = {
  pencil: Record<string, never>
  eraser: {
    radius: number
  }
  bucket_fill: Record<string, never>
  magic_wand: {
    tolerance: number
  }
  color_picker: Record<string, never>
  select: Record<string, never>
  move: Record<string, never>
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
