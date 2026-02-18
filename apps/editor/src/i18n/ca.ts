export const caMessages = {
  appTitle: "Creador de jocs",
  bootMessage: "Editor inicialitzat",
  spriteFrameAdd: "Afegeix fotograma",
  spriteFrameDuplicate: "Duplica fotograma",
  spriteFrameDelete: "Elimina fotograma",
  spriteFrameLabel: "Fotograma",
  actionChangeSprite: "Canviar sprite",
  actionSetSpriteSpeed: "Velocitat sprite"
} as const

export type EditorMessageKey = keyof typeof caMessages
