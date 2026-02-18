import {
  ACTION_CATEGORY_LABELS,
  ACTION_REGISTRY,
  getEditorVisibleActionTypes,
  type ActionCategoryId,
  type ActionType,
  type ObjectActionDraft,
  type ProjectV1
} from "@creadordejocs/project-format"

export type EditorSection = "sprites" | "objects" | "rooms" | "run" | "templates" | "globalVariables"

export type ObjectEventType =
  | "Create"
  | "Step"
  | "Collision"
  | "Keyboard"
  | "Mouse"
  | "OnDestroy"
  | "OutsideRoom"
  | "Timer"
  | "MouseMove"
  | "CustomEvent"
export type ObjectEventKey = "ArrowUp" | "ArrowDown" | "ArrowLeft" | "ArrowRight" | "Space" | "<any>"
export type ObjectKeyboardMode = "down" | "press" | "release"
export type ObjectMouseMode = "down" | "press"
export type ObjectActionType = Exclude<ActionType, "playSound">

export type ObjectEventEntry = ProjectV1["objects"][number]["events"][number]
export type ObjectEventItem = ObjectEventEntry["items"][number]
export type ObjectIfBlockItem = Extract<ObjectEventItem, { type: "if" }>
export type ObjectEventActionItem = Extract<ObjectEventItem, { type: "action" }>
export type IfCondition = ObjectIfBlockItem["condition"]
export { type ObjectActionDraft }

export const OBJECT_EVENT_TYPES: ObjectEventType[] = [
  "Create",
  "Step",
  "Collision",
  "Keyboard",
  "Mouse",
  "OnDestroy",
  "OutsideRoom",
  "Timer",
  "MouseMove",
  "CustomEvent"
]

export const EVENT_DISPLAY_NAMES: Record<ObjectEventType, string> = {
  Create: "Create",
  Step: "Step",
  Collision: "Collision",
  Keyboard: "Keyboard",
  Mouse: "Mouse",
  OnDestroy: "On destroy",
  OutsideRoom: "Outside room",
  Timer: "Timer",
  MouseMove: "Mouse move",
  CustomEvent: "Custom event"
}

export type EventCategoryId = "lifecycle" | "input" | "collision" | "custom"

export const EVENT_CATEGORIES: { id: EventCategoryId; label: string; types: ObjectEventType[] }[] = [
  {
    id: "lifecycle",
    label: "Lifecycle",
    types: ["Create", "Step", "OnDestroy", "OutsideRoom", "Timer"]
  },
  {
    id: "input",
    label: "Input",
    types: ["Keyboard", "Mouse", "MouseMove"]
  },
  {
    id: "collision",
    label: "Collision",
    types: ["Collision"]
  },
  {
    id: "custom",
    label: "Custom",
    types: ["CustomEvent"]
  }
]

export const SYSTEM_MOUSE_GLOBALS = [
  { id: "mouse.x", name: "mouse.x", type: "number" as const, initialValue: 0 },
  { id: "mouse.y", name: "mouse.y", type: "number" as const, initialValue: 0 }
]
export const OBJECT_EVENT_KEYS: ObjectEventKey[] = ["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "Space", "<any>"]
export const OBJECT_ACTION_TYPES: ObjectActionType[] = getEditorVisibleActionTypes().filter(
  (actionType): actionType is ObjectActionType => actionType !== "playSound"
)

export const ACTION_DISPLAY_NAMES: Record<ObjectActionType, string> = Object.fromEntries(
  ACTION_REGISTRY.filter((entry) => entry.ui.editorVisible).map((entry) => [entry.type, entry.ui.label])
) as Record<ObjectActionType, string>

export type ActionCategory = ActionCategoryId

export const ACTION_CATEGORIES: { id: ActionCategory; label: string; types: ObjectActionType[] }[] = Object.keys(
  ACTION_CATEGORY_LABELS
).map((categoryId) => ({
  id: categoryId as ActionCategory,
  label: ACTION_CATEGORY_LABELS[categoryId as ActionCategory],
  types: ACTION_REGISTRY.filter(
    (entry) => entry.ui.editorVisible && entry.ui.categoryId === categoryId && entry.type !== "playSound"
  ).map((entry) => entry.type as ObjectActionType)
}))
