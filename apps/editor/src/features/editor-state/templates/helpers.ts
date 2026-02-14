import {
  addObjectEvent,
  addObjectEventAction,
  type AddObjectEventInput,
  type ObjectActionDraft,
  type ProjectV1
} from "@creadordejocs/project-format"

function getLatestEventId(project: ProjectV1, objectId: string): string {
  const eventId = project.objects.find((entry) => entry.id === objectId)?.events.at(-1)?.id
  if (!eventId) {
    throw new Error(`Missing event id for object "${objectId}"`)
  }
  return eventId
}

export function addEventWithActions(
  project: ProjectV1,
  objectId: string,
  config: Omit<AddObjectEventInput, "objectId">,
  actions: ObjectActionDraft[]
): ProjectV1 {
  const withEvent = addObjectEvent(project, { objectId, ...config })
  const eventId = getLatestEventId(withEvent, objectId)
  return actions.reduce(
    (currentProject, action) => addObjectEventAction(currentProject, { objectId, eventId, action }),
    withEvent
  )
}
