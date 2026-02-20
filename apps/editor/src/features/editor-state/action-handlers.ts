import { generateUUID, type ProjectV1, type ValueExpressionOutput } from "@creadordejocs/project-format"
import { buildWaitActionKey, removeWaitProgress } from "./event-lock-utils.js"
import { enqueueRuntimeToast, type RuntimeToastState } from "./message-toast-utils.js"
import { executeEmitCustomEvent } from "./action-handlers-custom-events.js"
import {
  DEFAULT_SPRITE_SPEED_MS,
  WINDOW_HEIGHT,
  WINDOW_WIDTH,
  RUNTIME_TICK_MS,
  applyGlobalNumericOperation,
  applyObjectNumericOperation,
  clampWindowToRoom,
  clampValue,
  getInstanceHeight,
  getInstanceWidth,
  getObjectWidth,
  getObjectHeight,
  intersectsInstances,
  isReadonlyGlobalVariableId,
  isSameVariableValueType,
  mergeDestroyedIds,
  resolveTargetInstanceId,
  type RuntimeAction,
  type RuntimeActionResult,
  type RuntimeState,
  type RuntimeVariableValue
} from "./runtime-types.js"

export type ActionContext = {
  project: ProjectV1
  roomId: string
  roomWidth: number
  roomHeight: number
  startPosition: { x: number; y: number } | null
  collisionOtherInstanceId: string | null
  roomInstances: ProjectV1["rooms"][number]["instances"]
  iterationLocals: Record<string, RuntimeVariableValue>
  executeNestedActions: (
    actions: RuntimeAction[],
    result: RuntimeActionResult,
    iterationLocals?: Record<string, RuntimeVariableValue>
  ) => RuntimeActionResult
}

type RuntimeVariableType = "number" | "string" | "boolean"
type RuntimeVariableItemType = RuntimeVariableType
type LegacyVariableReference = { scope: "global" | "object"; variableId: string }
type ValueSourceExpression = Extract<ValueExpressionOutput, { source: string }>
type CollectionVariableDefinition = Extract<ProjectV1["variables"]["global"][number], { type: "list" | "map" }>
export const MAX_FLOW_ITERATIONS = 500

function isLegacyVariableReference(value: ValueExpressionOutput): value is LegacyVariableReference {
  return typeof value === "object" && value !== null && "scope" in value && "variableId" in value
}

function isValueSource(value: ValueExpressionOutput): value is ValueSourceExpression {
  return typeof value === "object" && value !== null && "source" in value
}

function getRuntimeMouseValue(runtime: RuntimeState, attribute: "x" | "y"): number | undefined {
  const value = attribute === "x" ? runtime.mouse.x : runtime.mouse.y
  return typeof value === "number" ? value : undefined
}

function getTargetInstanceFromSourceTarget(
  result: RuntimeActionResult,
  ctx: ActionContext,
  target: "self" | "other"
): ProjectV1["rooms"][number]["instances"][number] | null {
  if (target === "self") {
    return result.instance
  }
  if (!ctx.collisionOtherInstanceId) {
    return null
  }
  return ctx.roomInstances.find((instanceEntry) => instanceEntry.id === ctx.collisionOtherInstanceId) ?? null
}

function resolveExpressionValue(
  expression: ValueExpressionOutput,
  result: RuntimeActionResult,
  ctx: ActionContext
): RuntimeVariableValue | undefined {
  if (typeof expression === "number" || typeof expression === "string" || typeof expression === "boolean") {
    return expression
  }

  if (isLegacyVariableReference(expression)) {
    if (expression.scope === "global") {
      return result.runtime.globalVariables[expression.variableId]
    }
    return result.runtime.objectInstanceVariables[result.instance.id]?.[expression.variableId]
  }

  if (!isValueSource(expression)) {
    return undefined
  }

  if (expression.source === "literal") {
    return expression.value
  }

  if (expression.source === "globalVariable") {
    return result.runtime.globalVariables[expression.variableId]
  }

  if (expression.source === "mouseAttribute") {
    return getRuntimeMouseValue(result.runtime, expression.attribute)
  }

  if (expression.source === "iterationVariable") {
    return ctx.iterationLocals[expression.variableName]
  }

  if (expression.source === "internalVariable") {
    const targetInstance = getTargetInstanceFromSourceTarget(result, ctx, expression.target)
    if (!targetInstance) {
      return undefined
    }
    return result.runtime.objectInstanceVariables[targetInstance.id]?.[expression.variableId]
  }

  if (expression.source === "attribute") {
    const targetInstance = getTargetInstanceFromSourceTarget(result, ctx, expression.target)
    if (!targetInstance) {
      return undefined
    }
    if (expression.attribute === "x") {
      return targetInstance.x
    }
    if (expression.attribute === "y") {
      return targetInstance.y
    }
    if (expression.attribute === "instanceCount") {
      return ctx.roomInstances.filter((instanceEntry) => instanceEntry.objectId === targetInstance.objectId).length
    }
    return targetInstance.rotation ?? 0
  }

  if (expression.source === "random") {
    if (!Number.isFinite(expression.min) || !Number.isFinite(expression.max) || !Number.isFinite(expression.step)) {
      return undefined
    }
    if (expression.step <= 0 || expression.max < expression.min) {
      return undefined
    }
    const steps = Math.floor((expression.max - expression.min) / expression.step)
    if (steps < 0) {
      return undefined
    }
    const index = Math.floor(Math.random() * (steps + 1))
    return expression.min + index * expression.step
  }

  return undefined
}

function resolveValueAsType(
  expression: ValueExpressionOutput,
  expectedType: RuntimeVariableType,
  result: RuntimeActionResult,
  ctx: ActionContext
): RuntimeVariableValue | undefined {
  const resolved = resolveExpressionValue(expression, result, ctx)
  if (resolved === undefined) {
    return undefined
  }
  return typeof resolved === expectedType ? resolved : undefined
}

export function resolveNumberValue(expression: ValueExpressionOutput, result: RuntimeActionResult, ctx: ActionContext): number | undefined {
  const resolved = resolveValueAsType(expression, "number", result, ctx)
  return typeof resolved === "number" ? resolved : undefined
}

function resolveStringValue(expression: ValueExpressionOutput, result: RuntimeActionResult, ctx: ActionContext): string | undefined {
  const resolved = resolveValueAsType(expression, "string", result, ctx)
  return typeof resolved === "string" ? resolved : undefined
}

function isScalarValue(value: unknown): value is number | string | boolean {
  return typeof value === "number" || typeof value === "string" || typeof value === "boolean"
}

export function isScalarListValue(value: unknown): value is (number | string | boolean)[] {
  return Array.isArray(value) && value.every((entry) => isScalarValue(entry))
}

export function isScalarMapValue(value: unknown): value is Record<string, number | string | boolean> {
  return !!value && typeof value === "object" && !Array.isArray(value) && Object.values(value).every((entry) => isScalarValue(entry))
}

function isScalarValueOfItemType(value: RuntimeVariableValue, itemType: RuntimeVariableItemType): boolean {
  return typeof value === itemType
}

function getGlobalCollectionDefinition(
  project: ProjectV1,
  variableId: string,
  expectedType: "list" | "map"
): CollectionVariableDefinition | null {
  const definition = project.variables.global.find((entry) => entry.id === variableId)
  if (definition?.type !== expectedType) {
    return null
  }
  return definition
}

function getObjectCollectionDefinition(
  project: ProjectV1,
  roomInstances: ProjectV1["rooms"][number]["instances"],
  instanceId: string,
  variableId: string,
  expectedType: "list" | "map"
): CollectionVariableDefinition | null {
  const objectId = roomInstances.find((entry) => entry.id === instanceId)?.objectId
  if (!objectId) {
    return null
  }
  const definition = (project.variables.objectByObjectId[objectId] ?? []).find((entry) => entry.id === variableId)
  if (definition?.type !== expectedType) {
    return null
  }
  return definition
}

function updateObjectVariableValue(
  runtime: RuntimeState,
  targetInstanceId: string,
  variableId: string,
  value: RuntimeVariableValue
): RuntimeState {
  const targetVariables = runtime.objectInstanceVariables[targetInstanceId]
  if (!targetVariables) {
    return runtime
  }
  return {
    ...runtime,
    objectInstanceVariables: {
      ...runtime.objectInstanceVariables,
      [targetInstanceId]: {
        ...targetVariables,
        [variableId]: value
      }
    }
  }
}

function resolveCollectionTargetInstanceId(
  action: {
    scope: "global" | "object"
    target?: "self" | "other" | "instanceId" | null | undefined
    targetInstanceId?: string | null | undefined
  },
  result: RuntimeActionResult,
  ctx: ActionContext
): string | null {
  if (action.scope === "global") {
    return null
  }
  return resolveTargetInstanceId(
    result.instance,
    action.target ?? "self",
    action.targetInstanceId ?? null,
    ctx.collisionOtherInstanceId
  )
}

export function mergeIterationActionResult(
  previousResult: RuntimeActionResult,
  iterationResult: RuntimeActionResult
): RuntimeActionResult {
  return {
    ...iterationResult,
    spawned: [...previousResult.spawned, ...iterationResult.spawned],
    destroyedInstanceIds: [...new Set([...previousResult.destroyedInstanceIds, ...iterationResult.destroyedInstanceIds])],
    scoreDelta: previousResult.scoreDelta + iterationResult.scoreDelta,
    gameOverMessage: iterationResult.gameOverMessage ?? previousResult.gameOverMessage,
    playedSoundIds: [...previousResult.playedSoundIds, ...iterationResult.playedSoundIds]
  }
}

function wouldCollideWithSolid(
  project: ProjectV1,
  roomInstances: ProjectV1["rooms"][number]["instances"],
  movingInstanceId: string,
  nextX: number,
  nextY: number
): boolean {
  const movingInstance = roomInstances.find((instanceEntry) => instanceEntry.id === movingInstanceId)
  if (!movingInstance) {
    return false
  }
  const nextInstance = { ...movingInstance, x: nextX, y: nextY }
  for (const otherInstance of roomInstances) {
    if (otherInstance.id === movingInstanceId) {
      continue
    }
    const otherObject = project.objects.find((objectEntry) => objectEntry.id === otherInstance.objectId)
    if (!otherObject?.solid) {
      continue
    }
    if (intersectsInstances(project, nextInstance, otherInstance)) {
      return true
    }
  }
  return false
}

function resolveSolidLimitedPosition(
  project: ProjectV1,
  roomInstances: ProjectV1["rooms"][number]["instances"],
  movingInstanceId: string,
  startX: number,
  startY: number,
  targetX: number,
  targetY: number
): { x: number; y: number } {
  if (!wouldCollideWithSolid(project, roomInstances, movingInstanceId, targetX, targetY)) {
    return { x: targetX, y: targetY }
  }

  if (wouldCollideWithSolid(project, roomInstances, movingInstanceId, startX, startY)) {
    return { x: startX, y: startY }
  }

  const deltaX = targetX - startX
  const deltaY = targetY - startY
  const distance = Math.hypot(deltaX, deltaY)
  if (distance === 0) {
    return { x: startX, y: startY }
  }

  const positionAt = (t: number): { x: number; y: number } => ({
    x: startX + deltaX * t,
    y: startY + deltaY * t
  })

  const steps = Math.max(1, Math.ceil(distance))
  let previousT = 0
  for (let step = 1; step <= steps; step += 1) {
    const currentT = step / steps
    const candidate = positionAt(currentT)
    if (!wouldCollideWithSolid(project, roomInstances, movingInstanceId, candidate.x, candidate.y)) {
      previousT = currentT
      continue
    }

    let low = previousT
    let high = currentT
    for (let iteration = 0; iteration < 12; iteration += 1) {
      const mid = (low + high) / 2
      const midPosition = positionAt(mid)
      if (wouldCollideWithSolid(project, roomInstances, movingInstanceId, midPosition.x, midPosition.y)) {
        high = mid
      } else {
        low = mid
      }
    }
    return positionAt(low)
  }

  return { x: startX, y: startY }
}

function executeActionFallback(
  action: RuntimeAction,
  result: RuntimeActionResult,
  ctx: ActionContext
): { result: RuntimeActionResult; halt?: boolean } {
  if (action.type === "move") {
    const dx = resolveNumberValue(action.dx, result, ctx) ?? 0
    const dy = resolveNumberValue(action.dy, result, ctx) ?? 0
    const nextPosition = resolveSolidLimitedPosition(
      ctx.project,
      ctx.roomInstances,
      result.instance.id,
      result.instance.x,
      result.instance.y,
      result.instance.x + dx,
      result.instance.y + dy
    )
    return {
      result: {
        ...result,
        instance: {
          ...result.instance,
          x: nextPosition.x,
          y: nextPosition.y
        }
      }
    }
  }
  if (action.type === "setVelocity") {
    const speed = resolveNumberValue(action.speed, result, ctx) ?? 0
    const direction = resolveNumberValue(action.direction, result, ctx) ?? 0
    const radians = (direction * Math.PI) / 180
    const nextPosition = resolveSolidLimitedPosition(
      ctx.project,
      ctx.roomInstances,
      result.instance.id,
      result.instance.x,
      result.instance.y,
      result.instance.x + Math.cos(radians) * speed,
      result.instance.y + Math.sin(radians) * speed
    )
    return {
      result: {
        ...result,
        instance: {
          ...result.instance,
          x: nextPosition.x,
          y: nextPosition.y
        }
      }
    }
  }
  if (action.type === "rotate") {
    const currentRotation = result.instance.rotation ?? 0
    const angle = resolveNumberValue(action.angle, result, ctx) ?? 0
    return {
      result: {
        ...result,
        instance: {
          ...result.instance,
          rotation: action.mode === "set" ? angle : currentRotation + angle
        }
      }
    }
  }
  if (action.type === "moveToward") {
    const speed = resolveNumberValue(action.speed, result, ctx) ?? 0
    if (speed === 0) {
      return { result }
    }

    let targetX: number | null = null
    let targetY: number | null = null

    if (action.targetType === "mouse") {
      const mouseX = result.runtime.mouse.x
      const mouseY = result.runtime.mouse.y
      if (typeof mouseX === "number" && typeof mouseY === "number") {
        targetX = mouseX
        targetY = mouseY
      }
    } else if (action.targetObjectId) {
      const candidates = ctx.roomInstances.filter(
        (instanceEntry) => instanceEntry.objectId === action.targetObjectId && instanceEntry.id !== result.instance.id
      )
      if (candidates.length > 0) {
        const nearest = candidates.reduce((best, candidate) => {
          const bestDist =
            (best.x - result.instance.x) * (best.x - result.instance.x) +
            (best.y - result.instance.y) * (best.y - result.instance.y)
          const candidateDist =
            (candidate.x - result.instance.x) * (candidate.x - result.instance.x) +
            (candidate.y - result.instance.y) * (candidate.y - result.instance.y)
          return candidateDist < bestDist ? candidate : best
        })
        targetX = nearest.x
        targetY = nearest.y
      }
    }

    if (targetX === null || targetY === null) {
      return { result }
    }

    const deltaX = targetX - result.instance.x
    const deltaY = targetY - result.instance.y
    if (deltaX === 0 && deltaY === 0) {
      return { result }
    }

    const radians = Math.atan2(deltaY, deltaX)
    const nextPosition = resolveSolidLimitedPosition(
      ctx.project,
      ctx.roomInstances,
      result.instance.id,
      result.instance.x,
      result.instance.y,
      result.instance.x + Math.cos(radians) * speed,
      result.instance.y + Math.sin(radians) * speed
    )
    return {
      result: {
        ...result,
        instance: {
          ...result.instance,
          x: nextPosition.x,
          y: nextPosition.y
        }
      }
    }
  }
  if (action.type === "clampToRoom") {
    const maxX = Math.max(0, ctx.roomWidth - getInstanceWidth(ctx.project, result.instance))
    const maxY = Math.max(0, ctx.roomHeight - getInstanceHeight(ctx.project, result.instance))
    return {
      result: {
        ...result,
        instance: {
          ...result.instance,
          x: clampValue(result.instance.x, 0, maxX),
          y: clampValue(result.instance.y, 0, maxY)
        }
      }
    }
  }
  if (action.type === "teleport") {
    if (action.mode === "position") {
      const resolvedX = action.x === null ? undefined : resolveNumberValue(action.x, result, ctx)
      const resolvedY = action.y === null ? undefined : resolveNumberValue(action.y, result, ctx)
      return {
        result: {
          ...result,
          instance: {
            ...result.instance,
            x: resolvedX ?? result.instance.x,
            y: resolvedY ?? result.instance.y
          }
        }
      }
    }
    if (action.mode === "mouse") {
      const mouseX = result.runtime.mouse.x
      const mouseY = result.runtime.mouse.y
      return {
        result: {
          ...result,
          instance: {
            ...result.instance,
            x: typeof mouseX === "number" ? mouseX : result.instance.x,
            y: typeof mouseY === "number" ? mouseY : result.instance.y
          }
        }
      }
    }
    if (ctx.startPosition) {
      return {
        result: {
          ...result,
          instance: {
            ...result.instance,
            x: ctx.startPosition.x,
            y: ctx.startPosition.y
          }
        }
      }
    }
    return { result }
  }
  if (action.type === "teleportWindow") {
    const currentWindow = clampWindowToRoom(
      result.runtime.windowByRoomId[ctx.roomId]?.x ?? 0,
      result.runtime.windowByRoomId[ctx.roomId]?.y ?? 0,
      ctx.roomWidth,
      ctx.roomHeight
    )
    let targetWindow = currentWindow
    if (action.mode === "position") {
      const resolvedX = action.x === null ? currentWindow.x : resolveNumberValue(action.x, result, ctx)
      const resolvedY = action.y === null ? currentWindow.y : resolveNumberValue(action.y, result, ctx)
      targetWindow = clampWindowToRoom(
        resolvedX ?? currentWindow.x,
        resolvedY ?? currentWindow.y,
        ctx.roomWidth,
        ctx.roomHeight
      )
    } else {
      const centerX = result.instance.x + getInstanceWidth(ctx.project, result.instance) / 2
      const centerY = result.instance.y + getInstanceHeight(ctx.project, result.instance) / 2
      targetWindow = clampWindowToRoom(
        centerX - WINDOW_WIDTH / 2,
        centerY - WINDOW_HEIGHT / 2,
        ctx.roomWidth,
        ctx.roomHeight
      )
    }
    return {
      result: {
        ...result,
        runtime: {
          ...result.runtime,
          windowByRoomId: {
            ...result.runtime.windowByRoomId,
            [ctx.roomId]: targetWindow
          }
        }
      }
    }
  }
  if (action.type === "moveWindow") {
    const currentWindow = clampWindowToRoom(
      result.runtime.windowByRoomId[ctx.roomId]?.x ?? 0,
      result.runtime.windowByRoomId[ctx.roomId]?.y ?? 0,
      ctx.roomWidth,
      ctx.roomHeight
    )
    const dx = resolveNumberValue(action.dx, result, ctx) ?? 0
    const dy = resolveNumberValue(action.dy, result, ctx) ?? 0
    const targetWindow = clampWindowToRoom(
      currentWindow.x + dx,
      currentWindow.y + dy,
      ctx.roomWidth,
      ctx.roomHeight
    )
    return {
      result: {
        ...result,
        runtime: {
          ...result.runtime,
          windowByRoomId: {
            ...result.runtime.windowByRoomId,
            [ctx.roomId]: targetWindow
          }
        }
      }
    }
  }
  if (action.type === "destroySelf") {
    return {
      result: {
        ...result,
        destroyedInstanceIds: mergeDestroyedIds(result.destroyedInstanceIds, result.instance.id)
      }
    }
  }
  if (action.type === "destroyOther") {
    if (!ctx.collisionOtherInstanceId) {
      return { result }
    }
    return {
      result: {
        ...result,
        destroyedInstanceIds: mergeDestroyedIds(result.destroyedInstanceIds, ctx.collisionOtherInstanceId)
      }
    }
  }
  if (action.type === "spawnObject") {
    const targetObjectExists = ctx.project.objects.some((objectEntry) => objectEntry.id === action.objectId)
    if (!targetObjectExists) {
      return { result }
    }
    const isAbsolute = action.positionMode === "absolute"
    const resolvedX = resolveNumberValue(action.offsetX, result, ctx) ?? 0
    const resolvedY = resolveNumberValue(action.offsetY, result, ctx) ?? 0
    const spawnerW = getObjectWidth(ctx.project, result.instance.objectId)
    const spawnerH = getObjectHeight(ctx.project, result.instance.objectId)
    const centerX = result.instance.x + spawnerW / 2
    const centerY = result.instance.y + spawnerH / 2
    return {
      result: {
        ...result,
        spawned: [
          ...result.spawned,
          {
            id: `instance-${generateUUID()}`,
            objectId: action.objectId,
            x: isAbsolute ? resolvedX : centerX + resolvedX,
            y: isAbsolute ? resolvedY : centerY + resolvedY,
            layer: 0,
            rotation: 0
          }
        ]
      }
    }
  }
  if (action.type === "changeScore") {
    const delta = resolveNumberValue(action.delta, result, ctx) ?? 0
    return {
      result: {
        ...result,
        scoreDelta: result.scoreDelta + delta
      }
    }
  }
  if (action.type === "endGame") {
    const message = resolveStringValue(action.message, result, ctx)
    if (message === undefined) {
      return { result }
    }
    return {
      result: {
        ...result,
        gameOverMessage: message
      }
    }
  }
  if (action.type === "message") {
    const text = resolveStringValue(action.text, result, ctx)
    const durationMs = resolveNumberValue(action.durationMs, result, ctx)
    if (text === undefined || durationMs === undefined) {
      return { result }
    }
    return {
      result: {
        ...result,
        runtime: enqueueRuntimeToast(result.runtime as RuntimeToastState, {
          text,
          durationMs: Math.max(1, Math.round(durationMs))
        }) as RuntimeState
      }
    }
  }
  if (action.type === "setObjectText") {
    const text = resolveStringValue(action.text, result, ctx)
    if (text === undefined) {
      return { result }
    }

    if (text === "") {
      if (!(result.instance.id in result.runtime.objectTextByInstanceId)) {
        return { result }
      }
      const { [result.instance.id]: _removed, ...nextObjectTextByInstanceId } = result.runtime.objectTextByInstanceId
      void _removed
      return {
        result: {
          ...result,
          runtime: {
            ...result.runtime,
            objectTextByInstanceId: nextObjectTextByInstanceId
          }
        }
      }
    }

    const mode = action.mode ?? "temporary"
    let remainingMs: number | null = null
    if (mode === "temporary") {
      const resolvedDurationMs = resolveNumberValue(action.durationMs ?? 2000, result, ctx)
      if (resolvedDurationMs === undefined) {
        return { result }
      }
      remainingMs = Math.max(1, Math.round(resolvedDurationMs))
    }

    return {
      result: {
        ...result,
        runtime: {
          ...result.runtime,
          objectTextByInstanceId: {
            ...result.runtime.objectTextByInstanceId,
            [result.instance.id]: {
              text,
              justification: action.justification ?? "center",
              remainingMs
            }
          }
        }
      }
    }
  }
  if (action.type === "playSound") {
    return {
      result: {
        ...result,
        playedSoundIds: [...result.playedSoundIds, action.soundId]
      }
    }
  }
  if (action.type === "changeVariable") {
    if (action.scope === "global") {
      if (isReadonlyGlobalVariableId(action.variableId)) {
        return { result }
      }
      if (action.operator === "set") {
        const existingValue = result.runtime.globalVariables[action.variableId]
        if (existingValue === undefined) {
          return { result }
        }
        const expectedType = typeof existingValue
        if (expectedType !== "number" && expectedType !== "string" && expectedType !== "boolean") {
          return { result }
        }
        const resolvedValue = resolveValueAsType(action.value, expectedType, result, ctx)
        if (resolvedValue === undefined || !isSameVariableValueType(existingValue, resolvedValue)) {
          return { result }
        }
        return {
          result: {
            ...result,
            runtime: {
              ...result.runtime,
              globalVariables: {
                ...result.runtime.globalVariables,
                [action.variableId]: resolvedValue
              }
            }
          }
        }
      }
      const numValue = resolveNumberValue(action.value, result, ctx) ?? 0
      return {
        result: {
          ...result,
          runtime: applyGlobalNumericOperation(result.runtime, action.variableId, numValue, action.operator)
        }
      }
    }

    const resolvedTargetInstanceId = resolveTargetInstanceId(
      result.instance,
      action.target ?? "self",
      action.targetInstanceId ?? null,
      ctx.collisionOtherInstanceId
    )
    if (!resolvedTargetInstanceId) {
      return { result }
    }
    if (action.operator === "set") {
      const targetVariables = result.runtime.objectInstanceVariables[resolvedTargetInstanceId]
      if (!targetVariables) {
        return { result }
      }
      const existingValue = targetVariables[action.variableId]
      if (existingValue === undefined) {
        return { result }
      }
      const expectedType = typeof existingValue
      if (expectedType !== "number" && expectedType !== "string" && expectedType !== "boolean") {
        return { result }
      }
      const resolvedValue = resolveValueAsType(action.value, expectedType, result, ctx)
      if (resolvedValue === undefined || !isSameVariableValueType(existingValue, resolvedValue)) {
        return { result }
      }
      return {
        result: {
          ...result,
          runtime: {
            ...result.runtime,
            objectInstanceVariables: {
              ...result.runtime.objectInstanceVariables,
              [resolvedTargetInstanceId]: {
                ...result.runtime.objectInstanceVariables[resolvedTargetInstanceId],
                [action.variableId]: resolvedValue
              }
            }
          }
        }
      }
    }
    const numValue = resolveNumberValue(action.value, result, ctx) ?? 0
    return {
      result: {
        ...result,
        runtime: applyObjectNumericOperation(
          result.runtime,
          resolvedTargetInstanceId,
          action.variableId,
          numValue,
          action.operator
        )
      }
    }
  }
  if (action.type === "randomizeVariable") {
    const resolvedMin = resolveNumberValue(action.min, result, ctx)
    const resolvedMax = resolveNumberValue(action.max, result, ctx)
    const resolvedStep = action.step === undefined ? 1 : resolveNumberValue(action.step, result, ctx)
    if (resolvedMin === undefined || resolvedMax === undefined || resolvedStep === undefined) {
      return { result }
    }
    const min = Math.round(resolvedMin)
    const max = Math.round(resolvedMax)
    const step = Math.round(resolvedStep)
    if (step <= 0 || min > max) {
      return { result }
    }
    const steps = Math.floor((max - min) / step)
    const index = Math.floor(Math.random() * (steps + 1))
    const randomValue = min + index * step
    if (action.scope === "global") {
      if (isReadonlyGlobalVariableId(action.variableId)) {
        return { result }
      }
      const existingValue = result.runtime.globalVariables[action.variableId]
      if (typeof existingValue !== "number") {
        return { result }
      }
      return {
        result: {
          ...result,
          runtime: {
            ...result.runtime,
            globalVariables: {
              ...result.runtime.globalVariables,
              [action.variableId]: randomValue
            }
          }
        }
      }
    }
    const resolvedTargetInstanceId = resolveTargetInstanceId(
      result.instance,
      action.target ?? "self",
      action.targetInstanceId ?? null,
      ctx.collisionOtherInstanceId
    )
    if (!resolvedTargetInstanceId) {
      return { result }
    }
    const targetVariables = result.runtime.objectInstanceVariables[resolvedTargetInstanceId]
    if (!targetVariables || typeof targetVariables[action.variableId] !== "number") {
      return { result }
    }
    return {
      result: {
        ...result,
        runtime: {
          ...result.runtime,
          objectInstanceVariables: {
            ...result.runtime.objectInstanceVariables,
            [resolvedTargetInstanceId]: {
              ...result.runtime.objectInstanceVariables[resolvedTargetInstanceId],
              [action.variableId]: randomValue
            }
          }
        }
      }
    }
  }
  if (action.type === "copyVariable") {
    const resolvedInstanceId = resolveTargetInstanceId(
      result.instance,
      action.instanceTarget,
      action.instanceTargetId,
      ctx.collisionOtherInstanceId
    )
    if (!resolvedInstanceId) {
      return { result }
    }
    if (action.direction === "globalToObject") {
      const globalValue = result.runtime.globalVariables[action.globalVariableId]
      const targetVariables = result.runtime.objectInstanceVariables[resolvedInstanceId]
      if (globalValue === undefined || !targetVariables) {
        return { result }
      }
      const existingValue = targetVariables[action.objectVariableId]
      if (existingValue === undefined || !isSameVariableValueType(existingValue, globalValue)) {
        return { result }
      }
      return {
        result: {
          ...result,
          runtime: {
            ...result.runtime,
            objectInstanceVariables: {
              ...result.runtime.objectInstanceVariables,
              [resolvedInstanceId]: {
                ...result.runtime.objectInstanceVariables[resolvedInstanceId],
                [action.objectVariableId]: globalValue
              }
            }
          }
        }
      }
    }

    const sourceVariables = result.runtime.objectInstanceVariables[resolvedInstanceId]
    if (!sourceVariables || !(action.objectVariableId in sourceVariables)) {
      return { result }
    }
    const sourceValue = sourceVariables[action.objectVariableId]
    if (isReadonlyGlobalVariableId(action.globalVariableId)) {
      return { result }
    }
    const existingGlobalValue = result.runtime.globalVariables[action.globalVariableId]
    if (sourceValue === undefined || existingGlobalValue === undefined || !isSameVariableValueType(existingGlobalValue, sourceValue)) {
      return { result }
    }
    return {
      result: {
        ...result,
        runtime: {
          ...result.runtime,
          globalVariables: {
            ...result.runtime.globalVariables,
            [action.globalVariableId]: sourceValue
          }
        }
      }
    }
  }
  if (action.type === "listPush") {
    const targetInstanceId = resolveCollectionTargetInstanceId(action, result, ctx)
    const collectionDefinition =
      action.scope === "global"
        ? getGlobalCollectionDefinition(ctx.project, action.variableId, "list")
        : targetInstanceId
          ? getObjectCollectionDefinition(ctx.project, ctx.roomInstances, targetInstanceId, action.variableId, "list")
          : null
    if (!collectionDefinition) {
      return { result }
    }
    const resolvedValue = resolveExpressionValue(action.value, result, ctx)
    if (resolvedValue === undefined || !isScalarValue(resolvedValue)) {
      return { result }
    }
    if (!isScalarValueOfItemType(resolvedValue, collectionDefinition.itemType)) {
      return { result }
    }
    if (action.scope === "global") {
      const existing = result.runtime.globalVariables[action.variableId]
      if (!isScalarListValue(existing)) {
        return { result }
      }
      return {
        result: {
          ...result,
          runtime: {
            ...result.runtime,
            globalVariables: {
              ...result.runtime.globalVariables,
              [action.variableId]: [...existing, resolvedValue]
            }
          }
        }
      }
    }
    if (!targetInstanceId) {
      return { result }
    }
    const existing = result.runtime.objectInstanceVariables[targetInstanceId]?.[action.variableId]
    if (!isScalarListValue(existing)) {
      return { result }
    }
    return {
      result: {
        ...result,
        runtime: updateObjectVariableValue(result.runtime, targetInstanceId, action.variableId, [...existing, resolvedValue])
      }
    }
  }
  if (action.type === "listSetAt") {
    const targetInstanceId = resolveCollectionTargetInstanceId(action, result, ctx)
    const collectionDefinition =
      action.scope === "global"
        ? getGlobalCollectionDefinition(ctx.project, action.variableId, "list")
        : targetInstanceId
          ? getObjectCollectionDefinition(ctx.project, ctx.roomInstances, targetInstanceId, action.variableId, "list")
          : null
    if (!collectionDefinition) {
      return { result }
    }
    const index = resolveNumberValue(action.index, result, ctx)
    const resolvedValue = resolveExpressionValue(action.value, result, ctx)
    if (index === undefined || !Number.isInteger(index) || resolvedValue === undefined || !isScalarValue(resolvedValue)) {
      return { result }
    }
    if (!isScalarValueOfItemType(resolvedValue, collectionDefinition.itemType)) {
      return { result }
    }
    if (action.scope === "global") {
      const existing = result.runtime.globalVariables[action.variableId]
      if (!isScalarListValue(existing) || index < 0 || index >= existing.length) {
        return { result }
      }
      const nextList = [...existing]
      nextList[index] = resolvedValue
      return {
        result: {
          ...result,
          runtime: {
            ...result.runtime,
            globalVariables: {
              ...result.runtime.globalVariables,
              [action.variableId]: nextList
            }
          }
        }
      }
    }
    if (!targetInstanceId) {
      return { result }
    }
    const existing = result.runtime.objectInstanceVariables[targetInstanceId]?.[action.variableId]
    if (!isScalarListValue(existing) || index < 0 || index >= existing.length) {
      return { result }
    }
    const nextList = [...existing]
    nextList[index] = resolvedValue
    return {
      result: {
        ...result,
        runtime: updateObjectVariableValue(result.runtime, targetInstanceId, action.variableId, nextList)
      }
    }
  }
  if (action.type === "listRemoveAt") {
    const targetInstanceId = resolveCollectionTargetInstanceId(action, result, ctx)
    const collectionDefinition =
      action.scope === "global"
        ? getGlobalCollectionDefinition(ctx.project, action.variableId, "list")
        : targetInstanceId
          ? getObjectCollectionDefinition(ctx.project, ctx.roomInstances, targetInstanceId, action.variableId, "list")
          : null
    if (!collectionDefinition) {
      return { result }
    }
    const index = resolveNumberValue(action.index, result, ctx)
    if (index === undefined || !Number.isInteger(index)) {
      return { result }
    }
    if (action.scope === "global") {
      const existing = result.runtime.globalVariables[action.variableId]
      if (!isScalarListValue(existing) || index < 0 || index >= existing.length) {
        return { result }
      }
      return {
        result: {
          ...result,
          runtime: {
            ...result.runtime,
            globalVariables: {
              ...result.runtime.globalVariables,
              [action.variableId]: existing.filter((_, itemIndex) => itemIndex !== index)
            }
          }
        }
      }
    }
    if (!targetInstanceId) {
      return { result }
    }
    const existing = result.runtime.objectInstanceVariables[targetInstanceId]?.[action.variableId]
    if (!isScalarListValue(existing) || index < 0 || index >= existing.length) {
      return { result }
    }
    return {
      result: {
        ...result,
        runtime: updateObjectVariableValue(
          result.runtime,
          targetInstanceId,
          action.variableId,
          existing.filter((_, itemIndex) => itemIndex !== index)
        )
      }
    }
  }
  if (action.type === "listClear") {
    const targetInstanceId = resolveCollectionTargetInstanceId(action, result, ctx)
    const collectionDefinition =
      action.scope === "global"
        ? getGlobalCollectionDefinition(ctx.project, action.variableId, "list")
        : targetInstanceId
          ? getObjectCollectionDefinition(ctx.project, ctx.roomInstances, targetInstanceId, action.variableId, "list")
          : null
    if (!collectionDefinition) {
      return { result }
    }
    if (action.scope === "global") {
      const existing = result.runtime.globalVariables[action.variableId]
      if (!isScalarListValue(existing)) {
        return { result }
      }
      return {
        result: {
          ...result,
          runtime: {
            ...result.runtime,
            globalVariables: {
              ...result.runtime.globalVariables,
              [action.variableId]: []
            }
          }
        }
      }
    }
    if (!targetInstanceId) {
      return { result }
    }
    const existing = result.runtime.objectInstanceVariables[targetInstanceId]?.[action.variableId]
    if (!isScalarListValue(existing)) {
      return { result }
    }
    return {
      result: {
        ...result,
        runtime: updateObjectVariableValue(result.runtime, targetInstanceId, action.variableId, [])
      }
    }
  }
  if (action.type === "mapSet") {
    const targetInstanceId = resolveCollectionTargetInstanceId(action, result, ctx)
    const collectionDefinition =
      action.scope === "global"
        ? getGlobalCollectionDefinition(ctx.project, action.variableId, "map")
        : targetInstanceId
          ? getObjectCollectionDefinition(ctx.project, ctx.roomInstances, targetInstanceId, action.variableId, "map")
          : null
    if (!collectionDefinition) {
      return { result }
    }
    const key = resolveStringValue(action.key, result, ctx)
    const resolvedValue = resolveExpressionValue(action.value, result, ctx)
    if (key === undefined || resolvedValue === undefined || !isScalarValue(resolvedValue)) {
      return { result }
    }
    if (!isScalarValueOfItemType(resolvedValue, collectionDefinition.itemType)) {
      return { result }
    }
    if (action.scope === "global") {
      const existing = result.runtime.globalVariables[action.variableId]
      if (!isScalarMapValue(existing)) {
        return { result }
      }
      return {
        result: {
          ...result,
          runtime: {
            ...result.runtime,
            globalVariables: {
              ...result.runtime.globalVariables,
              [action.variableId]: {
                ...existing,
                [key]: resolvedValue
              }
            }
          }
        }
      }
    }
    if (!targetInstanceId) {
      return { result }
    }
    const existing = result.runtime.objectInstanceVariables[targetInstanceId]?.[action.variableId]
    if (!isScalarMapValue(existing)) {
      return { result }
    }
    return {
      result: {
        ...result,
        runtime: updateObjectVariableValue(result.runtime, targetInstanceId, action.variableId, {
          ...existing,
          [key]: resolvedValue
        })
      }
    }
  }
  if (action.type === "mapDelete") {
    const targetInstanceId = resolveCollectionTargetInstanceId(action, result, ctx)
    const collectionDefinition =
      action.scope === "global"
        ? getGlobalCollectionDefinition(ctx.project, action.variableId, "map")
        : targetInstanceId
          ? getObjectCollectionDefinition(ctx.project, ctx.roomInstances, targetInstanceId, action.variableId, "map")
          : null
    if (!collectionDefinition) {
      return { result }
    }
    const key = resolveStringValue(action.key, result, ctx)
    if (key === undefined) {
      return { result }
    }
    if (action.scope === "global") {
      const existing = result.runtime.globalVariables[action.variableId]
      if (!isScalarMapValue(existing) || !(key in existing)) {
        return { result }
      }
      const nextMap = { ...existing }
      delete nextMap[key]
      return {
        result: {
          ...result,
          runtime: {
            ...result.runtime,
            globalVariables: {
              ...result.runtime.globalVariables,
              [action.variableId]: nextMap
            }
          }
        }
      }
    }
    if (!targetInstanceId) {
      return { result }
    }
    const existing = result.runtime.objectInstanceVariables[targetInstanceId]?.[action.variableId]
    if (!isScalarMapValue(existing) || !(key in existing)) {
      return { result }
    }
    const nextMap = { ...existing }
    delete nextMap[key]
    return {
      result: {
        ...result,
        runtime: updateObjectVariableValue(result.runtime, targetInstanceId, action.variableId, nextMap)
      }
    }
  }
  if (action.type === "mapClear") {
    const targetInstanceId = resolveCollectionTargetInstanceId(action, result, ctx)
    const collectionDefinition =
      action.scope === "global"
        ? getGlobalCollectionDefinition(ctx.project, action.variableId, "map")
        : targetInstanceId
          ? getObjectCollectionDefinition(ctx.project, ctx.roomInstances, targetInstanceId, action.variableId, "map")
          : null
    if (!collectionDefinition) {
      return { result }
    }
    if (action.scope === "global") {
      const existing = result.runtime.globalVariables[action.variableId]
      if (!isScalarMapValue(existing)) {
        return { result }
      }
      return {
        result: {
          ...result,
          runtime: {
            ...result.runtime,
            globalVariables: {
              ...result.runtime.globalVariables,
              [action.variableId]: {}
            }
          }
        }
      }
    }
    if (!targetInstanceId) {
      return { result }
    }
    const existing = result.runtime.objectInstanceVariables[targetInstanceId]?.[action.variableId]
    if (!isScalarMapValue(existing)) {
      return { result }
    }
    return {
      result: {
        ...result,
        runtime: updateObjectVariableValue(result.runtime, targetInstanceId, action.variableId, {})
      }
    }
  }
  if (action.type === "goToRoom") {
    const targetRoom = ctx.project.rooms.find((roomEntry) => roomEntry.id === action.roomId)
    if (!targetRoom) {
      return { result }
    }
    return {
      result: {
        ...result,
        runtime: {
          ...result.runtime,
          nextRoomId: action.roomId,
          nextRoomTransition: action.transition ?? "none"
        }
      }
    }
  }
  if (action.type === "restartRoom") {
    return {
      result: {
        ...result,
        runtime: {
          ...result.runtime,
          restartRoomRequested: true
        }
      }
    }
  }
  if (action.type === "wait") {
    const durationMs = resolveNumberValue(action.durationMs, result, ctx)
    if (durationMs === undefined) {
      return { result }
    }
    const roundedDuration = Math.max(1, Math.round(durationMs))
    const waitKey = buildWaitActionKey(result.instance.id, action.id, ctx.collisionOtherInstanceId)
    const elapsed = result.runtime.waitElapsedByInstanceActionId[waitKey] ?? 0
    const nextElapsed = elapsed + RUNTIME_TICK_MS
    if (nextElapsed < roundedDuration) {
      return {
        result: {
          ...result,
          halted: true,
          runtime: {
            ...result.runtime,
            waitElapsedByInstanceActionId: {
              ...result.runtime.waitElapsedByInstanceActionId,
              [waitKey]: nextElapsed
            }
          }
        },
        halt: true
      }
    }
    return {
      result: {
        ...result,
        runtime: {
          ...result.runtime,
          waitElapsedByInstanceActionId: removeWaitProgress(result.runtime.waitElapsedByInstanceActionId, waitKey)
        }
      }
    }
  }
  if (action.type === "changeSprite") {
    const targetInstanceId = resolveTargetInstanceId(
      result.instance,
      action.target,
      null,
      ctx.collisionOtherInstanceId
    )
    if (!targetInstanceId) {
      return { result }
    }
    const overrideSpriteId = result.runtime.spriteOverrideByInstanceId[targetInstanceId]
    if (overrideSpriteId === action.spriteId) {
      return { result }
    }
    if (overrideSpriteId === undefined) {
      const targetInstance = targetInstanceId === result.instance.id
        ? result.instance
        : ctx.roomInstances.find((entry) => entry.id === targetInstanceId)
      const targetObject = targetInstance
        ? ctx.project.objects.find((entry) => entry.id === targetInstance.objectId)
        : undefined
      if (targetObject?.spriteId === action.spriteId) {
        return { result }
      }
    }
    return {
      result: {
        ...result,
        runtime: {
          ...result.runtime,
          spriteOverrideByInstanceId: {
            ...result.runtime.spriteOverrideByInstanceId,
            [targetInstanceId]: action.spriteId
          },
          spriteAnimationElapsedMsByInstanceId: {
            ...result.runtime.spriteAnimationElapsedMsByInstanceId,
            [targetInstanceId]: 0
          }
        }
      }
    }
  }
  if (action.type === "setSpriteSpeed") {
    const speedMs = resolveNumberValue(action.speedMs, result, ctx) ?? DEFAULT_SPRITE_SPEED_MS
    const targetInstanceId = resolveTargetInstanceId(
      result.instance,
      action.target,
      null,
      ctx.collisionOtherInstanceId
    )
    if (!targetInstanceId) {
      return { result }
    }
    const clampedSpeed = Math.max(0, speedMs)
    const currentSpeed = result.runtime.spriteSpeedMsByInstanceId[targetInstanceId]
    if (currentSpeed === clampedSpeed) {
      return { result }
    }
    return {
      result: {
        ...result,
        runtime: {
          ...result.runtime,
          spriteSpeedMsByInstanceId: {
            ...result.runtime.spriteSpeedMsByInstanceId,
            [targetInstanceId]: clampedSpeed
          }
        }
      }
    }
  }
  return { result }
}

type ActionExecutor<K extends RuntimeAction["type"]> = (
  action: Extract<RuntimeAction, { type: K }>,
  result: RuntimeActionResult,
  ctx: ActionContext
) => { result: RuntimeActionResult; halt?: boolean }

export type ActionRuntimeRegistry = {
  [K in RuntimeAction["type"]]: ActionExecutor<K>
}

export const ACTION_RUNTIME_REGISTRY: ActionRuntimeRegistry = {
  move: (action, result, ctx) => executeActionFallback(action, result, ctx),
  setVelocity: (action, result, ctx) => executeActionFallback(action, result, ctx),
  rotate: (action, result, ctx) => executeActionFallback(action, result, ctx),
  moveToward: (action, result, ctx) => executeActionFallback(action, result, ctx),
  clampToRoom: (action, result, ctx) => executeActionFallback(action, result, ctx),
  teleport: (action, result, ctx) => executeActionFallback(action, result, ctx),
  destroySelf: (action, result, ctx) => executeActionFallback(action, result, ctx),
  destroyOther: (action, result, ctx) => executeActionFallback(action, result, ctx),
  spawnObject: (action, result, ctx) => executeActionFallback(action, result, ctx),
  changeScore: (action, result, ctx) => executeActionFallback(action, result, ctx),
  endGame: (action, result, ctx) => executeActionFallback(action, result, ctx),
  message: (action, result, ctx) => executeActionFallback(action, result, ctx),
  setObjectText: (action, result, ctx) => executeActionFallback(action, result, ctx),
  playSound: (action, result, ctx) => executeActionFallback(action, result, ctx),
  changeVariable: (action, result, ctx) => executeActionFallback(action, result, ctx),
  randomizeVariable: (action, result, ctx) => executeActionFallback(action, result, ctx),
  copyVariable: (action, result, ctx) => executeActionFallback(action, result, ctx),
  listPush: (action, result, ctx) => executeActionFallback(action, result, ctx),
  listSetAt: (action, result, ctx) => executeActionFallback(action, result, ctx),
  listRemoveAt: (action, result, ctx) => executeActionFallback(action, result, ctx),
  listClear: (action, result, ctx) => executeActionFallback(action, result, ctx),
  mapSet: (action, result, ctx) => executeActionFallback(action, result, ctx),
  mapDelete: (action, result, ctx) => executeActionFallback(action, result, ctx),
  mapClear: (action, result, ctx) => executeActionFallback(action, result, ctx),
  goToRoom: (action, result, ctx) => executeActionFallback(action, result, ctx),
  teleportWindow: (action, result, ctx) => executeActionFallback(action, result, ctx),
  moveWindow: (action, result, ctx) => executeActionFallback(action, result, ctx),
  restartRoom: (action, result, ctx) => executeActionFallback(action, result, ctx),
  wait: (action, result, ctx) => executeActionFallback(action, result, ctx),
  changeSprite: (action, result, ctx) => executeActionFallback(action, result, ctx),
  setSpriteSpeed: (action, result, ctx) => executeActionFallback(action, result, ctx),
  repeat: (_action, result) => ({ result }),
  forEachList: (_action, result) => ({ result }),
  forEachMap: (_action, result) => ({ result }),
  emitCustomEvent: (action, result, ctx) => executeEmitCustomEvent(action, result, ctx)
}

function dispatchAction<K extends RuntimeAction["type"]>(
  action: Extract<RuntimeAction, { type: K }>,
  result: RuntimeActionResult,
  ctx: ActionContext
): { result: RuntimeActionResult; halt?: boolean } {
  const executor = ACTION_RUNTIME_REGISTRY[action.type]
  if (!executor) {
    return { result }
  }
  return executor(action, result, ctx)
}

export function executeAction(
  action: RuntimeAction,
  result: RuntimeActionResult,
  ctx: ActionContext
): { result: RuntimeActionResult; halt?: boolean } {
  return dispatchAction(action, result, ctx)
}
