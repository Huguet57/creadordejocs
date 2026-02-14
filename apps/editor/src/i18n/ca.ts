export const caMessages = {
  appTitle: "Creador de jocs",
  bootMessage: "Editor inicialitzat"
} as const

export type EditorMessageKey = keyof typeof caMessages
