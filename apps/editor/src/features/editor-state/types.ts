import type { ProjectV1, ObjectActionDraft } from "@creadordejocs/project-format"

export type EditorSection = "sprites" | "sounds" | "objects" | "rooms" | "run" | "templates" | "globalVariables"

export type ObjectEventType =
  | "Create"
  | "Step"
  | "Draw"
  | "Collision"
  | "Keyboard"
  | "OnDestroy"
  | "OutsideRoom"
  | "Timer"
  | "MouseMove"
  | "MouseDown"
  | "MouseClick"
export type ObjectEventKey = "ArrowUp" | "ArrowDown" | "ArrowLeft" | "ArrowRight" | "Space"
export type ObjectKeyboardMode = "down" | "press"
export type ObjectActionType =
  | "move"
  | "setVelocity"
  | "clampToRoom"
  | "teleport"
  | "destroySelf"
  | "destroyOther"
  | "spawnObject"
  | "changeScore"
  | "endGame"
  | "message"
  | "playSound"
  | "changeVariable"
  | "copyVariable"
  | "goToRoom"
  | "restartRoom"
  | "wait"

export type ObjectEventEntry = ProjectV1["objects"][number]["events"][number]
export type ObjectEventItem = ObjectEventEntry["items"][number]
export type ObjectIfBlockItem = Extract<ObjectEventItem, { type: "if" }>
export type ObjectEventActionItem = Extract<ObjectEventItem, { type: "action" }>
export type IfCondition = ObjectIfBlockItem["condition"]
export { type ObjectActionDraft }

export const OBJECT_EVENT_TYPES: ObjectEventType[] = [
  "Create",
  "Step",
  "Draw",
  "Collision",
  "Keyboard",
  "OnDestroy",
  "OutsideRoom",
  "Timer",
  "MouseMove",
  "MouseDown",
  "MouseClick"
]

export const SYSTEM_MOUSE_GLOBALS = [
  { id: "__mouse_x", name: "mouse_x", type: "number" as const, initialValue: 0 },
  { id: "__mouse_y", name: "mouse_y", type: "number" as const, initialValue: 0 }
]
export const OBJECT_EVENT_KEYS: ObjectEventKey[] = ["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "Space"]
export const OBJECT_ACTION_TYPES: ObjectActionType[] = [
  "move",
  "setVelocity",
  "clampToRoom",
  "teleport",
  "destroySelf",
  "destroyOther",
  "spawnObject",
  "changeScore",
  "endGame",
  "message",
  "playSound",
  "changeVariable",
  "copyVariable",
  "goToRoom",
  "restartRoom",
  "wait"
]

export const ACTION_DISPLAY_NAMES: Record<ObjectActionType, string> = {
  move: "Moure",
  setVelocity: "Velocitat",
  clampToRoom: "Limitar a sala",
  teleport: "Teleport",
  destroySelf: "Destruir-se",
  destroyOther: "Destruir altre",
  spawnObject: "Crear objecte",
  changeScore: "Canviar punts",
  endGame: "Fi del joc",
  message: "Missatge",
  playSound: "Reproduir so",
  changeVariable: "Variable",
  copyVariable: "Copiar variable",
  goToRoom: "Anar a sala",
  restartRoom: "Reiniciar sala",
  wait: "Esperar",
}

export type ActionCategory = "movement" | "objects" | "game" | "variables" | "rooms" | "flow"

export const ACTION_CATEGORIES: { id: ActionCategory; label: string; types: ObjectActionType[] }[] = [
  {
    id: "movement",
    label: "Moviment",
    types: ["move", "setVelocity", "clampToRoom", "teleport"]
  },
  {
    id: "objects",
    label: "Objectes",
    types: ["destroySelf", "destroyOther", "spawnObject"]
  },
  {
    id: "game",
    label: "Joc",
    types: ["changeScore", "endGame", "message", "playSound"]
  },
  {
    id: "variables",
    label: "Variables",
    types: ["changeVariable", "copyVariable"]
  },
  {
    id: "rooms",
    label: "Sales",
    types: ["goToRoom", "restartRoom"]
  },
  {
    id: "flow",
    label: "Flux",
    types: ["wait"]
  }
]
