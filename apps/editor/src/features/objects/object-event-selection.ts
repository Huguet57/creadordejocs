type EventLike = { id: string }

type ResolveActiveEventOptions = {
  preferNewest?: boolean
}

export type ActiveEventByObjectId = Record<string, string | null>

export function resolveActiveEventIdForObject(
  events: EventLike[],
  rememberedEventId: string | null,
  options: ResolveActiveEventOptions = {}
): string | null {
  if (events.length === 0) {
    return null
  }

  if (options.preferNewest) {
    return events[events.length - 1]?.id ?? null
  }

  if (rememberedEventId && events.some((eventEntry) => eventEntry.id === rememberedEventId)) {
    return rememberedEventId
  }

  return events[0]?.id ?? null
}

export function resolveActiveEventMemoryForObject(
  memory: ActiveEventByObjectId,
  objectId: string,
  events: EventLike[],
  options: ResolveActiveEventOptions = {}
): ActiveEventByObjectId {
  const hasRememberedEvent = Object.prototype.hasOwnProperty.call(memory, objectId)
  const rememberedEventId = hasRememberedEvent ? memory[objectId] ?? null : null
  const resolvedEventId = resolveActiveEventIdForObject(events, rememberedEventId, options)

  if (hasRememberedEvent && rememberedEventId === resolvedEventId) {
    return memory
  }
  if (!hasRememberedEvent && resolvedEventId === null) {
    return memory
  }

  return {
    ...memory,
    [objectId]: resolvedEventId
  }
}
