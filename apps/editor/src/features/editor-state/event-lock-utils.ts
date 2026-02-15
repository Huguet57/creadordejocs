const EVENT_LOCK_NONE_TARGET = "none"

export function buildEventLockKey(instanceId: string, eventId: string, targetId: string | null): string {
  return `${instanceId}::${eventId}::${targetId ?? EVENT_LOCK_NONE_TARGET}`
}

export function parseEventLockKey(key: string): { instanceId: string; eventId: string; targetId: string | null } | null {
  const [instanceId, eventId, rawTargetId] = key.split("::")
  if (!instanceId || !eventId || !rawTargetId) {
    return null
  }
  return {
    instanceId,
    eventId,
    targetId: rawTargetId === EVENT_LOCK_NONE_TARGET ? null : rawTargetId
  }
}

export function buildWaitActionKey(instanceId: string, actionId: string, targetId: string | null): string {
  return `${instanceId}::${actionId}::${targetId ?? EVENT_LOCK_NONE_TARGET}`
}

export function parseWaitActionKey(key: string): { instanceId: string; actionId: string; targetId: string | null } | null {
  const [instanceId, actionId, rawTargetId] = key.split("::")
  if (!instanceId || !actionId || !rawTargetId) {
    return null
  }
  return {
    instanceId,
    actionId,
    targetId: rawTargetId === EVENT_LOCK_NONE_TARGET ? null : rawTargetId
  }
}

export function hasEventLock(
  locksByKey: Record<string, true>,
  instanceId: string,
  eventId: string,
  targetId: string | null
): boolean {
  return Boolean(locksByKey[buildEventLockKey(instanceId, eventId, targetId)])
}

export function addEventLock(
  locksByKey: Record<string, true>,
  instanceId: string,
  eventId: string,
  targetId: string | null
): Record<string, true> {
  const key = buildEventLockKey(instanceId, eventId, targetId)
  if (locksByKey[key]) {
    return locksByKey
  }
  return {
    ...locksByKey,
    [key]: true
  }
}

export function removeEventLock(
  locksByKey: Record<string, true>,
  instanceId: string,
  eventId: string,
  targetId: string | null
): Record<string, true> {
  const key = buildEventLockKey(instanceId, eventId, targetId)
  if (!locksByKey[key]) {
    return locksByKey
  }
  const nextLocks = { ...locksByKey }
  delete nextLocks[key]
  return nextLocks
}

export function transitionEventLock(
  locksByKey: Record<string, true>,
  instanceId: string,
  eventId: string,
  targetId: string | null,
  halted: boolean
): Record<string, true> {
  return halted ? addEventLock(locksByKey, instanceId, eventId, targetId) : removeEventLock(locksByKey, instanceId, eventId, targetId)
}

export function removeWaitProgress(waitByKey: Record<string, number>, waitKey: string): Record<string, number> {
  if (!(waitKey in waitByKey)) {
    return waitByKey
  }
  const nextWait = { ...waitByKey }
  delete nextWait[waitKey]
  return nextWait
}

export function filterWaitProgressByRemovedInstances(
  waitByKey: Record<string, number>,
  removedInstanceIds: string[]
): Record<string, number> {
  if (removedInstanceIds.length === 0) {
    return waitByKey
  }
  const removedSet = new Set(removedInstanceIds)
  return Object.fromEntries(
    Object.entries(waitByKey).filter(([waitKey]) => {
      const parsed = parseWaitActionKey(waitKey)
      if (!parsed) {
        return false
      }
      if (removedSet.has(parsed.instanceId)) {
        return false
      }
      if (parsed.targetId && removedSet.has(parsed.targetId)) {
        return false
      }
      return true
    })
  )
}

export function filterEventLocksByRemovedInstances(
  locksByKey: Record<string, true>,
  removedInstanceIds: string[]
): Record<string, true> {
  if (removedInstanceIds.length === 0) {
    return locksByKey
  }
  const removedSet = new Set(removedInstanceIds)
  return Object.fromEntries(
    Object.entries(locksByKey).filter(([lockKey]) => {
      const parsed = parseEventLockKey(lockKey)
      if (!parsed) {
        return false
      }
      if (removedSet.has(parsed.instanceId)) {
        return false
      }
      if (parsed.targetId && removedSet.has(parsed.targetId)) {
        return false
      }
      return true
    })
  ) as Record<string, true>
}

export function filterWaitProgressByAliveInstances(
  waitByKey: Record<string, number>,
  aliveInstanceIds: Set<string>
): Record<string, number> {
  return Object.fromEntries(
    Object.entries(waitByKey).filter(([waitKey]) => {
      const parsed = parseWaitActionKey(waitKey)
      if (!parsed) {
        return false
      }
      if (!aliveInstanceIds.has(parsed.instanceId)) {
        return false
      }
      if (parsed.targetId && !aliveInstanceIds.has(parsed.targetId)) {
        return false
      }
      return true
    })
  )
}

export function filterEventLocksByAliveInstances(
  locksByKey: Record<string, true>,
  aliveInstanceIds: Set<string>
): Record<string, true> {
  return Object.fromEntries(
    Object.entries(locksByKey).filter(([lockKey]) => {
      const parsed = parseEventLockKey(lockKey)
      if (!parsed) {
        return false
      }
      if (!aliveInstanceIds.has(parsed.instanceId)) {
        return false
      }
      if (parsed.targetId && !aliveInstanceIds.has(parsed.targetId)) {
        return false
      }
      return true
    })
  ) as Record<string, true>
}
