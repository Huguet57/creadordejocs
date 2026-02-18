import type { ValueExpressionOutput } from "@creadordejocs/project-format"
import type { ActionContext } from "./action-handlers.js"
import type { RuntimeActionResult, CustomEventQueueEntry } from "./runtime-types.js"

function resolveScalarPayload(
  expression: ValueExpressionOutput,
  result: RuntimeActionResult,
  ctx: ActionContext
): number | string | boolean | undefined {
  if (typeof expression === "number" || typeof expression === "string" || typeof expression === "boolean") {
    return expression
  }
  if (typeof expression === "object" && expression !== null && "source" in expression) {
    if (expression.source === "literal") {
      const val = (expression as { source: "literal"; value: unknown }).value
      if (typeof val === "number" || typeof val === "string" || typeof val === "boolean") return val
      return undefined
    }
    if (expression.source === "globalVariable") {
      const val = result.runtime.globalVariables[(expression as { variableId: string }).variableId]
      if (typeof val === "number" || typeof val === "string" || typeof val === "boolean") return val
      return undefined
    }
    if (expression.source === "internalVariable") {
      const expr = expression as { target: "self" | "other"; variableId: string }
      const instanceId = expr.target === "self" ? result.instance.id : ctx.collisionOtherInstanceId
      if (!instanceId) return undefined
      const val = result.runtime.objectInstanceVariables[instanceId]?.[expr.variableId]
      if (typeof val === "number" || typeof val === "string" || typeof val === "boolean") return val
      return undefined
    }
    if (expression.source === "iterationVariable") {
      const val = ctx.iterationLocals[(expression as { variableName: string }).variableName]
      if (typeof val === "number" || typeof val === "string" || typeof val === "boolean") return val
      return undefined
    }
    if (expression.source === "mouseAttribute") {
      const attr = (expression as { attribute: "x" | "y" }).attribute
      return attr === "x" ? result.runtime.mouse.x : result.runtime.mouse.y
    }
    if (expression.source === "attribute") {
      const expr = expression as { target: "self" | "other"; attribute: "x" | "y" | "rotation" | "instanceCount" }
      const targetInstance = expr.target === "self"
        ? result.instance
        : ctx.roomInstances.find((inst) => inst.id === ctx.collisionOtherInstanceId)
      if (!targetInstance) return undefined
      if (expr.attribute === "x") return targetInstance.x
      if (expr.attribute === "y") return targetInstance.y
      if (expr.attribute === "rotation") return targetInstance.rotation ?? 0
      if (expr.attribute === "instanceCount") {
        return ctx.roomInstances.filter((inst) => inst.objectId === targetInstance.objectId).length
      }
      return undefined
    }
  }
  if (typeof expression === "object" && expression !== null && "scope" in expression && "variableId" in expression) {
    const legacy = expression as { scope: "global" | "object"; variableId: string }
    if (legacy.scope === "global") {
      const val = result.runtime.globalVariables[legacy.variableId]
      if (typeof val === "number" || typeof val === "string" || typeof val === "boolean") return val
      return undefined
    }
    const val = result.runtime.objectInstanceVariables[result.instance.id]?.[legacy.variableId]
    if (typeof val === "number" || typeof val === "string" || typeof val === "boolean") return val
    return undefined
  }
  return undefined
}

export function executeEmitCustomEvent(
  action: { eventName: string; payload: ValueExpressionOutput },
  result: RuntimeActionResult,
  ctx: ActionContext
): { result: RuntimeActionResult } {
  const payload = resolveScalarPayload(action.payload, result, ctx)
  if (payload === undefined) return { result }

  const entry: CustomEventQueueEntry = {
    name: action.eventName,
    payload,
    sourceObjectId: ctx.roomInstances.find((inst) => inst.id === result.instance.id)?.objectId ?? result.instance.objectId,
    sourceInstanceId: result.instance.id
  }

  return {
    result: {
      ...result,
      runtime: {
        ...result.runtime,
        customEventQueue: [...result.runtime.customEventQueue, entry]
      }
    }
  }
}
