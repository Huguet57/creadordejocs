export const caMessages = {
  appTitle: "Creador de jocs",
  bootMessage: "Editor inicialitzat",
  spriteFrameAdd: "Afegeix fotograma",
  spriteFrameDuplicate: "Duplica fotograma",
  spriteFrameDelete: "Elimina fotograma",
  spriteFrameLabel: "Fotograma",
  actionChangeSprite: "Canviar sprite",
  actionSetSpriteSpeed: "Velocitat sprite",
  runDebugInspectInstance: "Inspeccionar instància",
  runDebugInstanceInspection: "Inspecció d'instància",
  runDebugObject: "Objecte",
  runDebugNone: "Cap",
  runDebugVariables: "Variables",
  syncIdle: "Sync idle",
  syncing: "Syncing...",
  synced: "Synced",
  syncError: "Sync error"
} as const

export type EditorMessageKey = keyof typeof caMessages
