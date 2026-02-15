import type { ProjectV1 } from "@creadordejocs/project-format"

export const ROOM_WIDTH = 560
export const ROOM_HEIGHT = 320
const INSTANCE_SIZE = 32

type RuntimeActionResult = {
  instance: ProjectV1["rooms"][number]["instances"][number]
  destroyedInstanceIds: string[]
  spawned: ProjectV1["rooms"][number]["instances"][number][]
  scoreDelta: number
  gameOverMessage: string | null
  playedSoundIds: string[]
  runtime: RuntimeState
}

type RuntimeVariableValue = ProjectV1["variables"]["global"][number]["initialValue"]
type RuntimeEventItem = ProjectV1["objects"][number]["events"][number]["items"][number]
type RuntimeAction = Extract<RuntimeEventItem, { type: "action" }>["action"]

export type RuntimeState = {
  score: number
  gameOver: boolean
  message: string
  initializedInstanceIds: string[]
  playedSoundIds: string[]
  instanceStartPositions: Record<string, { x: number; y: number }>
  globalVariables: Record<string, RuntimeVariableValue>
  objectInstanceVariables: Record<string, Record<string, RuntimeVariableValue>>
  nextRoomId: string | null
  restartRoomRequested: boolean
  timerElapsedByEventId: Record<string, number>
}

function clampValue(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value))
}

function getDefaultRuntimeActionResult(
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
    runtime
  }
}

function mergeDestroyedIds(existing: string[], nextId: string): string[] {
  return existing.includes(nextId) ? existing : [...existing, nextId]
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
  return Object.fromEntries(project.variables.global.map((definition) => [definition.id, definition.initialValue]))
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

function resolveTargetInstanceId(
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

function isSameVariableValueType(left: RuntimeVariableValue, right: RuntimeVariableValue): boolean {
  return typeof left === typeof right
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
  condition: Extract<RuntimeEventItem, { type: "if" }>["condition"],
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

function evaluateIfCondition(
  condition: Extract<RuntimeEventItem, { type: "if" }>["condition"],
  instance: ProjectV1["rooms"][number]["instances"][number],
  runtime: RuntimeState,
  collisionOtherInstanceId: string | null
): boolean {
  const leftValue = resolveConditionLeftValue(condition, instance, runtime, collisionOtherInstanceId)
  if (leftValue === undefined || !isSameVariableValueType(leftValue, condition.right)) {
    return false
  }
  if (condition.operator === "==") {
    return leftValue === condition.right
  }
  if (condition.operator === "!=") {
    return leftValue !== condition.right
  }
  if (typeof leftValue !== "number" || typeof condition.right !== "number") {
    return false
  }
  if (condition.operator === ">") {
    return leftValue > condition.right
  }
  if (condition.operator === ">=") {
    return leftValue >= condition.right
  }
  if (condition.operator === "<") {
    return leftValue < condition.right
  }
  return leftValue <= condition.right
}

function applyGlobalNumericOperation(
  runtime: RuntimeState,
  variableId: string,
  value: number,
  operation: "add" | "subtract" | "multiply"
): RuntimeState {
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

function applyObjectNumericOperation(
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
    const eventResult = runEventItems(project, aggregate.instance, getEventItems(eventEntry), aggregate.runtime, startPosition)
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
} {
  let mutableInstances = [...instances]
  let nextRuntime = { ...runtime }
  const removedIndices: number[] = []

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

    const onDestroyResult = runOnDestroyEvents(project, target, nextRuntime)
    nextRuntime = applyActionResultToRuntime(nextRuntime, onDestroyResult)
    mutableInstances = [...mutableInstances, ...onDestroyResult.spawned]
  }

  return { instances: mutableInstances, runtime: nextRuntime, removedIndices }
}

function runEventActions(
  project: ProjectV1,
  instance: ProjectV1["rooms"][number]["instances"][number],
  actions: RuntimeAction[],
  runtime: RuntimeState,
  startPosition: { x: number; y: number } | null = null,
  collisionOtherInstanceId: string | null = null
): RuntimeActionResult {
  let result = getDefaultRuntimeActionResult(instance, runtime)
  for (const actionEntry of actions) {
    if (actionEntry.type === "move") {
      result = {
        ...result,
        instance: {
          ...result.instance,
          x: result.instance.x + actionEntry.dx,
          y: result.instance.y + actionEntry.dy
        }
      }
      continue
    }
    if (actionEntry.type === "setVelocity") {
      const radians = (actionEntry.direction * Math.PI) / 180
      result = {
        ...result,
        instance: {
          ...result.instance,
          x: result.instance.x + Math.cos(radians) * actionEntry.speed,
          y: result.instance.y + Math.sin(radians) * actionEntry.speed
        }
      }
      continue
    }
    if (actionEntry.type === "clampToRoom") {
      result = {
        ...result,
        instance: {
          ...result.instance,
          x: clampValue(result.instance.x, 0, ROOM_WIDTH - INSTANCE_SIZE),
          y: clampValue(result.instance.y, 0, ROOM_HEIGHT - INSTANCE_SIZE)
        }
      }
      continue
    }
    if (actionEntry.type === "teleport") {
      if (actionEntry.mode === "position") {
        result = {
          ...result,
          instance: {
            ...result.instance,
            x: actionEntry.x ?? result.instance.x,
            y: actionEntry.y ?? result.instance.y
          }
        }
      } else if (startPosition) {
        result = {
          ...result,
          instance: {
            ...result.instance,
            x: startPosition.x,
            y: startPosition.y
          }
        }
      }
      continue
    }
    if (actionEntry.type === "destroySelf") {
      result = {
        ...result,
        destroyedInstanceIds: mergeDestroyedIds(result.destroyedInstanceIds, result.instance.id)
      }
      continue
    }
    if (actionEntry.type === "destroyOther") {
      if (collisionOtherInstanceId) {
        result = {
          ...result,
          destroyedInstanceIds: mergeDestroyedIds(result.destroyedInstanceIds, collisionOtherInstanceId)
        }
      }
      continue
    }
    if (actionEntry.type === "spawnObject") {
      const targetObjectExists = project.objects.some((objectEntry) => objectEntry.id === actionEntry.objectId)
      if (!targetObjectExists) {
        continue
      }
      result = {
        ...result,
        spawned: [
          ...result.spawned,
          {
            id: `instance-${crypto.randomUUID()}`,
            objectId: actionEntry.objectId,
            x: result.instance.x + actionEntry.offsetX,
            y: result.instance.y + actionEntry.offsetY
          }
        ]
      }
      continue
    }
    if (actionEntry.type === "changeScore") {
      result = {
        ...result,
        scoreDelta: result.scoreDelta + actionEntry.delta
      }
      continue
    }
    if (actionEntry.type === "endGame") {
      result = {
        ...result,
        gameOverMessage: actionEntry.message
      }
      continue
    }
    if (actionEntry.type === "playSound") {
      result = {
        ...result,
        playedSoundIds: [...result.playedSoundIds, actionEntry.soundId]
      }
      continue
    }
    if (actionEntry.type === "changeVariable") {
      if (actionEntry.scope === "global") {
        if (actionEntry.operator === "set") {
          const existingValue = result.runtime.globalVariables[actionEntry.variableId]
          if (existingValue === undefined || !isSameVariableValueType(existingValue, actionEntry.value)) {
            continue
          }
          result = {
            ...result,
            runtime: {
              ...result.runtime,
              globalVariables: {
                ...result.runtime.globalVariables,
                [actionEntry.variableId]: actionEntry.value
              }
            }
          }
        } else {
          const numValue = typeof actionEntry.value === "number" ? actionEntry.value : 0
          result = {
            ...result,
            runtime: applyGlobalNumericOperation(result.runtime, actionEntry.variableId, numValue, actionEntry.operator)
          }
        }
        continue
      }

      const resolvedTargetInstanceId = resolveTargetInstanceId(
        result.instance,
        actionEntry.target ?? "self",
        actionEntry.targetInstanceId ?? null,
        collisionOtherInstanceId
      )
      if (!resolvedTargetInstanceId) {
        continue
      }
      if (actionEntry.operator === "set") {
        const targetVariables = result.runtime.objectInstanceVariables[resolvedTargetInstanceId]
        if (!targetVariables) {
          continue
        }
        const existingValue = targetVariables[actionEntry.variableId]
        if (existingValue === undefined || !isSameVariableValueType(existingValue, actionEntry.value)) {
          continue
        }
        result = {
          ...result,
          runtime: {
            ...result.runtime,
            objectInstanceVariables: {
              ...result.runtime.objectInstanceVariables,
              [resolvedTargetInstanceId]: {
                ...result.runtime.objectInstanceVariables[resolvedTargetInstanceId],
                [actionEntry.variableId]: actionEntry.value
              }
            }
          }
        }
      } else {
        const numValue = typeof actionEntry.value === "number" ? actionEntry.value : 0
        result = {
          ...result,
          runtime: applyObjectNumericOperation(
            result.runtime,
            resolvedTargetInstanceId,
            actionEntry.variableId,
            numValue,
            actionEntry.operator
          )
        }
      }
      continue
    }
    if (actionEntry.type === "copyVariable") {
      const resolvedInstanceId = resolveTargetInstanceId(
        result.instance,
        actionEntry.instanceTarget,
        actionEntry.instanceTargetId,
        collisionOtherInstanceId
      )
      if (!resolvedInstanceId) {
        continue
      }
      if (actionEntry.direction === "globalToObject") {
        const globalValue = result.runtime.globalVariables[actionEntry.globalVariableId]
        const targetVariables = result.runtime.objectInstanceVariables[resolvedInstanceId]
        if (globalValue === undefined || !targetVariables) {
          continue
        }
        const existingValue = targetVariables[actionEntry.objectVariableId]
        if (existingValue === undefined || !isSameVariableValueType(existingValue, globalValue)) {
          continue
        }
        result = {
          ...result,
          runtime: {
            ...result.runtime,
            objectInstanceVariables: {
              ...result.runtime.objectInstanceVariables,
              [resolvedInstanceId]: {
                ...result.runtime.objectInstanceVariables[resolvedInstanceId],
                [actionEntry.objectVariableId]: globalValue
              }
            }
          }
        }
      } else {
        const sourceVariables = result.runtime.objectInstanceVariables[resolvedInstanceId]
        if (!sourceVariables || !(actionEntry.objectVariableId in sourceVariables)) {
          continue
        }
        const sourceValue = sourceVariables[actionEntry.objectVariableId]
        const existingGlobalValue = result.runtime.globalVariables[actionEntry.globalVariableId]
        if (sourceValue === undefined || existingGlobalValue === undefined || !isSameVariableValueType(existingGlobalValue, sourceValue)) {
          continue
        }
        result = {
          ...result,
          runtime: {
            ...result.runtime,
            globalVariables: {
              ...result.runtime.globalVariables,
              [actionEntry.globalVariableId]: sourceValue
            }
          }
        }
      }
      continue
    }
    if (actionEntry.type === "goToRoom") {
      const targetRoom = project.rooms.find((roomEntry) => roomEntry.id === actionEntry.roomId)
      if (!targetRoom) {
        continue
      }
      result = {
        ...result,
        runtime: {
          ...result.runtime,
          nextRoomId: actionEntry.roomId
        }
      }
      continue
    }
    if (actionEntry.type === "restartRoom") {
      result = {
        ...result,
        runtime: {
          ...result.runtime,
          restartRoomRequested: true
        }
      }
      continue
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
  collisionOtherInstanceId: string | null = null
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
        collisionOtherInstanceId
      )
      result = {
        ...actionResult,
        spawned: [...result.spawned, ...actionResult.spawned],
        destroyedInstanceIds: [...new Set([...result.destroyedInstanceIds, ...actionResult.destroyedInstanceIds])],
        scoreDelta: result.scoreDelta + actionResult.scoreDelta,
        gameOverMessage: actionResult.gameOverMessage ?? result.gameOverMessage,
        playedSoundIds: [...result.playedSoundIds, ...actionResult.playedSoundIds]
      }
      continue
    }
    const conditionMatched = evaluateIfCondition(itemEntry.condition, result.instance, result.runtime, collisionOtherInstanceId)
    const branchResult = runEventItems(
      project,
      result.instance,
      conditionMatched ? itemEntry.thenActions : itemEntry.elseActions,
      result.runtime,
      startPosition,
      collisionOtherInstanceId
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
        const firstIndex = mutableInstances.findIndex((instanceEntry) => instanceEntry.id === firstId)
        if (firstIndex === -1) {
          break
        }
        const firstInstance = mutableInstances[firstIndex]
        if (!firstInstance) {
          break
        }
        const firstStartPosition = getInstanceStartPosition(nextRuntime, firstInstance)
        const eventResult = runEventItems(project, firstInstance, getEventItems(eventEntry), nextRuntime, firstStartPosition, secondId)
        const firstGetsDestroyed = eventResult.destroyedInstanceIds.includes(firstId)
        if (!firstGetsDestroyed) {
          mutableInstances[firstIndex] = eventResult.instance
        }
        nextRuntime = applyActionResultToRuntime(nextRuntime, eventResult)
        if (eventResult.destroyedInstanceIds.length > 0) {
          const destroyResult = destroyInstancesAndRunOnDestroy(
            project,
            mutableInstances,
            eventResult.destroyedInstanceIds,
            nextRuntime
          )
          mutableInstances = destroyResult.instances
          nextRuntime = destroyResult.runtime
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
        const secondIndex = mutableInstances.findIndex((instanceEntry) => instanceEntry.id === secondId)
        if (secondIndex === -1) {
          break
        }
        const secondInstance = mutableInstances[secondIndex]
        if (!secondInstance) {
          break
        }
        const secondStartPosition = getInstanceStartPosition(nextRuntime, secondInstance)
        const eventResult = runEventItems(project, secondInstance, getEventItems(eventEntry), nextRuntime, secondStartPosition, firstId)
        const secondGetsDestroyed = eventResult.destroyedInstanceIds.includes(secondId)
        if (!secondGetsDestroyed) {
          mutableInstances[secondIndex] = eventResult.instance
        }
        nextRuntime = applyActionResultToRuntime(nextRuntime, eventResult)
        if (eventResult.destroyedInstanceIds.length > 0) {
          const destroyResult = destroyInstancesAndRunOnDestroy(
            project,
            mutableInstances,
            eventResult.destroyedInstanceIds,
            nextRuntime
          )
          mutableInstances = destroyResult.instances
          nextRuntime = destroyResult.runtime
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
    initializedInstanceIds: [],
    playedSoundIds: [],
    instanceStartPositions: {},
    globalVariables: project ? buildInitialGlobalVariables(project) : {},
    objectInstanceVariables: {},
    nextRoomId: null,
    restartRoomRequested: false,
    timerElapsedByEventId: {}
  }
}

export function runRuntimeTick(
  project: ProjectV1,
  roomId: string,
  pressedKeys: Set<string>,
  runtime: RuntimeState,
  justPressedKeys = new Set<string>()
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
    const matchingEvents = objectEntry.events.filter((eventEntry) => {
      if (eventEntry.type === "Step") {
        return true
      }
      if (eventEntry.type === "Create") {
        return shouldInitialize
      }
      if (eventEntry.type === "Timer") {
        const intervalMs = eventEntry.intervalMs ?? 1000
        const elapsed = (nextRuntime.timerElapsedByEventId[eventEntry.id] ?? 0) + 80
        nextRuntime = {
          ...nextRuntime,
          timerElapsedByEventId: {
            ...nextRuntime.timerElapsedByEventId,
            [eventEntry.id]: elapsed >= intervalMs ? 0 : elapsed
          }
        }
        return elapsed >= intervalMs
      }
      if (eventEntry.type === "Keyboard" && eventEntry.key && eventEntry.keyboardMode) {
        return eventEntry.keyboardMode === "down"
          ? pressedKeys.has(eventEntry.key)
          : justPressedKeys.has(eventEntry.key)
      }
      return false
    })

    let destroySelf = false
    let spawned: ProjectV1["rooms"][number]["instances"] = []
    for (const eventEntry of matchingEvents) {
      const eventResult = runEventItems(project, nextInstance, getEventItems(eventEntry), nextRuntime, startPosition)
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
    }

    if (!destroySelf && isOutsideRoom(nextInstance)) {
      const outsideEvents = objectEntry.events.filter((eventEntry) => eventEntry.type === "OutsideRoom")
      for (const eventEntry of outsideEvents) {
        const eventResult = runEventItems(project, nextInstance, getEventItems(eventEntry), nextRuntime, startPosition)
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
    nextRuntime = destroyResult.runtime
  }

  const collisionResult = applyCollisionEvents(project, nextInstances, nextRuntime)
  const keptStartPositions: RuntimeState["instanceStartPositions"] = {}
  const keptObjectVariableStates: RuntimeState["objectInstanceVariables"] = {}
  for (const instanceEntry of collisionResult.instances) {
    keptStartPositions[instanceEntry.id] = getInstanceStartPosition(collisionResult.runtime, instanceEntry)
    keptObjectVariableStates[instanceEntry.id] = collisionResult.runtime.objectInstanceVariables[instanceEntry.id] ?? {}
  }
  const compactedRuntime: RuntimeState = {
    ...collisionResult.runtime,
    instanceStartPositions: keptStartPositions,
    objectInstanceVariables: keptObjectVariableStates,
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
