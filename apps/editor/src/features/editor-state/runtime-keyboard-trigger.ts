import type { ProjectV1 } from "@creadordejocs/project-format"

type ObjectEventEntry = ProjectV1["objects"][number]["events"][number]

function resolveKeyboardModePriority(keyboardMode: ObjectEventEntry["keyboardMode"]): number {
  if (keyboardMode === "press") {
    return 0
  }
  if (keyboardMode === "down") {
    return 1
  }
  if (keyboardMode === "release") {
    return 2
  }
  return 3
}

export function shouldRunKeyboardEvent(
  eventEntry: ObjectEventEntry,
  pressedKeys: Set<string>,
  justPressedKeys: Set<string>,
  justReleasedKeys: Set<string>
): boolean {
  if (eventEntry.type !== "Keyboard" || !eventEntry.key || !eventEntry.keyboardMode) {
    return false
  }

  const isAnyKey = eventEntry.key === "<any>"
  if (eventEntry.keyboardMode === "down") {
    return isAnyKey ? pressedKeys.size > 0 : pressedKeys.has(eventEntry.key)
  }
  if (eventEntry.keyboardMode === "press") {
    return isAnyKey ? justPressedKeys.size > 0 : justPressedKeys.has(eventEntry.key)
  }
  return isAnyKey ? justReleasedKeys.size > 0 && pressedKeys.size === 0 : justReleasedKeys.has(eventEntry.key)
}

export function orderMatchingEventsForExecution(events: ObjectEventEntry[]): ObjectEventEntry[] {
  const keyboardEvents = events
    .map((eventEntry, index) => ({ eventEntry, index }))
    .filter((entry) => entry.eventEntry.type === "Keyboard")

  if (keyboardEvents.length <= 1) {
    return events
  }

  const sortedKeyboardEvents = keyboardEvents
    .slice()
    .sort((left, right) => {
      const leftPriority = resolveKeyboardModePriority(left.eventEntry.keyboardMode)
      const rightPriority = resolveKeyboardModePriority(right.eventEntry.keyboardMode)
      if (leftPriority !== rightPriority) {
        return leftPriority - rightPriority
      }
      return left.index - right.index
    })
    .map((entry) => entry.eventEntry)

  let keyboardCursor = 0
  return events.map((eventEntry) => {
    if (eventEntry.type !== "Keyboard") {
      return eventEntry
    }
    const nextKeyboardEvent = sortedKeyboardEvents[keyboardCursor]
    keyboardCursor += 1
    return nextKeyboardEvent ?? eventEntry
  })
}
