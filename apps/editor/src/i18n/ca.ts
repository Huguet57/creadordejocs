export const caMessages = {
  appTitle: "Creador de jocs",
  bootMessage: "Editor inicialitzat",
  spriteFrameAdd: "Afegeix fotograma",
  spriteFrameDuplicate: "Duplica fotograma",
  spriteFrameDelete: "Elimina fotograma",
  spriteFrameLabel: "Fotograma"
} as const

export type EditorMessageKey = keyof typeof caMessages
