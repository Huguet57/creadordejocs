export type EditorSection = "sprites" | "sounds" | "objects" | "rooms" | "run"

export type ObjectEventType = "Create" | "Step" | "Draw" | "Collision" | "Keyboard"

export const OBJECT_EVENT_TYPES: ObjectEventType[] = ["Create", "Step", "Draw", "Collision", "Keyboard"]
