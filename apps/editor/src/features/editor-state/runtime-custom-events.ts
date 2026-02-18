import type { ProjectV1 } from "@creadordejocs/project-format"
import type {
  CustomEventQueueEntry,
  RuntimeActionResult,
  RuntimeState,
  RuntimeVariableValue
} from "./runtime-types.js"

type CustomEventListener = {
  objectId: string
  instanceId: string
  eventId: string
  eventName: string
  sourceObjectId: string | null
  items: ProjectV1["objects"][number]["events"][number]["items"]
}

type EventItemRunner = (
  project: ProjectV1,
  instance: ProjectV1["rooms"][number]["instances"][number],
  items: ProjectV1["objects"][number]["events"][number]["items"],
  runtime: RuntimeState,
  startPosition: { x: number; y: number } | null,
  collisionOtherInstanceId: string | null,
  roomInstances: ProjectV1["rooms"][number]["instances"],
  iterationLocals?: Record<string, RuntimeVariableValue>
) => RuntimeActionResult

export function collectCustomEventListeners(
  project: ProjectV1,
  roomInstances: ProjectV1["rooms"][number]["instances"]
): CustomEventListener[] {
  const listeners: CustomEventListener[] = []
  for (const instance of roomInstances) {
    const objectEntry = project.objects.find((candidate) => candidate.id === instance.objectId)
    if (!objectEntry) continue
    for (const eventEntry of objectEntry.events) {
      if (eventEntry.type !== "CustomEvent") continue
      const customEvent = eventEntry as typeof eventEntry & {
        eventName?: string
        sourceObjectId?: string | null
      }
      const eventName = customEvent.eventName ?? "event"
      const sourceObjectId = customEvent.sourceObjectId ?? null
      listeners.push({
        objectId: instance.objectId,
        instanceId: instance.id,
        eventId: eventEntry.id,
        eventName,
        sourceObjectId,
        items: eventEntry.items
      })
    }
  }
  return listeners
}

function matchesListener(entry: CustomEventQueueEntry, listener: CustomEventListener): boolean {
  if (entry.name !== listener.eventName) return false
  if (listener.sourceObjectId !== null && entry.sourceObjectId !== listener.sourceObjectId) return false
  return true
}

function buildCustomEventBuiltins(entry: CustomEventQueueEntry): Record<string, RuntimeVariableValue> {
  return {
    __event_name: entry.name,
    __event_payload: entry.payload,
    __event_source_object_id: entry.sourceObjectId,
    __event_source_instance_id: entry.sourceInstanceId
  }
}

export function dispatchCustomEvents(
  project: ProjectV1,
  roomInstances: ProjectV1["rooms"][number]["instances"],
  runtime: RuntimeState,
  runEventItems: EventItemRunner
): {
  instances: ProjectV1["rooms"][number]["instances"]
  runtime: RuntimeState
} {
  const queue = runtime.customEventQueue
  if (queue.length === 0) return { instances: roomInstances, runtime }

  const listeners = collectCustomEventListeners(project, roomInstances)
  if (listeners.length === 0) {
    return {
      instances: roomInstances,
      runtime: { ...runtime, customEventQueue: [] }
    }
  }

  let nextRuntime = { ...runtime, customEventQueue: [] as CustomEventQueueEntry[] }
  let nextInstances = [...roomInstances]

  for (const listener of listeners) {
    const matching = queue.filter((entry) => matchesListener(entry, listener))
    if (matching.length === 0) continue

    for (const entry of matching) {
      const instanceIndex = nextInstances.findIndex((inst) => inst.id === listener.instanceId)
      if (instanceIndex === -1) break
      const instance = nextInstances[instanceIndex]!

      const builtins = buildCustomEventBuiltins(entry)
      const startPosition = nextRuntime.instanceStartPositions[instance.id] ?? { x: instance.x, y: instance.y }

      const eventResult = runEventItems(
        project,
        instance,
        listener.items,
        nextRuntime,
        startPosition,
        null,
        nextInstances,
        builtins
      )

      nextInstances[instanceIndex] = eventResult.instance
      nextRuntime = {
        ...eventResult.runtime,
        score: eventResult.runtime.score + eventResult.scoreDelta,
        playedSoundIds: [...eventResult.runtime.playedSoundIds, ...eventResult.playedSoundIds],
        customEventQueue: [...nextRuntime.customEventQueue, ...eventResult.runtime.customEventQueue]
      }
      if (eventResult.gameOverMessage) {
        nextRuntime = { ...nextRuntime, gameOver: true, message: eventResult.gameOverMessage }
      }

      if (eventResult.destroyedInstanceIds.length > 0) {
        nextInstances = nextInstances.filter((inst) => !eventResult.destroyedInstanceIds.includes(inst.id))
      }
      nextInstances = [...nextInstances, ...eventResult.spawned]
    }
  }

  return { instances: nextInstances, runtime: nextRuntime }
}
