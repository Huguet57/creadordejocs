import {
  addGlobalVariable,
  addObjectEvent,
  addObjectEventAction,
  addObjectEventIfAction,
  addObjectEventIfBlock,
  addObjectVariable,
  type AddObjectEventInput,
  type AddGlobalVariableInput,
  type AddObjectVariableInput,
  type IfCondition,
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

export function addIfBlockToLatestEvent(
  project: ProjectV1,
  objectId: string,
  condition: IfCondition,
  actions: ObjectActionDraft[]
): ProjectV1 {
  const eventId = getLatestEventId(project, objectId)
  const withIfBlock = addObjectEventIfBlock(project, { objectId, eventId, condition })
  const latestEvent = withIfBlock.objects.find((entry) => entry.id === objectId)?.events.find((entry) => entry.id === eventId)
  const ifItem = latestEvent?.items.at(-1)
  if (ifItem?.type !== "if") {
    throw new Error(`Missing if block for object "${objectId}" and event "${eventId}"`)
  }
  return actions.reduce(
    (currentProject, action) => addObjectEventIfAction(currentProject, { objectId, eventId, ifBlockId: ifItem.id, action }),
    withIfBlock
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
