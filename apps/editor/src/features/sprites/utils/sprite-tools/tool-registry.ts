import type { SpriteEditorTool } from "../../types/sprite-editor.js"

export type SpriteToolDefinition = {
  id: SpriteEditorTool
  label: string
  usesColor: boolean
  cursor: string
  hidden?: boolean
}

export const SPRITE_TOOL_REGISTRY: SpriteToolDefinition[] = [
  { id: "pencil", label: "Pencil", usesColor: true, cursor: "crosshair" },
  { id: "eraser", label: "Eraser", usesColor: false, cursor: "cell" },
  { id: "bucket_fill", label: "Bucket", usesColor: true, cursor: "copy" },
  { id: "magic_wand", label: "Wand", usesColor: false, cursor: "pointer", hidden: true },
  { id: "color_picker", label: "Picker", usesColor: false, cursor: "crosshair" }
]

export const SPRITE_TOOL_BY_ID: Record<SpriteEditorTool, SpriteToolDefinition> = {
  pencil: { id: "pencil", label: "Pencil", usesColor: true, cursor: "crosshair" },
  eraser: { id: "eraser", label: "Eraser", usesColor: false, cursor: "cell" },
  bucket_fill: { id: "bucket_fill", label: "Bucket", usesColor: true, cursor: "copy" },
  magic_wand: { id: "magic_wand", label: "Wand", usesColor: false, cursor: "pointer" },
  color_picker: { id: "color_picker", label: "Picker", usesColor: false, cursor: "crosshair" }
}
