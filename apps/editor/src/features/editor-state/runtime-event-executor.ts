import type { ProjectV1, ValueExpressionOutput } from "@creadordejocs/project-format"
import {
  executeAction,
  resolveNumberValue,
  isScalarListValue,
  isScalarMapValue,
  mergeIterationActionResult,
  MAX_FLOW_ITERATIONS,
  type ActionContext
} from "./action-handlers.js"
import {
  getDefaultRuntimeActionResult,
  isSameVariableValueType,
  resolveTargetInstanceId,
  type RuntimeAction,
  type RuntimeActionResult,
  type RuntimeEventItem,
  type RuntimeState,
  type RuntimeVariableValue
} from "./runtime-types.js"

function isLegacyVariableReference(
  value: ValueExpressionOutput
): value is { scope: "global" | "object"; variableId: string } {
  return typeof value === "object" && value !== null && "scope" in value && "variableId" in value
}

type ValueSourceExpression = Extract<ValueExpressionOutput, { source: string }>

function isValueSource(value: ValueExpressionOutput): value is ValueSourceExpression {
  return typeof value === "object" && value !== null && "source" in value
}

function getRuntimeMouseValue(runtime: RuntimeState, attribute: "x" | "y"): number | undefined {
  const value = attribute === "x" ? runtime.mouse.x : runtime.mouse.y
  return Number.isFinite(value) ? value : undefined
}

function resolveConditionExpressionValue(
  expression: ValueExpressionOutput,
  instance: ProjectV1["rooms"][number]["instances"][number],
  runtime: RuntimeState,
  collisionOtherInstanceId: string | null,
  roomInstances: ProjectV1["rooms"][number]["instances"],
  iterationLocals: Record<string, RuntimeVariableValue>
): RuntimeVariableValue | undefined {
  if (typeof expression === "number" || typeof expression === "string" || typeof expression === "boolean") {
    return expression
  }

  if (isLegacyVariableReference(expression)) {
    if (expression.scope === "global") {
      return runtime.globalVariables[expression.variableId]
    }
    const targetInstanceId = resolveTargetInstanceId(instance, "self", null, collisionOtherInstanceId)
    if (!targetInstanceId) {
      return undefined
    }
    return runtime.objectInstanceVariables[targetInstanceId]?.[expression.variableId]
  }

  if (!isValueSource(expression)) {
    return undefined
  }

  if (expression.source === "literal") {
    return expression.value
  }

  if (expression.source === "globalVariable") {
    return runtime.globalVariables[expression.variableId]
  }

  if (expression.source === "mouseAttribute") {
    return getRuntimeMouseValue(runtime, expression.attribute)
  }

  if (expression.source === "iterationVariable") {
    return iterationLocals[expression.variableName]
  }

  if (expression.source === "internalVariable") {
    const targetInstanceId = resolveTargetInstanceId(
      instance,
      expression.target,
      null,
      collisionOtherInstanceId
    )
    if (!targetInstanceId) {
      return undefined
    }
    return runtime.objectInstanceVariables[targetInstanceId]?.[expression.variableId]
  }

  if (expression.source === "attribute") {
    const targetInstanceId = resolveTargetInstanceId(
      instance,
      expression.target,
      null,
      collisionOtherInstanceId
    )
    if (!targetInstanceId) {
      return undefined
    }
    const targetInstance =
      targetInstanceId === instance.id
        ? instance
        : roomInstances.find((instanceEntry) => instanceEntry.id === targetInstanceId)
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
      return roomInstances.filter((instanceEntry) => instanceEntry.objectId === targetInstance.objectId).length
    }
    return targetInstance.rotation ?? 0
  }

  if (!Number.isFinite(expression.min) || !Number.isFinite(expression.max) || !Number.isFinite(expression.step)) {
    return undefined
  }
  if (expression.step <= 0 || expression.max < expression.min) {
    return undefined
  }
  const steps = Math.floor((expression.max - expression.min) / expression.step)
  const index = Math.floor(Math.random() * (steps + 1))
  return expression.min + index * expression.step
}

function isComparisonCondition(
  condition: Extract<RuntimeEventItem, { type: "if" }>["condition"]
): condition is Extract<
  Extract<RuntimeEventItem, { type: "if" }>["condition"],
  { left: ValueExpressionOutput }
> {
  return "left" in condition
}

function evaluateIfCondition(
  condition: Extract<RuntimeEventItem, { type: "if" }>["condition"],
  instance: ProjectV1["rooms"][number]["instances"][number],
  runtime: RuntimeState,
  collisionOtherInstanceId: string | null,
  roomInstances: ProjectV1["rooms"][number]["instances"],
  iterationLocals: Record<string, RuntimeVariableValue> = {}
): boolean {
  if (!isComparisonCondition(condition)) {
    if (condition.logic === "AND") {
      return condition.conditions.every((entry) =>
        evaluateIfCondition(entry, instance, runtime, collisionOtherInstanceId, roomInstances, iterationLocals)
      )
    }
    return condition.conditions.some((entry) =>
      evaluateIfCondition(entry, instance, runtime, collisionOtherInstanceId, roomInstances, iterationLocals)
    )
  }

  const leftValue = resolveConditionExpressionValue(
    condition.left,
    instance,
    runtime,
    collisionOtherInstanceId,
    roomInstances,
    iterationLocals
  )
  const rightValue = resolveConditionExpressionValue(
    condition.right,
    instance,
    runtime,
    collisionOtherInstanceId,
    roomInstances,
    iterationLocals
  )
  if (leftValue === undefined || rightValue === undefined || !isSameVariableValueType(leftValue, rightValue)) {
    return false
  }
  if (condition.operator === "==") {
    return leftValue === rightValue
  }
  if (condition.operator === "!=") {
    return leftValue !== rightValue
  }
  if (typeof leftValue !== "number" || typeof rightValue !== "number") {
    return false
  }
  if (condition.operator === ">") {
    return leftValue > rightValue
  }
  if (condition.operator === ">=") {
    return leftValue >= rightValue
  }
  if (condition.operator === "<") {
    return leftValue < rightValue
  }
  return leftValue <= rightValue
}

function runEventActions(
  project: ProjectV1,
  roomId: string,
  roomWidth: number,
  roomHeight: number,
  instance: ProjectV1["rooms"][number]["instances"][number],
  actions: RuntimeAction[],
  runtime: RuntimeState,
  startPosition: { x: number; y: number } | null = null,
  collisionOtherInstanceId: string | null = null,
  roomInstances: ProjectV1["rooms"][number]["instances"] = [],
  iterationLocals: Record<string, RuntimeVariableValue> = {}
): RuntimeActionResult {
  let result = getDefaultRuntimeActionResult(instance, runtime)
  const actionContext: ActionContext = {
    project,
    roomId,
    roomWidth,
    roomHeight,
    startPosition,
    collisionOtherInstanceId,
    roomInstances,
    iterationLocals,
    executeNestedActions: (nestedActions, nestedResult, nestedIterationLocals = iterationLocals) =>
      runEventActions(
        project,
        roomId,
        roomWidth,
        roomHeight,
        nestedResult.instance,
        nestedActions,
        nestedResult.runtime,
        startPosition,
        collisionOtherInstanceId,
        roomInstances,
        nestedIterationLocals
      )
  }

  for (const actionEntry of actions) {
    const actionExecution = executeAction(actionEntry, result, actionContext)
    result = actionExecution.result
    if (actionExecution.halt) {
      break
    }
  }

  return result
}

function buildFlowItemActionContext(
  project: ProjectV1,
  roomId: string,
  roomWidth: number,
  roomHeight: number,
  startPosition: { x: number; y: number } | null,
  collisionOtherInstanceId: string | null,
  roomInstances: ProjectV1["rooms"][number]["instances"],
  iterationLocals: Record<string, RuntimeVariableValue>
): ActionContext {
  return {
    project,
    roomId,
    roomWidth,
    roomHeight,
    startPosition,
    collisionOtherInstanceId,
    roomInstances,
    iterationLocals,
    executeNestedActions: (nestedActions, nestedResult, nestedIterationLocals = iterationLocals) =>
      runEventActions(
        project, roomId, roomWidth, roomHeight, nestedResult.instance, nestedActions, nestedResult.runtime,
        startPosition, collisionOtherInstanceId, roomInstances, nestedIterationLocals
      )
  }
}

function resolveFlowItemVariableValue(
  item: {
    scope: "global" | "object"
    variableId: string
    target?: string | undefined
    targetInstanceId?: string | null | undefined
  },
  result: RuntimeActionResult,
  collisionOtherInstanceId: string | null
): RuntimeVariableValue | undefined {
  if (item.scope === "global") {
    return result.runtime.globalVariables[item.variableId]
  }
  const targetInstanceId = resolveTargetInstanceId(
    result.instance,
    (item.target as "self" | "other" | "instanceId") ?? "self",
    item.targetInstanceId ?? null,
    collisionOtherInstanceId
  )
  if (!targetInstanceId) {
    return undefined
  }
  return result.runtime.objectInstanceVariables[targetInstanceId]?.[item.variableId]
}

export function runEventItems(
  project: ProjectV1,
  roomId: string,
  roomWidth: number,
  roomHeight: number,
  instance: ProjectV1["rooms"][number]["instances"][number],
  items: RuntimeEventItem[],
  runtime: RuntimeState,
  startPosition: { x: number; y: number } | null = null,
  collisionOtherInstanceId: string | null = null,
  roomInstances: ProjectV1["rooms"][number]["instances"] = [],
  iterationLocals: Record<string, RuntimeVariableValue> = {}
): RuntimeActionResult {
  let result = getDefaultRuntimeActionResult(instance, runtime)
  for (const itemEntry of items) {
    if (itemEntry.type === "action") {
      const actionResult = runEventActions(
        project,
        roomId,
        roomWidth,
        roomHeight,
        result.instance,
        [itemEntry.action],
        result.runtime,
        startPosition,
        collisionOtherInstanceId,
        roomInstances,
        iterationLocals
      )
      result = {
        ...actionResult,
        spawned: [...result.spawned, ...actionResult.spawned],
        destroyedInstanceIds: [...new Set([...result.destroyedInstanceIds, ...actionResult.destroyedInstanceIds])],
        scoreDelta: result.scoreDelta + actionResult.scoreDelta,
        gameOverMessage: actionResult.gameOverMessage ?? result.gameOverMessage,
        playedSoundIds: [...result.playedSoundIds, ...actionResult.playedSoundIds]
      }
      if (actionResult.halted) {
        break
      }
      continue
    }

    if (itemEntry.type === "if") {
      const conditionMatched = evaluateIfCondition(
        itemEntry.condition,
        result.instance,
        result.runtime,
        collisionOtherInstanceId,
        roomInstances,
        iterationLocals
      )
      const branchResult = runEventItems(
        project,
        roomId,
        roomWidth,
        roomHeight,
        result.instance,
        conditionMatched ? itemEntry.thenActions : itemEntry.elseActions,
        result.runtime,
        startPosition,
        collisionOtherInstanceId,
        roomInstances,
        iterationLocals
      )
      result = mergeIterationActionResult(result, branchResult)
      if (branchResult.halted) {
        break
      }
      continue
    }

    if (itemEntry.type === "repeat") {
      const actionContext = buildFlowItemActionContext(
        project,
        roomId,
        roomWidth,
        roomHeight,
        startPosition,
        collisionOtherInstanceId,
        roomInstances,
        iterationLocals
      )
      const countValue = resolveNumberValue(itemEntry.count, result, actionContext)
      if (countValue === undefined) {
        continue
      }
      const totalIterations = Math.max(0, Math.min(MAX_FLOW_ITERATIONS, Math.floor(countValue)))
      for (let index = 0; index < totalIterations; index += 1) {
        const iterResult = runEventItems(
          project,
          roomId,
          roomWidth,
          roomHeight,
          result.instance,
          itemEntry.actions,
          result.runtime,
          startPosition,
          collisionOtherInstanceId,
          roomInstances,
          { ...iterationLocals, index }
        )
        result = mergeIterationActionResult(result, iterResult)
        if (iterResult.halted) {
          break
        }
      }
      if (result.halted) {
        break
      }
      continue
    }

    if (itemEntry.type === "forEachList") {
      const listValue = resolveFlowItemVariableValue(itemEntry, result, collisionOtherInstanceId)
      if (!isScalarListValue(listValue)) {
        continue
      }
      const totalIterations = Math.min(listValue.length, MAX_FLOW_ITERATIONS)
      for (let index = 0; index < totalIterations; index += 1) {
        const itemValue = listValue[index]
        if (itemValue === undefined) {
          continue
        }
        const locals: Record<string, RuntimeVariableValue> = {
          ...iterationLocals,
          [itemEntry.itemLocalVarName]: itemValue,
          ...(itemEntry.indexLocalVarName ? { [itemEntry.indexLocalVarName]: index } : {})
        }
        const iterResult = runEventItems(
          project,
          roomId,
          roomWidth,
          roomHeight,
          result.instance,
          itemEntry.actions,
          result.runtime,
          startPosition,
          collisionOtherInstanceId,
          roomInstances,
          locals
        )
        result = mergeIterationActionResult(result, iterResult)
        if (iterResult.halted) {
          break
        }
      }
      if (result.halted) {
        break
      }
      continue
    }

    if (itemEntry.type === "forEachMap") {
      const mapValue = resolveFlowItemVariableValue(itemEntry, result, collisionOtherInstanceId)
      if (!isScalarMapValue(mapValue)) {
        continue
      }
      const entries = Object.entries(mapValue).slice(0, MAX_FLOW_ITERATIONS)
      for (const [key, value] of entries) {
        const locals: Record<string, RuntimeVariableValue> = {
          ...iterationLocals,
          [itemEntry.keyLocalVarName]: key,
          [itemEntry.valueLocalVarName]: value
        }
        const iterResult = runEventItems(
          project,
          roomId,
          roomWidth,
          roomHeight,
          result.instance,
          itemEntry.actions,
          result.runtime,
          startPosition,
          collisionOtherInstanceId,
          roomInstances,
          locals
        )
        result = mergeIterationActionResult(result, iterResult)
        if (iterResult.halted) {
          break
        }
      }
      if (result.halted) {
        break
      }
      continue
    }
  }
  return result
}
