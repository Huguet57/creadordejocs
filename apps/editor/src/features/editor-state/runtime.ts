import type { ProjectV1 } from "@creadordejocs/project-format"

export const ROOM_WIDTH = 560
export const ROOM_HEIGHT = 320
const INSTANCE_SIZE = 32

type RuntimeActionResult = {
  instance: ProjectV1["rooms"][number]["instances"][number]
  destroySelf: boolean
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
}

function clampValue(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value))
}

function getDefaultRuntimeActionResult(
  instance: ProjectV1["rooms"][number]["instances"][number]
): RuntimeActionResult {
  return {
    instance,
    destroySelf: false,
    spawned: [],
    scoreDelta: 0,
    gameOverMessage: null,
    playedSoundIds: []
  }
}

function runEventActions(
  project: ProjectV1,
  instance: ProjectV1["rooms"][number]["instances"][number],
  actions: ProjectV1["objects"][number]["events"][number]["actions"]
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
    if (actionEntry.type === "destroySelf") {
      result = {
        ...result,
        destroySelf: true
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
  const mutableInstances = [...instances]
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
        const eventResult = runEventActions(project, firstInstance, eventEntry.actions)
        mutableInstances[firstIndex] = eventResult.instance
        nextRuntime = {
          ...nextRuntime,
          score: nextRuntime.score + eventResult.scoreDelta,
          playedSoundIds: [...nextRuntime.playedSoundIds, ...eventResult.playedSoundIds]
        }
        if (eventResult.gameOverMessage) {
          nextRuntime = {
            ...nextRuntime,
            gameOver: true,
            message: eventResult.gameOverMessage
          }
        }
        if (eventResult.destroySelf) {
          mutableInstances.splice(firstIndex, 1)
          if (firstIndex <= i) {
            i -= 1
          }
          if (firstIndex <= j) {
            j -= 1
          }
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
        const eventResult = runEventActions(project, secondInstance, eventEntry.actions)
        mutableInstances[secondIndex] = eventResult.instance
        nextRuntime = {
          ...nextRuntime,
          score: nextRuntime.score + eventResult.scoreDelta,
          playedSoundIds: [...nextRuntime.playedSoundIds, ...eventResult.playedSoundIds]
        }
        if (eventResult.gameOverMessage) {
          nextRuntime = {
            ...nextRuntime,
            gameOver: true,
            message: eventResult.gameOverMessage
          }
        }
        if (eventResult.destroySelf) {
          mutableInstances.splice(secondIndex, 1)
          if (secondIndex <= i) {
            i -= 1
          }
          if (secondIndex <= j) {
            j -= 1
          }
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
    playedSoundIds: []
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
  for (const instanceEntry of room.instances) {
    const objectEntry = project.objects.find((candidate) => candidate.id === instanceEntry.objectId)
    if (!objectEntry) {
      nextInstances.push(instanceEntry)
      continue
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
      const eventResult = runEventActions(project, nextInstance, eventEntry.actions)
      nextInstance = eventResult.instance
      destroySelf = destroySelf || eventResult.destroySelf
      spawned = [...spawned, ...eventResult.spawned]
      nextRuntime = {
        ...nextRuntime,
        score: nextRuntime.score + eventResult.scoreDelta,
        playedSoundIds: [...nextRuntime.playedSoundIds, ...eventResult.playedSoundIds]
      }
      if (eventResult.gameOverMessage) {
        nextRuntime = {
          ...nextRuntime,
          gameOver: true,
          message: eventResult.gameOverMessage
        }
      }
    }

    if (!destroySelf) {
      nextInstances.push({
        ...nextInstance,
        x: clampValue(nextInstance.x, 0, ROOM_WIDTH - INSTANCE_SIZE),
        y: clampValue(nextInstance.y, 0, ROOM_HEIGHT - INSTANCE_SIZE)
      })
    }
    nextInstances = [...nextInstances, ...spawned]

    if (shouldInitialize) {
      nextRuntime = {
        ...nextRuntime,
        initializedInstanceIds: [...nextRuntime.initializedInstanceIds, instanceEntry.id]
      }
    }
  }

  const collisionResult = applyCollisionEvents(project, nextInstances, nextRuntime)
  const nextProject: ProjectV1 = {
    ...project,
    rooms: project.rooms.map((roomEntry) =>
      roomEntry.id === roomId ? { ...roomEntry, instances: collisionResult.instances } : roomEntry
    )
  }

  return {
    project: nextProject,
    runtime: collisionResult.runtime
  }
}
