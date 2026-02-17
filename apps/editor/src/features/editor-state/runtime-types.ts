import type { ProjectV1, ObjectEventItemType } from "@creadordejocs/project-format"
import type { RuntimeToast } from "./message-toast-utils.js"

export const ROOM_WIDTH = 832
export const ROOM_HEIGHT = 480
export const INSTANCE_SIZE = 32
export const RUNTIME_TICK_MS = 80
export const BUILTIN_MOUSE_X_VARIABLE_ID = "__mouse_x"
export const BUILTIN_MOUSE_Y_VARIABLE_ID = "__mouse_y"

export type RuntimeMouseButton = "left" | "middle" | "right"
export type RuntimeMouseInput = {
  x: number
  y: number
  moved: boolean
  pressedButtons: Set<RuntimeMouseButton>
  justPressedButtons: Set<RuntimeMouseButton>
}

export type RuntimeVariableValue = ProjectV1["variables"]["global"][number]["initialValue"]
export type RuntimeEventItem = ObjectEventItemType
export type RuntimeAction = Extract<RuntimeEventItem, { type: "action" }>["action"]

export type RuntimeState = {
  score: number
  gameOver: boolean
  message: string
  activeToast: RuntimeToast | null
  queuedToasts: RuntimeToast[]
  initializedInstanceIds: string[]
  playedSoundIds: string[]
  instanceStartPositions: Record<string, { x: number; y: number }>
  globalVariables: Record<string, RuntimeVariableValue>
  objectInstanceVariables: Record<string, Record<string, RuntimeVariableValue>>
  nextRoomId: string | null
  restartRoomRequested: boolean
  timerElapsedByEventId: Record<string, number>
  waitElapsedByInstanceActionId: Record<string, number>
  eventLocksByKey: Record<string, true>
}

export type RuntimeActionResult = {
  instance: ProjectV1["rooms"][number]["instances"][number]
  destroyedInstanceIds: string[]
  spawned: ProjectV1["rooms"][number]["instances"][number][]
  scoreDelta: number
  gameOverMessage: string | null
  playedSoundIds: string[]
  halted: boolean
  runtime: RuntimeState
}

export function clampValue(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value))
}

export function getObjectWidth(project: ProjectV1, objectId: string): number {
  const objectEntry = project.objects.find((candidate) => candidate.id === objectId)
  const width = objectEntry?.width
  return typeof width === "number" && Number.isFinite(width) && width >= 1 ? width : INSTANCE_SIZE
}

export function getObjectHeight(project: ProjectV1, objectId: string): number {
  const objectEntry = project.objects.find((candidate) => candidate.id === objectId)
  const height = objectEntry?.height
  return typeof height === "number" && Number.isFinite(height) && height >= 1 ? height : INSTANCE_SIZE
}

export function getInstanceWidth(
  project: ProjectV1,
  instance: ProjectV1["rooms"][number]["instances"][number]
): number {
  return getObjectWidth(project, instance.objectId)
}

export function getInstanceHeight(
  project: ProjectV1,
  instance: ProjectV1["rooms"][number]["instances"][number]
): number {
  return getObjectHeight(project, instance.objectId)
}

export function intersectsInstances(
  project: ProjectV1,
  first: ProjectV1["rooms"][number]["instances"][number],
  second: ProjectV1["rooms"][number]["instances"][number]
): boolean {
  const firstWidth = getInstanceWidth(project, first)
  const firstHeight = getInstanceHeight(project, first)
  const secondWidth = getInstanceWidth(project, second)
  const secondHeight = getInstanceHeight(project, second)
  return (
    first.x < second.x + secondWidth &&
    first.x + firstWidth > second.x &&
    first.y < second.y + secondHeight &&
    first.y + firstHeight > second.y
  )
}

export function getDefaultRuntimeActionResult(
  instance: ProjectV1["rooms"][number]["instances"][number],
  runtime: RuntimeState
): RuntimeActionResult {
  return {
    instance,
    destroyedInstanceIds: [],
    spawned: [],
    scoreDelta: 0,
    gameOverMessage: null,
    playedSoundIds: [],
    halted: false,
    runtime
  }
}

export function mergeDestroyedIds(existing: string[], nextId: string): string[] {
  return existing.includes(nextId) ? existing : [...existing, nextId]
}

export function resolveTargetInstanceId(
  instance: ProjectV1["rooms"][number]["instances"][number],
  target: "self" | "other" | "instanceId",
  targetInstanceId: string | null,
  collisionOtherInstanceId: string | null
): string | null {
  if (target === "self") {
    return instance.id
  }
  if (target === "other") {
    return collisionOtherInstanceId
  }
  return targetInstanceId
}

export function isSameVariableValueType(left: RuntimeVariableValue, right: RuntimeVariableValue): boolean {
  if (Array.isArray(left) || Array.isArray(right)) {
    return Array.isArray(left) && Array.isArray(right)
  }
  const leftIsObject = typeof left === "object" && left !== null
  const rightIsObject = typeof right === "object" && right !== null
  if (leftIsObject || rightIsObject) {
    return leftIsObject && rightIsObject
  }
  return typeof left === typeof right
}

export function isReadonlyGlobalVariableId(variableId: string): boolean {
  return variableId === BUILTIN_MOUSE_X_VARIABLE_ID || variableId === BUILTIN_MOUSE_Y_VARIABLE_ID
}

export function applyGlobalNumericOperation(
  runtime: RuntimeState,
  variableId: string,
  value: number,
  operation: "add" | "subtract" | "multiply"
): RuntimeState {
  if (isReadonlyGlobalVariableId(variableId)) {
    return runtime
  }
  const existingValue = runtime.globalVariables[variableId]
  if (typeof existingValue !== "number") {
    return runtime
  }
  const nextValue =
    operation === "add" ? existingValue + value : operation === "subtract" ? existingValue - value : existingValue * value
  return {
    ...runtime,
    globalVariables: {
      ...runtime.globalVariables,
      [variableId]: nextValue
    }
  }
}

export function applyObjectNumericOperation(
  runtime: RuntimeState,
  targetInstanceId: string | null,
  variableId: string,
  value: number,
  operation: "add" | "subtract" | "multiply"
): RuntimeState {
  if (!targetInstanceId) {
    return runtime
  }
  const targetVariables = runtime.objectInstanceVariables[targetInstanceId]
  const existingValue = targetVariables?.[variableId]
  if (typeof existingValue !== "number") {
    return runtime
  }
  const nextValue =
    operation === "add" ? existingValue + value : operation === "subtract" ? existingValue - value : existingValue * value
  return {
    ...runtime,
    objectInstanceVariables: {
      ...runtime.objectInstanceVariables,
      [targetInstanceId]: {
        ...runtime.objectInstanceVariables[targetInstanceId],
        [variableId]: nextValue
      }
    }
  }
}
