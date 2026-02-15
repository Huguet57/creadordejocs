import type { ProjectV1 } from "@creadordejocs/project-format"
import { buildWaitActionKey, removeWaitProgress } from "./event-lock-utils.js"
import { enqueueRuntimeToast, type RuntimeToastState } from "./message-toast-utils.js"
import {
  BUILTIN_MOUSE_X_VARIABLE_ID,
  BUILTIN_MOUSE_Y_VARIABLE_ID,
  INSTANCE_SIZE,
  ROOM_HEIGHT,
  ROOM_WIDTH,
  RUNTIME_TICK_MS,
  applyGlobalNumericOperation,
  applyObjectNumericOperation,
  clampValue,
  isReadonlyGlobalVariableId,
  isSameVariableValueType,
  mergeDestroyedIds,
  resolveTargetInstanceId,
  type RuntimeAction,
  type RuntimeActionResult,
  type RuntimeState
} from "./runtime-types.js"

export type ActionContext = {
  project: ProjectV1
  startPosition: { x: number; y: number } | null
  collisionOtherInstanceId: string | null
  roomInstances: ProjectV1["rooms"][number]["instances"]
}

export function executeAction(
  action: RuntimeAction,
  result: RuntimeActionResult,
  ctx: ActionContext
): { result: RuntimeActionResult; halt?: boolean } {
  if (action.type === "move") {
    return {
      result: {
        ...result,
        instance: {
          ...result.instance,
          x: result.instance.x + action.dx,
          y: result.instance.y + action.dy
        }
      }
    }
  }
  if (action.type === "setVelocity") {
    const radians = (action.direction * Math.PI) / 180
    return {
      result: {
        ...result,
        instance: {
          ...result.instance,
          x: result.instance.x + Math.cos(radians) * action.speed,
          y: result.instance.y + Math.sin(radians) * action.speed
        }
      }
    }
  }
  if (action.type === "rotate") {
    const currentRotation = result.instance.rotation ?? 0
    return {
      result: {
        ...result,
        instance: {
          ...result.instance,
          rotation: action.mode === "set" ? action.angle : currentRotation + action.angle
        }
      }
    }
  }
  if (action.type === "moveToward") {
    if (action.speed === 0) {
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
    return {
      result: {
        ...result,
        instance: {
          ...result.instance,
          x: result.instance.x + Math.cos(radians) * action.speed,
          y: result.instance.y + Math.sin(radians) * action.speed
        }
      }
    }
  }
  if (action.type === "clampToRoom") {
    return {
      result: {
        ...result,
        instance: {
          ...result.instance,
          x: clampValue(result.instance.x, 0, ROOM_WIDTH - INSTANCE_SIZE),
          y: clampValue(result.instance.y, 0, ROOM_HEIGHT - INSTANCE_SIZE)
        }
      }
    }
  }
  if (action.type === "teleport") {
    if (action.mode === "position") {
      return {
        result: {
          ...result,
          instance: {
            ...result.instance,
            x: action.x ?? result.instance.x,
            y: action.y ?? result.instance.y
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
    return {
      result: {
        ...result,
        spawned: [
          ...result.spawned,
          {
            id: `instance-${crypto.randomUUID()}`,
            objectId: action.objectId,
            x: result.instance.x + action.offsetX,
            y: result.instance.y + action.offsetY,
            rotation: 0
          }
        ]
      }
    }
  }
  if (action.type === "changeScore") {
    return {
      result: {
        ...result,
        scoreDelta: result.scoreDelta + action.delta
      }
    }
  }
  if (action.type === "endGame") {
    return {
      result: {
        ...result,
        gameOverMessage: action.message
      }
    }
  }
  if (action.type === "message") {
    return {
      result: {
        ...result,
        runtime: enqueueRuntimeToast(result.runtime as RuntimeToastState, {
          text: action.text,
          durationMs: action.durationMs
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
        if (existingValue === undefined || !isSameVariableValueType(existingValue, action.value)) {
          return { result }
        }
        return {
          result: {
            ...result,
            runtime: {
              ...result.runtime,
              globalVariables: {
                ...result.runtime.globalVariables,
                [action.variableId]: action.value
              }
            }
          }
        }
      }
      const numValue = typeof action.value === "number" ? action.value : 0
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
      if (existingValue === undefined || !isSameVariableValueType(existingValue, action.value)) {
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
                [action.variableId]: action.value
              }
            }
          }
        }
      }
    }
    const numValue = typeof action.value === "number" ? action.value : 0
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
    if (action.min > action.max) {
      return { result }
    }
    const randomValue = Math.floor(Math.random() * (action.max - action.min + 1)) + action.min
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
    const waitKey = buildWaitActionKey(result.instance.id, action.id, ctx.collisionOtherInstanceId)
    const elapsed = result.runtime.waitElapsedByInstanceActionId[waitKey] ?? 0
    const nextElapsed = elapsed + RUNTIME_TICK_MS
    if (nextElapsed < action.durationMs) {
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
