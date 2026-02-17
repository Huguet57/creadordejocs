import { generateUUID, type ProjectV1, type ValueExpressionOutput } from "@creadordejocs/project-format"
import { buildWaitActionKey, removeWaitProgress } from "./event-lock-utils.js"
import { enqueueRuntimeToast, type RuntimeToastState } from "./message-toast-utils.js"
import {
  BUILTIN_MOUSE_X_VARIABLE_ID,
  BUILTIN_MOUSE_Y_VARIABLE_ID,
  ROOM_HEIGHT,
  ROOM_WIDTH,
  RUNTIME_TICK_MS,
  applyGlobalNumericOperation,
  applyObjectNumericOperation,
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
  startPosition: { x: number; y: number } | null
  collisionOtherInstanceId: string | null
  roomInstances: ProjectV1["rooms"][number]["instances"]
}

type RuntimeVariableType = "number" | "string" | "boolean"
type LegacyVariableReference = { scope: "global" | "object"; variableId: string }

function isLegacyVariableReference(value: ValueExpressionOutput): value is LegacyVariableReference {
  return typeof value === "object" && value !== null && "scope" in value && "variableId" in value
}

function isValueSource(value: ValueExpressionOutput): value is Exclude<ValueExpressionOutput, RuntimeVariableValue | LegacyVariableReference> {
  return typeof value === "object" && value !== null && "source" in value
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

function resolveNumberValue(expression: ValueExpressionOutput, result: RuntimeActionResult, ctx: ActionContext): number | undefined {
  const resolved = resolveValueAsType(expression, "number", result, ctx)
  return typeof resolved === "number" ? resolved : undefined
}

function resolveStringValue(expression: ValueExpressionOutput, result: RuntimeActionResult, ctx: ActionContext): string | undefined {
  const resolved = resolveValueAsType(expression, "string", result, ctx)
  return typeof resolved === "string" ? resolved : undefined
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

export function executeAction(
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
      const mouseX = result.runtime.globalVariables[BUILTIN_MOUSE_X_VARIABLE_ID]
      const mouseY = result.runtime.globalVariables[BUILTIN_MOUSE_Y_VARIABLE_ID]
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
    const maxX = ROOM_WIDTH - getInstanceWidth(ctx.project, result.instance)
    const maxY = ROOM_HEIGHT - getInstanceHeight(ctx.project, result.instance)
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
      const mouseX = result.runtime.globalVariables[BUILTIN_MOUSE_X_VARIABLE_ID]
      const mouseY = result.runtime.globalVariables[BUILTIN_MOUSE_Y_VARIABLE_ID]
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
          nextRoomId: action.roomId
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
  return { result }
}
