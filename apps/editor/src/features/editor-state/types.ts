import {
  ACTION_CATEGORY_LABELS,
  ACTION_REGISTRY,
  getEditorVisibleActionTypes,
  type ActionCategoryId,
  type ActionType,
  type ObjectActionDraft,
  type ProjectV1
} from "@creadordejocs/project-format"

export type EditorSection = "sprites" | "objects" | "rooms" | "run" | "templates" | "globalVariables" | "share"

export type ObjectEventType =
  | "Create"
  | "Step"
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
