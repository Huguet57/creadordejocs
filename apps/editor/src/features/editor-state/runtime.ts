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
}

export type RuntimeState = {
  score: number
  gameOver: boolean
  message: string
  initializedInstanceIds: string[]
  playedSoundIds: string[]
  instanceStartPositions: Record<string, { x: number; y: number }>
}

function clampValue(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value))
}

function getDefaultRuntimeActionResult(
  instance: ProjectV1["rooms"][number]["instances"][number]
): RuntimeActionResult {
  return {
    instance,
    destroyedInstanceIds: [],
    spawned: [],
    scoreDelta: 0,
    gameOverMessage: null,
    playedSoundIds: []
  }
}

function mergeDestroyedIds(existing: string[], nextId: string): string[] {
  return existing.includes(nextId) ? existing : [...existing, nextId]
}

function applyActionResultToRuntime(runtime: RuntimeState, actionResult: RuntimeActionResult): RuntimeState {
  let nextRuntime = {
    ...runtime,
    score: runtime.score + actionResult.scoreDelta,
    playedSoundIds: [...runtime.playedSoundIds, ...actionResult.playedSoundIds]
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

function runOnDestroyEvents(
  project: ProjectV1,
  instance: ProjectV1["rooms"][number]["instances"][number],
  runtime: RuntimeState
): RuntimeActionResult {
  const objectEntry = project.objects.find((candidate) => candidate.id === instance.objectId)
  if (!objectEntry) {
    return getDefaultRuntimeActionResult(instance)
  }
  const onDestroyEvents = objectEntry.events.filter((eventEntry) => eventEntry.type === "OnDestroy")
  if (onDestroyEvents.length === 0) {
    return getDefaultRuntimeActionResult(instance)
  }

  let aggregate = getDefaultRuntimeActionResult(instance)
  const startPosition = getInstanceStartPosition(runtime, instance)
  for (const eventEntry of onDestroyEvents) {
    const eventResult = runEventActions(project, aggregate.instance, eventEntry.actions, startPosition)
    aggregate = {
      ...aggregate,
      instance: eventResult.instance,
      spawned: [...aggregate.spawned, ...eventResult.spawned],
      scoreDelta: aggregate.scoreDelta + eventResult.scoreDelta,
      gameOverMessage: eventResult.gameOverMessage ?? aggregate.gameOverMessage,
      playedSoundIds: [...aggregate.playedSoundIds, ...eventResult.playedSoundIds]
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
  actions: ProjectV1["objects"][number]["events"][number]["actions"],
  startPosition: { x: number; y: number } | null = null,
  collisionOtherInstanceId: string | null = null
): RuntimeActionResult {
  let result = getDefaultRuntimeActionResult(instance)
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
    if (actionEntry.type === "jumpToPosition") {
      result = {
        ...result,
        instance: {
          ...result.instance,
          x: actionEntry.x,
          y: actionEntry.y
        }
      }
      continue
    }
    if (actionEntry.type === "jumpToStart") {
      if (!startPosition) {
        continue
      }
      result = {
        ...result,
        instance: {
          ...result.instance,
          x: startPosition.x,
          y: startPosition.y
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
      const eventResult = runEventActions(project, firstInstance, eventEntry.actions, null, secondId)
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
        const eventResult = runEventActions(project, secondInstance, eventEntry.actions, null, firstId)
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

export function createInitialRuntimeState(): RuntimeState {
  return {
    score: 0,
    gameOver: false,
    message: "",
    initializedInstanceIds: [],
    playedSoundIds: [],
    instanceStartPositions: {}
  }
}

export function runRuntimeTick(
  project: ProjectV1,
  roomId: string,
  pressedKeys: Set<string>,
  runtime: RuntimeState
): { project: ProjectV1; runtime: RuntimeState } {
  const room = project.rooms.find((roomEntry) => roomEntry.id === roomId)
  if (!room || runtime.gameOver) {
    return { project, runtime }
  }

  let nextRuntime: RuntimeState = { ...runtime, playedSoundIds: [] }
  let nextInstances: ProjectV1["rooms"][number]["instances"] = []
  const pendingDestroyedInstanceIds = new Set<string>()
  for (const instanceEntry of room.instances) {
    const objectEntry = project.objects.find((candidate) => candidate.id === instanceEntry.objectId)
    if (!objectEntry) {
      nextInstances.push(instanceEntry)
      continue
    }

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
      if (eventEntry.type !== "Keyboard" || !eventEntry.key) {
        return false
      }
      return pressedKeys.has(eventEntry.key)
    })

    let destroySelf = false
    let spawned: ProjectV1["rooms"][number]["instances"] = []
    for (const eventEntry of matchingEvents) {
      const eventResult = runEventActions(project, nextInstance, eventEntry.actions, startPosition)
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
        const eventResult = runEventActions(project, nextInstance, eventEntry.actions, startPosition)
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
  for (const instanceEntry of collisionResult.instances) {
    keptStartPositions[instanceEntry.id] = getInstanceStartPosition(collisionResult.runtime, instanceEntry)
  }
  const compactedRuntime: RuntimeState = {
    ...collisionResult.runtime,
    instanceStartPositions: keptStartPositions
  }
  const nextProject: ProjectV1 = {
    ...project,
    rooms: project.rooms.map((roomEntry) =>
      roomEntry.id === roomId ? { ...roomEntry, instances: collisionResult.instances } : roomEntry
    )
  }

  return {
    project: nextProject,
    runtime: compactedRuntime
  }
}
