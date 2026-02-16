export type SpriteEditorTool = "pencil" | "eraser"

export type SpriteDraft = {
  id: string
  name: string
  width: number
  height: number
  pixelsRgba: string[]
  assetSource: string
}
