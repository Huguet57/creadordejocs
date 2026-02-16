import type { ProjectV1, ValueExpressionOutput } from "@creadordejocs/project-format"
import {
  filterEventLocksByAliveInstances,
  filterEventLocksByRemovedInstances,
  filterWaitProgressByAliveInstances,
  filterWaitProgressByRemovedInstances,
  hasEventLock,
  parseEventLockKey,
  removeEventLock,
  transitionEventLock
} from "./event-lock-utils.js"
import { advanceRuntimeToastQueue, type RuntimeToastState } from "./message-toast-utils.js"
import { executeAction, type ActionContext } from "./action-handlers.js"
import {
  BUILTIN_MOUSE_X_VARIABLE_ID,
  BUILTIN_MOUSE_Y_VARIABLE_ID,
  INSTANCE_SIZE,
  ROOM_HEIGHT,
  ROOM_WIDTH,
  RUNTIME_TICK_MS,
  getDefaultRuntimeActionResult,
  isSameVariableValueType,
  resolveTargetInstanceId,
  type RuntimeAction,
  type RuntimeActionResult,
  type RuntimeEventItem,
  type RuntimeMouseButton,
  type RuntimeMouseInput,
  type RuntimeState,
  type RuntimeVariableValue
} from "./runtime-types.js"

export { ROOM_WIDTH, ROOM_HEIGHT }
export type { RuntimeMouseButton, RuntimeMouseInput, RuntimeState }

const EMPTY_MOUSE_BUTTONS = new Set<RuntimeMouseButton>()

const DEFAULT_RUNTIME_MOUSE_INPUT: RuntimeMouseInput = {
  x: 0,
  y: 0,
  moved: false,
  pressedButtons: EMPTY_MOUSE_BUTTONS,
  justPressedButtons: EMPTY_MOUSE_BUTTONS
}

function applyActionResultToRuntime(_runtime: RuntimeState, actionResult: RuntimeActionResult): RuntimeState {
  let nextRuntime = {
    ...actionResult.runtime,
    score: actionResult.runtime.score + actionResult.scoreDelta,
    playedSoundIds: [...actionResult.runtime.playedSoundIds, ...actionResult.playedSoundIds]
  }
  if (actionResult.gameOverMessage) {
    nextRuntime = {
      ...nextRuntime,
      gameOver: true,
      message: actionResult.gameOverMessage
    }
  }
  return nextRuntime
}

function clearRuntimeStateForRemovedInstances(runtime: RuntimeState, removedInstanceIds: string[]): RuntimeState {
  return {
    ...runtime,
    waitElapsedByInstanceActionId: filterWaitProgressByRemovedInstances(
      runtime.waitElapsedByInstanceActionId,
      removedInstanceIds
    ),
    eventLocksByKey: filterEventLocksByRemovedInstances(runtime.eventLocksByKey, removedInstanceIds)
  }
}

function isOutsideRoom(instance: ProjectV1["rooms"][number]["instances"][number]): boolean {
  return (
    instance.x < 0 ||
    instance.y < 0 ||
    instance.x > ROOM_WIDTH - INSTANCE_SIZE ||
    instance.y > ROOM_HEIGHT - INSTANCE_SIZE
  )
}

function getInstanceStartPosition(
  runtime: RuntimeState,
  instance: ProjectV1["rooms"][number]["instances"][number]
): { x: number; y: number } {
  return runtime.instanceStartPositions[instance.id] ?? { x: instance.x, y: instance.y }
}

function buildInitialGlobalVariables(project: ProjectV1): Record<string, RuntimeVariableValue> {
  return {
    ...Object.fromEntries(project.variables.global.map((definition) => [definition.id, definition.initialValue])),
    [BUILTIN_MOUSE_X_VARIABLE_ID]: 0,
    [BUILTIN_MOUSE_Y_VARIABLE_ID]: 0
  }
}

function buildInitialObjectVariablesForObject(project: ProjectV1, objectId: string): Record<string, RuntimeVariableValue> {
  const definitions = project.variables.objectByObjectId[objectId] ?? []
  return Object.fromEntries(definitions.map((definition) => [definition.id, definition.initialValue]))
}

function ensureInstanceVariables(
  runtime: RuntimeState,
  project: ProjectV1,
  instance: ProjectV1["rooms"][number]["instances"][number]
): RuntimeState {
  if (runtime.objectInstanceVariables[instance.id]) {
    return runtime
  }
  return {
    ...runtime,
    objectInstanceVariables: {
      ...runtime.objectInstanceVariables,
      [instance.id]: buildInitialObjectVariablesForObject(project, instance.objectId)
    }
  }
}

function getEventItems(eventEntry: ProjectV1["objects"][number]["events"][number]): RuntimeEventItem[] {
  if (Array.isArray(eventEntry.items)) {
    return eventEntry.items
  }
  const legacyEvent = eventEntry as ProjectV1["objects"][number]["events"][number] & {
    actions?: RuntimeAction[]
  }
  if (!Array.isArray(legacyEvent.actions)) {
    return []
  }
  return legacyEvent.actions
    .filter((entry): entry is RuntimeAction => !!entry && typeof entry.id === "string")
    .map((actionEntry) => ({
      id: `legacy-item-${actionEntry.id}`,
      type: "action" as const,
      action: actionEntry
    }))
}

function resolveConditionLeftValue(
  condition: Extract<Extract<RuntimeEventItem, { type: "if" }>["condition"], { left: { scope: "global" | "object"; variableId: string } }>,
  instance: ProjectV1["rooms"][number]["instances"][number],
  runtime: RuntimeState,
  collisionOtherInstanceId: string | null
): RuntimeVariableValue | undefined {
  if (condition.left.scope === "global") {
    return runtime.globalVariables[condition.left.variableId]
  }
  const targetInstanceId = resolveTargetInstanceId(instance, "self", null, collisionOtherInstanceId)
  if (!targetInstanceId) {
    return undefined
  }
  return runtime.objectInstanceVariables[targetInstanceId]?.[condition.left.variableId]
}

function isLegacyVariableReference(
  value: ValueExpressionOutput
): value is { scope: "global" | "object"; variableId: string } {
  return typeof value === "object" && value !== null && "scope" in value && "variableId" in value
}

function isValueSource(value: ValueExpressionOutput): value is Exclude<
  ValueExpressionOutput,
  RuntimeVariableValue | { scope: "global" | "object"; variableId: string }
> {
  return typeof value === "object" && value !== null && "source" in value
}

function resolveConditionRightValue(
  condition: Extract<Extract<RuntimeEventItem, { type: "if" }>["condition"], { left: { scope: "global" | "object"; variableId: string } }>,
  instance: ProjectV1["rooms"][number]["instances"][number],
  runtime: RuntimeState,
  collisionOtherInstanceId: string | null,
  roomInstances: ProjectV1["rooms"][number]["instances"]
): RuntimeVariableValue | undefined {
  if (typeof condition.right === "number" || typeof condition.right === "string" || typeof condition.right === "boolean") {
    return condition.right
  }

  if (isLegacyVariableReference(condition.right)) {
    if (condition.right.scope === "global") {
      return runtime.globalVariables[condition.right.variableId]
    }
    const targetInstanceId = resolveTargetInstanceId(instance, "self", null, collisionOtherInstanceId)
    if (!targetInstanceId) {
      return undefined
    }
    return runtime.objectInstanceVariables[targetInstanceId]?.[condition.right.variableId]
  }

  if (!isValueSource(condition.right)) {
    return undefined
  }

  if (condition.right.source === "literal") {
    return condition.right.value
  }

  if (condition.right.source === "globalVariable") {
    return runtime.globalVariables[condition.right.variableId]
  }

  if (condition.right.source === "internalVariable") {
    const targetInstanceId = resolveTargetInstanceId(
      instance,
      condition.right.target,
      null,
      collisionOtherInstanceId
    )
    if (!targetInstanceId) {
      return undefined
    }
    return runtime.objectInstanceVariables[targetInstanceId]?.[condition.right.variableId]
  }

  if (condition.right.source === "attribute") {
    const targetInstanceId = resolveTargetInstanceId(
      instance,
      condition.right.target,
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
    if (condition.right.attribute === "x") {
      return targetInstance.x
    }
    if (condition.right.attribute === "y") {
      return targetInstance.y
    }
    return targetInstance.rotation ?? 0
  }

  if (!Number.isFinite(condition.right.min) || !Number.isFinite(condition.right.max) || !Number.isFinite(condition.right.step)) {
    return undefined
  }
  if (condition.right.step <= 0 || condition.right.max < condition.right.min) {
    return undefined
  }
  const steps = Math.floor((condition.right.max - condition.right.min) / condition.right.step)
  const index = Math.floor(Math.random() * (steps + 1))
  return condition.right.min + index * condition.right.step
}

function isComparisonCondition(
  condition: Extract<RuntimeEventItem, { type: "if" }>["condition"]
): condition is Extract<
  Extract<RuntimeEventItem, { type: "if" }>["condition"],
  { left: { scope: "global" | "object"; variableId: string } }
> {
  return "left" in condition
}

function evaluateIfCondition(
  condition: Extract<RuntimeEventItem, { type: "if" }>["condition"],
  instance: ProjectV1["rooms"][number]["instances"][number],
  runtime: RuntimeState,
  collisionOtherInstanceId: string | null,
  roomInstances: ProjectV1["rooms"][number]["instances"]
): boolean {
  if (!isComparisonCondition(condition)) {
    if (condition.logic === "AND") {
      return condition.conditions.every((entry) =>
        evaluateIfCondition(entry, instance, runtime, collisionOtherInstanceId, roomInstances)
      )
    }
    return condition.conditions.some((entry) =>
      evaluateIfCondition(entry, instance, runtime, collisionOtherInstanceId, roomInstances)
    )
  }

  const leftValue = resolveConditionLeftValue(condition, instance, runtime, collisionOtherInstanceId)
  const rightValue = resolveConditionRightValue(condition, instance, runtime, collisionOtherInstanceId, roomInstances)
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

function applyMouseBuiltinsToRuntime(runtime: RuntimeState, mouseInput: RuntimeMouseInput): RuntimeState {
  return {
    ...runtime,
    globalVariables: {
      ...runtime.globalVariables,
      [BUILTIN_MOUSE_X_VARIABLE_ID]: mouseInput.x,
      [BUILTIN_MOUSE_Y_VARIABLE_ID]: mouseInput.y
    }
  }
}

function runOnDestroyEvents(
  project: ProjectV1,
  instance: ProjectV1["rooms"][number]["instances"][number],
  runtime: RuntimeState
): RuntimeActionResult {
  const objectEntry = project.objects.find((candidate) => candidate.id === instance.objectId)
  if (!objectEntry) {
    return getDefaultRuntimeActionResult(instance, runtime)
  }
  const onDestroyEvents = objectEntry.events.filter((eventEntry) => eventEntry.type === "OnDestroy")
  if (onDestroyEvents.length === 0) {
    return getDefaultRuntimeActionResult(instance, runtime)
  }

  let aggregate = getDefaultRuntimeActionResult(instance, runtime)
  const startPosition = getInstanceStartPosition(runtime, instance)
  for (const eventEntry of onDestroyEvents) {
    const eventResult = runEventItems(
      project,
      aggregate.instance,
      getEventItems(eventEntry),
      aggregate.runtime,
      startPosition,
      null,
      []
    )
    aggregate = {
      ...aggregate,
      instance: eventResult.instance,
      spawned: [...aggregate.spawned, ...eventResult.spawned],
      scoreDelta: aggregate.scoreDelta + eventResult.scoreDelta,
      gameOverMessage: eventResult.gameOverMessage ?? aggregate.gameOverMessage,
      playedSoundIds: [...aggregate.playedSoundIds, ...eventResult.playedSoundIds],
      runtime: eventResult.runtime
    }
  }
  return aggregate
}

function destroyInstancesAndRunOnDestroy(
  project: ProjectV1,
  instances: ProjectV1["rooms"][number]["instances"],
  instanceIds: string[],
  runtime: RuntimeState
): {
  instances: ProjectV1["rooms"][number]["instances"]
  runtime: RuntimeState
  removedIndices: number[]
  removedInstanceIds: string[]
} {
  let mutableInstances = [...instances]
  let nextRuntime = { ...runtime }
  const removedIndices: number[] = []
  const removedInstanceIds: string[] = []

  for (const instanceId of instanceIds) {
    const index = mutableInstances.findIndex((instanceEntry) => instanceEntry.id === instanceId)
    if (index === -1) {
      continue
    }
    const target = mutableInstances[index]
    if (!target) {
      continue
    }
    mutableInstances.splice(index, 1)
    removedIndices.push(index)
    removedInstanceIds.push(target.id)

    const onDestroyResult = runOnDestroyEvents(project, target, nextRuntime)
    nextRuntime = applyActionResultToRuntime(nextRuntime, onDestroyResult)
    mutableInstances = [...mutableInstances, ...onDestroyResult.spawned]
  }

  return { instances: mutableInstances, runtime: nextRuntime, removedIndices, removedInstanceIds }
}

function runEventActions(
  project: ProjectV1,
  instance: ProjectV1["rooms"][number]["instances"][number],
  actions: RuntimeAction[],
  runtime: RuntimeState,
  startPosition: { x: number; y: number } | null = null,
  collisionOtherInstanceId: string | null = null,
  roomInstances: ProjectV1["rooms"][number]["instances"] = []
): RuntimeActionResult {
  let result = getDefaultRuntimeActionResult(instance, runtime)
  const actionContext: ActionContext = {
    project,
    startPosition,
    collisionOtherInstanceId,
    roomInstances
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

function runEventItems(
  project: ProjectV1,
  instance: ProjectV1["rooms"][number]["instances"][number],
  items: RuntimeEventItem[],
  runtime: RuntimeState,
  startPosition: { x: number; y: number } | null = null,
  collisionOtherInstanceId: string | null = null,
  roomInstances: ProjectV1["rooms"][number]["instances"] = []
): RuntimeActionResult {
  let result = getDefaultRuntimeActionResult(instance, runtime)
  for (const itemEntry of items) {
    if (itemEntry.type === "action") {
      const actionResult = runEventActions(
        project,
        result.instance,
        [itemEntry.action],
        result.runtime,
        startPosition,
        collisionOtherInstanceId,
        roomInstances
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
    const conditionMatched = evaluateIfCondition(
      itemEntry.condition,
      result.instance,
      result.runtime,
      collisionOtherInstanceId,
      roomInstances
    )
    const branchResult = runEventItems(
      project,
      result.instance,
      conditionMatched ? itemEntry.thenActions : itemEntry.elseActions,
      result.runtime,
      startPosition,
      collisionOtherInstanceId,
      roomInstances
    )
    result = {
      ...branchResult,
      spawned: [...result.spawned, ...branchResult.spawned],
      destroyedInstanceIds: [...new Set([...result.destroyedInstanceIds, ...branchResult.destroyedInstanceIds])],
      scoreDelta: result.scoreDelta + branchResult.scoreDelta,
      gameOverMessage: branchResult.gameOverMessage ?? result.gameOverMessage,
      playedSoundIds: [...result.playedSoundIds, ...branchResult.playedSoundIds]
    }
  }
  return result
}

function intersects(
  first: ProjectV1["rooms"][number]["instances"][number],
  second: ProjectV1["rooms"][number]["instances"][number]
): boolean {
  return (
    first.x < second.x + INSTANCE_SIZE &&
    first.x + INSTANCE_SIZE > second.x &&
    first.y < second.y + INSTANCE_SIZE &&
    first.y + INSTANCE_SIZE > second.y
  )
}

function applyCollisionEvents(
  project: ProjectV1,
  instances: ProjectV1["rooms"][number]["instances"],
  runtime: RuntimeState
): { instances: ProjectV1["rooms"][number]["instances"]; runtime: RuntimeState } {
  let mutableInstances = [...instances]
  let nextRuntime = { ...runtime }

  // Continue locked collision events until their action chain completes.
  for (const lockKey of Object.keys(nextRuntime.eventLocksByKey)) {
    const parsed = parseEventLockKey(lockKey)
    if (!parsed?.targetId) {
      continue
    }

    const ownerIndex = mutableInstances.findIndex((instanceEntry) => instanceEntry.id === parsed.instanceId)
    const targetExists = mutableInstances.some((instanceEntry) => instanceEntry.id === parsed.targetId)
    if (ownerIndex === -1 || !targetExists) {
      nextRuntime = {
        ...nextRuntime,
        eventLocksByKey: removeEventLock(nextRuntime.eventLocksByKey, parsed.instanceId, parsed.eventId, parsed.targetId)
      }
      continue
    }

    const ownerInstance = mutableInstances[ownerIndex]
    if (!ownerInstance) {
      continue
    }
    const ownerObject = project.objects.find((objectEntry) => objectEntry.id === ownerInstance.objectId)
    const collisionEvent = ownerObject?.events.find((eventEntry) => eventEntry.id === parsed.eventId && eventEntry.type === "Collision")
    if (!collisionEvent) {
      nextRuntime = {
        ...nextRuntime,
        eventLocksByKey: removeEventLock(nextRuntime.eventLocksByKey, parsed.instanceId, parsed.eventId, parsed.targetId)
      }
      continue
    }

    const startPosition = getInstanceStartPosition(nextRuntime, ownerInstance)
    const eventResult = runEventItems(
      project,
      ownerInstance,
      getEventItems(collisionEvent),
      nextRuntime,
      startPosition,
      parsed.targetId,
      mutableInstances
    )
    const ownerGetsDestroyed = eventResult.destroyedInstanceIds.includes(parsed.instanceId)
    if (!ownerGetsDestroyed) {
      mutableInstances[ownerIndex] = eventResult.instance
    }
    nextRuntime = applyActionResultToRuntime(nextRuntime, eventResult)
    nextRuntime = {
      ...nextRuntime,
      eventLocksByKey: transitionEventLock(
        nextRuntime.eventLocksByKey,
        parsed.instanceId,
        parsed.eventId,
        parsed.targetId,
        eventResult.halted
      )
    }
    if (eventResult.destroyedInstanceIds.length > 0) {
      const destroyResult = destroyInstancesAndRunOnDestroy(
        project,
        mutableInstances,
        eventResult.destroyedInstanceIds,
        nextRuntime
      )
      mutableInstances = destroyResult.instances
      nextRuntime = clearRuntimeStateForRemovedInstances(destroyResult.runtime, destroyResult.removedInstanceIds)
    }
  }

  for (let i = 0; i < mutableInstances.length; i += 1) {
    for (let j = i + 1; j < mutableInstances.length; j += 1) {
      const first = mutableInstances[i]
      const second = mutableInstances[j]
      if (!first || !second || !intersects(first, second)) {
        continue
      }

      const firstObject = project.objects.find((objectEntry) => objectEntry.id === first.objectId)
      const secondObject = project.objects.find((objectEntry) => objectEntry.id === second.objectId)
      if (!firstObject || !secondObject) {
        continue
      }

      const firstEvents = firstObject.events.filter(
        (eventEntry) =>
          eventEntry.type === "Collision" &&
          (eventEntry.targetObjectId === null || eventEntry.targetObjectId === secondObject.id)
      )
      const secondEvents = secondObject.events.filter(
        (eventEntry) =>
          eventEntry.type === "Collision" &&
          (eventEntry.targetObjectId === null || eventEntry.targetObjectId === firstObject.id)
      )
      const firstId = first.id
      const secondId = second.id

      for (const eventEntry of firstEvents) {
        if (hasEventLock(nextRuntime.eventLocksByKey, firstId, eventEntry.id, secondId)) {
          continue
        }
        const firstIndex = mutableInstances.findIndex((instanceEntry) => instanceEntry.id === firstId)
        if (firstIndex === -1) {
          break
        }
        const firstInstance = mutableInstances[firstIndex]
        if (!firstInstance) {
          break
        }
        const firstStartPosition = getInstanceStartPosition(nextRuntime, firstInstance)
        const eventResult = runEventItems(
          project,
          firstInstance,
          getEventItems(eventEntry),
          nextRuntime,
          firstStartPosition,
          secondId,
          mutableInstances
        )
        const firstGetsDestroyed = eventResult.destroyedInstanceIds.includes(firstId)
        if (!firstGetsDestroyed) {
          mutableInstances[firstIndex] = eventResult.instance
        }
        nextRuntime = applyActionResultToRuntime(nextRuntime, eventResult)
        nextRuntime = {
          ...nextRuntime,
          eventLocksByKey: transitionEventLock(nextRuntime.eventLocksByKey, firstId, eventEntry.id, secondId, eventResult.halted)
        }
        if (eventResult.destroyedInstanceIds.length > 0) {
          const destroyResult = destroyInstancesAndRunOnDestroy(
            project,
            mutableInstances,
            eventResult.destroyedInstanceIds,
            nextRuntime
          )
          mutableInstances = destroyResult.instances
          nextRuntime = clearRuntimeStateForRemovedInstances(destroyResult.runtime, destroyResult.removedInstanceIds)
          for (const removedIndex of destroyResult.removedIndices) {
            if (removedIndex <= i) {
              i -= 1
            }
            if (removedIndex <= j) {
              j -= 1
            }
          }
        }
        if (firstGetsDestroyed) {
          break
        }
      }

      for (const eventEntry of secondEvents) {
        if (hasEventLock(nextRuntime.eventLocksByKey, secondId, eventEntry.id, firstId)) {
          continue
        }
        const secondIndex = mutableInstances.findIndex((instanceEntry) => instanceEntry.id === secondId)
        if (secondIndex === -1) {
          break
        }
        const secondInstance = mutableInstances[secondIndex]
        if (!secondInstance) {
          break
        }
        const secondStartPosition = getInstanceStartPosition(nextRuntime, secondInstance)
        const eventResult = runEventItems(
          project,
          secondInstance,
          getEventItems(eventEntry),
          nextRuntime,
          secondStartPosition,
          firstId,
          mutableInstances
        )
        const secondGetsDestroyed = eventResult.destroyedInstanceIds.includes(secondId)
        if (!secondGetsDestroyed) {
          mutableInstances[secondIndex] = eventResult.instance
        }
        nextRuntime = applyActionResultToRuntime(nextRuntime, eventResult)
        nextRuntime = {
          ...nextRuntime,
          eventLocksByKey: transitionEventLock(nextRuntime.eventLocksByKey, secondId, eventEntry.id, firstId, eventResult.halted)
        }
        if (eventResult.destroyedInstanceIds.length > 0) {
          const destroyResult = destroyInstancesAndRunOnDestroy(
            project,
            mutableInstances,
            eventResult.destroyedInstanceIds,
            nextRuntime
          )
          mutableInstances = destroyResult.instances
          nextRuntime = clearRuntimeStateForRemovedInstances(destroyResult.runtime, destroyResult.removedInstanceIds)
          for (const removedIndex of destroyResult.removedIndices) {
            if (removedIndex <= i) {
              i -= 1
            }
            if (removedIndex <= j) {
              j -= 1
            }
          }
        }
        if (secondGetsDestroyed) {
          break
        }
      }
    }
  }

  return { instances: mutableInstances, runtime: nextRuntime }
}

export function createInitialRuntimeState(project?: ProjectV1): RuntimeState {
  return {
    score: 0,
    gameOver: false,
    message: "",
    activeToast: null,
    queuedToasts: [],
    initializedInstanceIds: [],
    playedSoundIds: [],
    instanceStartPositions: {},
    globalVariables: project ? buildInitialGlobalVariables(project) : {},
    objectInstanceVariables: {},
    nextRoomId: null,
    restartRoomRequested: false,
    timerElapsedByEventId: {},
    waitElapsedByInstanceActionId: {},
    eventLocksByKey: {}
  }
}

export function runRuntimeTick(
  project: ProjectV1,
  roomId: string,
  pressedKeys: Set<string>,
  runtime: RuntimeState,
  justPressedKeys = new Set<string>(),
  mouseInput: RuntimeMouseInput = DEFAULT_RUNTIME_MOUSE_INPUT
): { project: ProjectV1; runtime: RuntimeState; activeRoomId: string; restartRoomRequested: boolean } {
  const room = project.rooms.find((roomEntry) => roomEntry.id === roomId)
  if (!room || runtime.gameOver) {
    return { project, runtime, activeRoomId: roomId, restartRoomRequested: false }
  }

  let nextRuntime: RuntimeState = {
    ...runtime,
    playedSoundIds: [],
    globalVariables: {
      ...buildInitialGlobalVariables(project),
      ...runtime.globalVariables
    },
    nextRoomId: null,
    restartRoomRequested: false
  }
  nextRuntime = applyMouseBuiltinsToRuntime(nextRuntime, mouseInput)
  nextRuntime = advanceRuntimeToastQueue(nextRuntime as RuntimeToastState, RUNTIME_TICK_MS) as RuntimeState
  let nextInstances: ProjectV1["rooms"][number]["instances"] = []
  const pendingDestroyedInstanceIds = new Set<string>()
  for (const instanceEntry of room.instances) {
    const objectEntry = project.objects.find((candidate) => candidate.id === instanceEntry.objectId)
    if (!objectEntry) {
      nextInstances.push(instanceEntry)
      continue
    }

    nextRuntime = ensureInstanceVariables(nextRuntime, project, instanceEntry)
    const startPosition = getInstanceStartPosition(nextRuntime, instanceEntry)
    if (!nextRuntime.instanceStartPositions[instanceEntry.id]) {
      nextRuntime = {
        ...nextRuntime,
        instanceStartPositions: {
          ...nextRuntime.instanceStartPositions,
          [instanceEntry.id]: startPosition
        }
      }
    }

    let nextInstance = instanceEntry
    const shouldInitialize = !runtime.initializedInstanceIds.includes(instanceEntry.id)
    const matchingEvents: ProjectV1["objects"][number]["events"] = []
    for (const eventEntry of objectEntry.events) {
      if (eventEntry.type === "Collision" || eventEntry.type === "OutsideRoom" || eventEntry.type === "OnDestroy") {
        continue
      }
      const eventLockTargetId = null
      if (hasEventLock(nextRuntime.eventLocksByKey, nextInstance.id, eventEntry.id, eventLockTargetId)) {
        matchingEvents.push(eventEntry)
        continue
      }
      if (eventEntry.type === "Step") {
        matchingEvents.push(eventEntry)
        continue
      }
      if (eventEntry.type === "Create") {
        if (shouldInitialize) {
          matchingEvents.push(eventEntry)
        }
        continue
      }
      if (eventEntry.type === "Timer") {
        const intervalMs = eventEntry.intervalMs ?? 1000
        const elapsed = (nextRuntime.timerElapsedByEventId[eventEntry.id] ?? 0) + RUNTIME_TICK_MS
        nextRuntime = {
          ...nextRuntime,
          timerElapsedByEventId: {
            ...nextRuntime.timerElapsedByEventId,
            [eventEntry.id]: elapsed >= intervalMs ? 0 : elapsed
          }
        }
        if (elapsed >= intervalMs) {
          matchingEvents.push(eventEntry)
        }
        continue
      }
      if (eventEntry.type === "Keyboard" && eventEntry.key && eventEntry.keyboardMode) {
        const shouldRun = eventEntry.keyboardMode === "down"
          ? pressedKeys.has(eventEntry.key)
          : justPressedKeys.has(eventEntry.key)
        if (shouldRun) {
          matchingEvents.push(eventEntry)
        }
        continue
      }
      if (eventEntry.type === "MouseMove") {
        if (mouseInput.moved) {
          matchingEvents.push(eventEntry)
        }
        continue
      }
      if (eventEntry.type === "MouseDown") {
        if (mouseInput.pressedButtons.size > 0) {
          matchingEvents.push(eventEntry)
        }
        continue
      }
      if (eventEntry.type === "MouseClick") {
        if (mouseInput.justPressedButtons.size > 0) {
          matchingEvents.push(eventEntry)
        }
      }
    }

    let destroySelf = false
    let spawned: ProjectV1["rooms"][number]["instances"] = []
    for (const eventEntry of matchingEvents) {
      const eventResult = runEventItems(
        project,
        nextInstance,
        getEventItems(eventEntry),
        nextRuntime,
        startPosition,
        null,
        room.instances
      )
      nextInstance = eventResult.instance
      for (const instanceId of eventResult.destroyedInstanceIds) {
        if (instanceId === nextInstance.id) {
          destroySelf = true
        } else {
          pendingDestroyedInstanceIds.add(instanceId)
        }
      }
      spawned = [...spawned, ...eventResult.spawned]
      nextRuntime = applyActionResultToRuntime(nextRuntime, eventResult)
      nextRuntime = {
        ...nextRuntime,
        eventLocksByKey: transitionEventLock(nextRuntime.eventLocksByKey, nextInstance.id, eventEntry.id, null, eventResult.halted)
      }
    }

    if (!destroySelf) {
      const outsideEvents = objectEntry.events.filter((eventEntry) => eventEntry.type === "OutsideRoom")
      for (const eventEntry of outsideEvents) {
        const eventLockTargetId = null
        const isLocked = hasEventLock(nextRuntime.eventLocksByKey, nextInstance.id, eventEntry.id, eventLockTargetId)
        if (!isLocked && !isOutsideRoom(nextInstance)) {
          continue
        }
        const eventResult = runEventItems(
          project,
          nextInstance,
          getEventItems(eventEntry),
          nextRuntime,
          startPosition,
          null,
          room.instances
        )
        nextInstance = eventResult.instance
        for (const instanceId of eventResult.destroyedInstanceIds) {
          if (instanceId === nextInstance.id) {
            destroySelf = true
          } else {
            pendingDestroyedInstanceIds.add(instanceId)
          }
        }
        spawned = [...spawned, ...eventResult.spawned]
        nextRuntime = applyActionResultToRuntime(nextRuntime, eventResult)
        nextRuntime = {
          ...nextRuntime,
          eventLocksByKey: transitionEventLock(nextRuntime.eventLocksByKey, nextInstance.id, eventEntry.id, null, eventResult.halted)
        }
        if (destroySelf) {
          break
        }
      }
    }

    if (!destroySelf) {
      nextInstances.push(nextInstance)
    } else {
      const onDestroyResult = runOnDestroyEvents(project, nextInstance, nextRuntime)
      nextRuntime = applyActionResultToRuntime(nextRuntime, onDestroyResult)
      spawned = [...spawned, ...onDestroyResult.spawned]
    }
    nextInstances = [...nextInstances, ...spawned]

    if (shouldInitialize) {
      nextRuntime = {
        ...nextRuntime,
        initializedInstanceIds: [...nextRuntime.initializedInstanceIds, instanceEntry.id]
      }
    }
  }

  if (pendingDestroyedInstanceIds.size > 0) {
    const destroyResult = destroyInstancesAndRunOnDestroy(
      project,
      nextInstances,
      Array.from(pendingDestroyedInstanceIds),
      nextRuntime
    )
    nextInstances = destroyResult.instances
    nextRuntime = clearRuntimeStateForRemovedInstances(destroyResult.runtime, destroyResult.removedInstanceIds)
  }

  const collisionResult = applyCollisionEvents(project, nextInstances, nextRuntime)
  const keptStartPositions: RuntimeState["instanceStartPositions"] = {}
  const keptObjectVariableStates: RuntimeState["objectInstanceVariables"] = {}
  for (const instanceEntry of collisionResult.instances) {
    keptStartPositions[instanceEntry.id] = getInstanceStartPosition(collisionResult.runtime, instanceEntry)
    keptObjectVariableStates[instanceEntry.id] = collisionResult.runtime.objectInstanceVariables[instanceEntry.id] ?? {}
  }
  const aliveInstanceIds = new Set(Object.keys(keptStartPositions))
  const compactedRuntime: RuntimeState = {
    ...collisionResult.runtime,
    instanceStartPositions: keptStartPositions,
    objectInstanceVariables: keptObjectVariableStates,
    waitElapsedByInstanceActionId: filterWaitProgressByAliveInstances(
      collisionResult.runtime.waitElapsedByInstanceActionId,
      aliveInstanceIds
    ),
    eventLocksByKey: filterEventLocksByAliveInstances(collisionResult.runtime.eventLocksByKey, aliveInstanceIds),
    nextRoomId: null,
    restartRoomRequested: false
  }
  const nextProject: ProjectV1 = {
    ...project,
    rooms: project.rooms.map((roomEntry) =>
      roomEntry.id === roomId ? { ...roomEntry, instances: collisionResult.instances } : roomEntry
    )
  }

  return {
    project: nextProject,
    runtime: compactedRuntime,
    activeRoomId: collisionResult.runtime.nextRoomId ?? roomId,
    restartRoomRequested: collisionResult.runtime.restartRoomRequested
  }
}
