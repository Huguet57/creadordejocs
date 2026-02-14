import type { ProjectV1, ObjectActionDraft } from "@creadordejocs/project-format"

export type EditorSection = "sprites" | "sounds" | "objects" | "rooms" | "run" | "templates" | "globalVariables"

export type ObjectEventType = "Create" | "Step" | "Draw" | "Collision" | "Keyboard" | "OnDestroy" | "OutsideRoom" | "Timer"
export type ObjectEventKey = "ArrowUp" | "ArrowDown" | "ArrowLeft" | "ArrowRight" | "Space"
export type ObjectActionType =
  | "move"
  | "setVelocity"
  | "clampToRoom"
  | "jumpToPosition"
  | "jumpToStart"
  | "destroySelf"
  | "destroyOther"
  | "spawnObject"
  | "changeScore"
  | "endGame"
  | "playSound"
  | "changeGlobalVariable"
  | "changeObjectVariable"
  | "copyVariable"
  | "goToRoom"
  | "restartRoom"

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
  "Timer"
]
export const OBJECT_EVENT_KEYS: ObjectEventKey[] = ["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "Space"]
export const OBJECT_ACTION_TYPES: ObjectActionType[] = [
  "move",
  "setVelocity",
  "clampToRoom",
  "jumpToPosition",
  "jumpToStart",
  "destroySelf",
  "destroyOther",
  "spawnObject",
  "changeScore",
  "endGame",
  "playSound",
  "changeGlobalVariable",
  "changeObjectVariable",
  "copyVariable",
  "goToRoom",
  "restartRoom"
]

export type ActionCategory = "movement" | "objects" | "game" | "variables" | "rooms"

export const ACTION_CATEGORIES: { id: ActionCategory; label: string; types: ObjectActionType[] }[] = [
  {
    id: "movement",
    label: "Moviment",
    types: ["move", "setVelocity", "clampToRoom", "jumpToPosition", "jumpToStart"]
  },
  {
    id: "objects",
    label: "Objectes",
    types: ["destroySelf", "destroyOther", "spawnObject"]
  },
  {
    id: "game",
    label: "Joc",
    types: ["changeScore", "endGame", "playSound"]
  },
  {
    id: "variables",
    label: "Variables",
    types: ["changeGlobalVariable", "changeObjectVariable", "copyVariable"]
  },
  {
    id: "rooms",
    label: "Sales",
    types: ["goToRoom", "restartRoom"]
  }
]
