import {
  addGlobalVariable,
  addObjectEvent,
  addObjectEventAction,
  addObjectVariable,
  type AddObjectEventInput,
  type AddGlobalVariableInput,
  type AddObjectVariableInput,
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

export function addGlobalVariableWithId(
  project: ProjectV1,
  input: AddGlobalVariableInput
): { project: ProjectV1; variableId: string } {
  const result = addGlobalVariable(project, input)
  if (!result.variableId) {
    throw new Error(`Failed to create global variable "${input.name}"`)
  }
  return { project: result.project, variableId: result.variableId }
}

export function addObjectVariableWithId(
  project: ProjectV1,
  input: AddObjectVariableInput
): { project: ProjectV1; variableId: string } {
  const result = addObjectVariable(project, input)
  if (!result.variableId) {
    throw new Error(`Failed to create object variable "${input.name}" for object "${input.objectId}"`)
  }
  return { project: result.project, variableId: result.variableId }
}
