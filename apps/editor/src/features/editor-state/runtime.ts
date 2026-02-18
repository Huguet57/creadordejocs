import type { ProjectV1 } from "@creadordejocs/project-format"
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
import {
  DEFAULT_SPRITE_SPEED_MS,
  ROOM_HEIGHT,
  ROOM_WIDTH,
  RUNTIME_TICK_MS,
  clampValue,
  clampWindowToRoom,
  getDefaultRuntimeActionResult,
  getInstanceHeight,
  getInstanceWidth,
  intersectsInstances,
  resolveRoomDimensions,
  type RuntimeAction,
  type RuntimeActionResult,
  type RuntimeEventItem,
  type RuntimeMouseButton,
  type RuntimeMouseInput,
  type RuntimeState,
  type RuntimeVariableValue
} from "./runtime-types.js"
import { dispatchCustomEvents } from "./runtime-custom-events.js"
import { runEventItems } from "./runtime-event-executor.js"
import { orderMatchingEventsForExecution, shouldRunKeyboardEvent } from "./runtime-keyboard-trigger.js"

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
  let nextSpriteOverride = runtime.spriteOverrideByInstanceId
  let nextSpriteSpeed = runtime.spriteSpeedMsByInstanceId
  let nextSpriteElapsed = runtime.spriteAnimationElapsedMsByInstanceId
  for (const instanceId of removedInstanceIds) {
    if (instanceId in nextSpriteOverride) {
      const { [instanceId]: _overrideRemoved, ...rest } = nextSpriteOverride
      void _overrideRemoved
      nextSpriteOverride = rest
    }
    if (instanceId in nextSpriteSpeed) {
      const { [instanceId]: _speedRemoved, ...rest } = nextSpriteSpeed
      void _speedRemoved
      nextSpriteSpeed = rest
    }
    if (instanceId in nextSpriteElapsed) {
      const { [instanceId]: _elapsedRemoved, ...rest } = nextSpriteElapsed
      void _elapsedRemoved
      nextSpriteElapsed = rest
    }
  }
  return {
    ...runtime,
    waitElapsedByInstanceActionId: filterWaitProgressByRemovedInstances(
      runtime.waitElapsedByInstanceActionId,
      removedInstanceIds
    ),
    eventLocksByKey: filterEventLocksByRemovedInstances(runtime.eventLocksByKey, removedInstanceIds),
    spriteOverrideByInstanceId: nextSpriteOverride,
    spriteSpeedMsByInstanceId: nextSpriteSpeed,
    spriteAnimationElapsedMsByInstanceId: nextSpriteElapsed
  }
}

function isOutsideRoom(
  project: ProjectV1,
  instance: ProjectV1["rooms"][number]["instances"][number],
  roomWidth: number,
  roomHeight: number
): boolean {
  const width = getInstanceWidth(project, instance)
  const height = getInstanceHeight(project, instance)
  return (
    instance.x < 0 ||
    instance.y < 0 ||
    instance.x > roomWidth - width ||
    instance.y > roomHeight - height
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

function applyMouseBuiltinsToRuntime(
  runtime: RuntimeState,
  mouseInput: RuntimeMouseInput,
  roomWidth: number,
  roomHeight: number
): RuntimeState {
  return {
    ...runtime,
    mouse: {
      x: clampValue(mouseInput.x, 0, roomWidth),
      y: clampValue(mouseInput.y, 0, roomHeight)
    }
  }
}

function runOnDestroyEvents(
  project: ProjectV1,
  roomId: string,
  roomWidth: number,
  roomHeight: number,
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
      roomId,
      roomWidth,
      roomHeight,
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
  roomId: string,
  roomWidth: number,
  roomHeight: number,
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

    const onDestroyResult = runOnDestroyEvents(project, roomId, roomWidth, roomHeight, target, nextRuntime)
    nextRuntime = applyActionResultToRuntime(nextRuntime, onDestroyResult)
    mutableInstances = [...mutableInstances, ...onDestroyResult.spawned]
  }

  return { instances: mutableInstances, runtime: nextRuntime, removedIndices, removedInstanceIds }
}

function applyCollisionEvents(
  project: ProjectV1,
  roomId: string,
  roomWidth: number,
  roomHeight: number,
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
      roomId,
      roomWidth,
      roomHeight,
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
        roomId,
        roomWidth,
        roomHeight,
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
      if (!first || !second || !intersectsInstances(project, first, second)) {
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
          roomId,
          roomWidth,
          roomHeight,
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
            roomId,
            roomWidth,
            roomHeight,
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
          roomId,
          roomWidth,
          roomHeight,
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
            roomId,
            roomWidth,
            roomHeight,
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

function buildInitialWindowByRoomId(project: ProjectV1): RuntimeState["windowByRoomId"] {
  return Object.fromEntries(
    project.rooms.map((roomEntry) => {
      const dimensions = resolveRoomDimensions(roomEntry)
      const windowPosition = clampWindowToRoom(0, 0, dimensions.width, dimensions.height)
      return [roomEntry.id, windowPosition]
    })
  )
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
    mouse: { x: 0, y: 0 },
    objectInstanceVariables: {},
    nextRoomId: null,
    restartRoomRequested: false,
    timerElapsedByEventId: {},
    waitElapsedByInstanceActionId: {},
    eventLocksByKey: {},
    customEventQueue: [],
    spriteOverrideByInstanceId: {},
    spriteSpeedMsByInstanceId: {},
    spriteAnimationElapsedMsByInstanceId: {},
    windowByRoomId: project ? buildInitialWindowByRoomId(project) : {}
  }
}

export function runRuntimeTick(
  project: ProjectV1,
  roomId: string,
  pressedKeys: Set<string>,
  runtime: RuntimeState,
  justPressedKeys = new Set<string>(),
  justReleasedKeys = new Set<string>(),
  mouseInput: RuntimeMouseInput = DEFAULT_RUNTIME_MOUSE_INPUT
): { project: ProjectV1; runtime: RuntimeState; activeRoomId: string; restartRoomRequested: boolean } {
  const room = project.rooms.find((roomEntry) => roomEntry.id === roomId)
  if (!room || runtime.gameOver) {
    return { project, runtime, activeRoomId: roomId, restartRoomRequested: false }
  }
  const { width: roomWidth, height: roomHeight } = resolveRoomDimensions(room)
  const storedWindow = runtime.windowByRoomId[room.id] ?? { x: 0, y: 0 }
  const clampedWindow = clampWindowToRoom(storedWindow.x, storedWindow.y, roomWidth, roomHeight)
  const hasStoredWindow = runtime.windowByRoomId[room.id] !== undefined
  const nextWindowByRoomId =
    hasStoredWindow && storedWindow.x === clampedWindow.x && storedWindow.y === clampedWindow.y
      ? runtime.windowByRoomId
      : {
          ...runtime.windowByRoomId,
          [room.id]: clampedWindow
        }

  let nextRuntime: RuntimeState = {
    ...runtime,
    playedSoundIds: [],
    globalVariables: {
      ...buildInitialGlobalVariables(project),
      ...runtime.globalVariables
    },
    mouse: runtime.mouse,
    nextRoomId: null,
    restartRoomRequested: false,
    customEventQueue: [],
    windowByRoomId: nextWindowByRoomId
  }
  nextRuntime = applyMouseBuiltinsToRuntime(nextRuntime, mouseInput, roomWidth, roomHeight)
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
      if (eventEntry.type === "Collision" || eventEntry.type === "OutsideRoom" || eventEntry.type === "OnDestroy" || eventEntry.type === "CustomEvent") {
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
      if (eventEntry.type === "Keyboard") {
        if (shouldRunKeyboardEvent(eventEntry, pressedKeys, justPressedKeys, justReleasedKeys)) {
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
      if (eventEntry.type === "Mouse") {
        const shouldRun = eventEntry.mouseMode === "press"
          ? mouseInput.justPressedButtons.size > 0
          : mouseInput.pressedButtons.size > 0
        if (shouldRun) {
          matchingEvents.push(eventEntry)
        }
        continue
      }
    }

    let destroySelf = false
    let spawned: ProjectV1["rooms"][number]["instances"] = []
    const orderedMatchingEvents = orderMatchingEventsForExecution(matchingEvents)
    for (const eventEntry of orderedMatchingEvents) {
      const eventResult = runEventItems(
        project,
        roomId,
        roomWidth,
        roomHeight,
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
        if (!isLocked && !isOutsideRoom(project, nextInstance, roomWidth, roomHeight)) {
          continue
        }
        const eventResult = runEventItems(
          project,
          roomId,
          roomWidth,
          roomHeight,
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
      const onDestroyResult = runOnDestroyEvents(project, roomId, roomWidth, roomHeight, nextInstance, nextRuntime)
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
      roomId,
      roomWidth,
      roomHeight,
      nextInstances,
      Array.from(pendingDestroyedInstanceIds),
      nextRuntime
    )
    nextInstances = destroyResult.instances
    nextRuntime = clearRuntimeStateForRemovedInstances(destroyResult.runtime, destroyResult.removedInstanceIds)
  }

  const collisionResult = applyCollisionEvents(project, roomId, roomWidth, roomHeight, nextInstances, nextRuntime)

  const customEventResult = dispatchCustomEvents(
    project,
    collisionResult.instances,
    collisionResult.runtime,
    (projectArg, instance, items, runtimeArg, startPosition, collisionOtherInstanceId, roomInstances, iterationLocals) =>
      runEventItems(
        projectArg,
        roomId,
        roomWidth,
        roomHeight,
        instance,
        items,
        runtimeArg,
        startPosition,
        collisionOtherInstanceId,
        roomInstances,
        iterationLocals
      )
  )

  // Advance sprite animation for all alive instances with multi-frame sprites
  let postAnimationRuntime = customEventResult.runtime
  for (const instanceEntry of customEventResult.instances) {
    const objectEntry = project.objects.find((candidate) => candidate.id === instanceEntry.objectId)
    if (!objectEntry) continue
    const effectiveSpriteId = postAnimationRuntime.spriteOverrideByInstanceId[instanceEntry.id] ?? objectEntry.spriteId
    if (!effectiveSpriteId) continue
    const spriteEntry = project.resources.sprites.find((candidate) => candidate.id === effectiveSpriteId)
    if (!spriteEntry || spriteEntry.frames.length <= 1) continue

    const speedMs = postAnimationRuntime.spriteSpeedMsByInstanceId[instanceEntry.id] ?? DEFAULT_SPRITE_SPEED_MS
    const prevElapsed = postAnimationRuntime.spriteAnimationElapsedMsByInstanceId[instanceEntry.id] ?? 0
    const nextElapsed = prevElapsed + RUNTIME_TICK_MS
    const totalDuration = speedMs * spriteEntry.frames.length
    postAnimationRuntime = {
      ...postAnimationRuntime,
      spriteAnimationElapsedMsByInstanceId: {
        ...postAnimationRuntime.spriteAnimationElapsedMsByInstanceId,
        [instanceEntry.id]: nextElapsed % totalDuration
      }
    }
  }

  const keptStartPositions: RuntimeState["instanceStartPositions"] = {}
  const keptObjectVariableStates: RuntimeState["objectInstanceVariables"] = {}
  const keptSpriteOverrides: RuntimeState["spriteOverrideByInstanceId"] = {}
  const keptSpriteSpeed: RuntimeState["spriteSpeedMsByInstanceId"] = {}
  const keptSpriteElapsed: RuntimeState["spriteAnimationElapsedMsByInstanceId"] = {}
  for (const instanceEntry of customEventResult.instances) {
    keptStartPositions[instanceEntry.id] = getInstanceStartPosition(postAnimationRuntime, instanceEntry)
    keptObjectVariableStates[instanceEntry.id] = postAnimationRuntime.objectInstanceVariables[instanceEntry.id] ?? {}
    const overrideSpriteId = postAnimationRuntime.spriteOverrideByInstanceId[instanceEntry.id]
    if (overrideSpriteId !== undefined) {
      keptSpriteOverrides[instanceEntry.id] = overrideSpriteId
    }
    const speedOverride = postAnimationRuntime.spriteSpeedMsByInstanceId[instanceEntry.id]
    if (speedOverride !== undefined) {
      keptSpriteSpeed[instanceEntry.id] = speedOverride
    }
    const elapsed = postAnimationRuntime.spriteAnimationElapsedMsByInstanceId[instanceEntry.id]
    if (elapsed !== undefined) {
      keptSpriteElapsed[instanceEntry.id] = elapsed
    }
  }
  const aliveInstanceIds = new Set(Object.keys(keptStartPositions))
  const compactedRuntime: RuntimeState = {
    ...postAnimationRuntime,
    instanceStartPositions: keptStartPositions,
    objectInstanceVariables: keptObjectVariableStates,
    waitElapsedByInstanceActionId: filterWaitProgressByAliveInstances(
      postAnimationRuntime.waitElapsedByInstanceActionId,
      aliveInstanceIds
    ),
    eventLocksByKey: filterEventLocksByAliveInstances(postAnimationRuntime.eventLocksByKey, aliveInstanceIds),
    spriteOverrideByInstanceId: keptSpriteOverrides,
    spriteSpeedMsByInstanceId: keptSpriteSpeed,
    spriteAnimationElapsedMsByInstanceId: keptSpriteElapsed,
    nextRoomId: null,
    restartRoomRequested: false
  }
  const nextProject: ProjectV1 = {
    ...project,
    rooms: project.rooms.map((roomEntry) =>
      roomEntry.id === roomId ? { ...roomEntry, instances: customEventResult.instances } : roomEntry
    )
  }

  return {
    project: nextProject,
    runtime: compactedRuntime,
    activeRoomId: customEventResult.runtime.nextRoomId ?? roomId,
    restartRoomRequested: customEventResult.runtime.restartRoomRequested
  }
}
