import type { ProjectV1, ObjectActionDraft } from "@creadordejocs/project-format"

export type EditorSection = "sprites" | "sounds" | "objects" | "rooms" | "run" | "templates"

export type ObjectEventType = "Create" | "Step" | "Draw" | "Collision" | "Keyboard"
export type ObjectEventKey = "ArrowUp" | "ArrowDown" | "ArrowLeft" | "ArrowRight" | "Space"
export type ObjectActionType =
  | "move"
  | "setVelocity"
  | "clampToRoom"
  | "destroySelf"
  | "spawnObject"
  | "changeScore"
  | "endGame"
  | "playSound"

export type ObjectEventEntry = ProjectV1["objects"][number]["events"][number]
export { type ObjectActionDraft }

export const OBJECT_EVENT_TYPES: ObjectEventType[] = ["Create", "Step", "Draw", "Collision", "Keyboard"]
export const OBJECT_EVENT_KEYS: ObjectEventKey[] = ["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "Space"]
export const OBJECT_ACTION_TYPES: ObjectActionType[] = [
  "move",
  "setVelocity",
  "clampToRoom",
  "destroySelf",
  "spawnObject",
  "changeScore",
  "endGame",
  "playSound"
]
