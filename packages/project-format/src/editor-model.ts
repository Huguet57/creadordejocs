import type { ProjectV1 } from "./schema-v1.js"

export type CreateObjectInput = {
  name: string
  spriteId?: string | null
  x?: number
  y?: number
  speed?: number
  direction?: number
}

export type AddRoomInstanceInput = {
  roomId: string
  objectId: string
  x: number
  y: number
}

export type MoveRoomInstanceInput = {
  roomId: string
  instanceId: string
  x: number
  y: number
}

export type UpdateObjectPropertiesInput = {
  objectId: string
  x: number
  y: number
  speed: number
  direction: number
}

export type ObjectEventType = "Create" | "Step" | "Draw" | "Collision" | "Keyboard" | "OnDestroy" | "OutsideRoom" | "Timer"
export type ObjectEventKey = "ArrowUp" | "ArrowDown" | "ArrowLeft" | "ArrowRight" | "Space"
export type ObjectEventItem = ProjectV1["objects"][number]["events"][number]["items"][number]
export type ObjectAction = Extract<ObjectEventItem, { type: "action" }>["action"]
type DistributiveOmit<T, K extends PropertyKey> = T extends unknown ? Omit<T, K> : never
export type ObjectActionDraft = DistributiveOmit<ObjectAction, "id">
export type IfCondition = Extract<ObjectEventItem, { type: "if" }>["condition"]
export type VariableDefinition = ProjectV1["variables"]["global"][number]
export type VariableType = VariableDefinition["type"]
export type VariableValue = VariableDefinition["initialValue"]

export type AddObjectEventInput = {
  objectId: string
  type: ObjectEventType
  key?: ObjectEventKey | null
  targetObjectId?: string | null
  intervalMs?: number | null
}

export type RemoveObjectEventInput = {
  objectId: string
  eventId: string
}

export type AddObjectEventActionInput = {
  objectId: string
  eventId: string
  action: ObjectActionDraft
}

export type UpdateObjectEventActionInput = {
  objectId: string
  eventId: string
  actionId: string
  action: ObjectActionDraft
}

export type RemoveObjectEventActionInput = {
  objectId: string
  eventId: string
  actionId: string
}

export type MoveObjectEventActionInput = {
  objectId: string
  eventId: string
  actionId: string
  direction: "up" | "down"
}

export type AddObjectEventIfBlockInput = {
  objectId: string
  eventId: string
  condition: IfCondition
}

export type UpdateObjectEventIfBlockConditionInput = {
  objectId: string
  eventId: string
  ifBlockId: string
  condition: IfCondition
}

export type RemoveObjectEventIfBlockInput = {
  objectId: string
  eventId: string
  ifBlockId: string
}

export type AddObjectEventIfActionInput = {
  objectId: string
  eventId: string
  ifBlockId: string
  action: ObjectActionDraft
}

export type UpdateObjectEventIfActionInput = {
  objectId: string
  eventId: string
  ifBlockId: string
  actionId: string
  action: ObjectActionDraft
}

export type RemoveObjectEventIfActionInput = {
  objectId: string
  eventId: string
  ifBlockId: string
  actionId: string
}

export type UpdateObjectEventConfigInput = {
  objectId: string
  eventId: string
  key?: ObjectEventKey | null
  targetObjectId?: string | null
  intervalMs?: number | null
}

export type AddGlobalVariableInput = {
  name: string
  type: VariableType
  initialValue: VariableValue
}

export type UpdateGlobalVariableInput = {
  variableId: string
  name: string
  initialValue: VariableValue
}

export type RemoveGlobalVariableInput = {
  variableId: string
}

export type AddObjectVariableInput = {
  objectId: string
  name: string
  type: VariableType
  initialValue: VariableValue
}

export type UpdateObjectVariableInput = {
  objectId: string
  variableId: string
  name: string
  initialValue: VariableValue
}

export type RemoveObjectVariableInput = {
  objectId: string
  variableId: string
}

function makeId(prefix: string): string {
  return `${prefix}-${crypto.randomUUID()}`
}

function toActionItem(action: ObjectActionDraft): Extract<ObjectEventItem, { type: "action" }> {
  const actionId = makeId("action")
  return {
    id: makeId("item"),
    type: "action",
    action: { id: actionId, ...action } as ObjectAction
  }
}

function normalizeVariableName(name: string): string {
  return name.trim().toLocaleLowerCase()
}

function hasVariableNameConflict(definitions: VariableDefinition[], candidateName: string, ignoreId?: string): boolean {
  const normalizedCandidate = normalizeVariableName(candidateName)
  return definitions.some(
    (definition) => definition.id !== ignoreId && normalizeVariableName(definition.name) === normalizedCandidate
  )
}

function buildVariableDefinition(input: {
  id: string
  name: string
  type: VariableType
  initialValue: VariableValue
}): VariableDefinition {
  if (input.type === "number") {
    return {
      id: input.id,
      name: input.name,
      type: "number",
      initialValue: typeof input.initialValue === "number" ? input.initialValue : 0
    }
  }
  if (input.type === "string") {
    return {
      id: input.id,
      name: input.name,
      type: "string",
      initialValue: typeof input.initialValue === "string" ? input.initialValue : ""
    }
  }
  return {
    id: input.id,
    name: input.name,
    type: "boolean",
    initialValue: typeof input.initialValue === "boolean" ? input.initialValue : false
  }
}

export function quickCreateSprite(
  project: ProjectV1,
  name: string
): { project: ProjectV1; spriteId: string } {
  const spriteId = makeId("sprite")
  return {
    project: {
      ...project,
      resources: {
        ...project.resources,
        sprites: [
          ...project.resources.sprites,
          { id: spriteId, name, imagePath: "", assetSource: "", uploadStatus: "notConnected" }
        ]
      }
    },
    spriteId
  }
}

export function quickCreateSound(
  project: ProjectV1,
  name: string
): { project: ProjectV1; soundId: string } {
  const soundId = makeId("sound")
  return {
    project: {
      ...project,
      resources: {
        ...project.resources,
        sounds: [
          ...project.resources.sounds,
          { id: soundId, name, audioPath: "", assetSource: "", uploadStatus: "notConnected" }
        ]
      }
    },
    soundId
  }
}

export function quickCreateObject(
  project: ProjectV1,
  input: CreateObjectInput
): { project: ProjectV1; objectId: string } {
  const objectId = makeId("object")
  return {
    project: {
      ...project,
      objects: [
        ...project.objects,
        {
          id: objectId,
          name: input.name,
          spriteId: input.spriteId ?? null,
          x: input.x ?? 0,
          y: input.y ?? 0,
          speed: input.speed ?? 0,
          direction: input.direction ?? 0,
          events: []
        }
      ]
    },
    objectId
  }
}

export function createRoom(project: ProjectV1, name: string): { project: ProjectV1; roomId: string } {
  const roomId = makeId("room")
  return {
    project: {
      ...project,
      rooms: [...project.rooms, { id: roomId, name, instances: [] }]
    },
    roomId
  }
}

export function updateObjectProperties(
  project: ProjectV1,
  input: UpdateObjectPropertiesInput
): ProjectV1 {
  return {
    ...project,
    objects: project.objects.map((objectEntry) =>
      objectEntry.id === input.objectId
        ? {
            ...objectEntry,
            x: input.x,
            y: input.y,
            speed: input.speed,
            direction: input.direction
          }
        : objectEntry
    )
  }
}

export function addRoomInstance(
  project: ProjectV1,
  input: AddRoomInstanceInput
): { project: ProjectV1; instanceId: string } {
  const instanceId = makeId("instance")
  return {
    project: {
      ...project,
      rooms: project.rooms.map((room) =>
        room.id === input.roomId
          ? {
              ...room,
              instances: [
                ...room.instances,
                { id: instanceId, objectId: input.objectId, x: input.x, y: input.y }
              ]
            }
          : room
      )
    },
    instanceId
  }
}

export function updateSpriteAssetSource(project: ProjectV1, spriteId: string, assetSource: string): ProjectV1 {
  return {
    ...project,
    resources: {
      ...project.resources,
      sprites: project.resources.sprites.map((spriteEntry) =>
        spriteEntry.id === spriteId
          ? {
              ...spriteEntry,
              assetSource,
              uploadStatus: assetSource.trim() ? "ready" : "notConnected"
            }
          : spriteEntry
      )
    }
  }
}

export function updateSoundAssetSource(project: ProjectV1, soundId: string, assetSource: string): ProjectV1 {
  return {
    ...project,
    resources: {
      ...project.resources,
      sounds: project.resources.sounds.map((soundEntry) =>
        soundEntry.id === soundId
          ? {
              ...soundEntry,
              assetSource,
              uploadStatus: assetSource.trim() ? "ready" : "notConnected"
            }
          : soundEntry
      )
    }
  }
}

export function addObjectEvent(project: ProjectV1, input: AddObjectEventInput): ProjectV1 {
  return {
    ...project,
    objects: project.objects.map((objectEntry) =>
      objectEntry.id === input.objectId
        ? {
            ...objectEntry,
            events: [
              ...objectEntry.events,
              {
                id: makeId("event"),
                type: input.type,
                key: input.key ?? null,
                targetObjectId: input.targetObjectId ?? null,
                intervalMs: input.intervalMs ?? null,
                items: []
              }
            ]
          }
        : objectEntry
    )
  }
}

export function removeObjectEvent(project: ProjectV1, input: RemoveObjectEventInput): ProjectV1 {
  return {
    ...project,
    objects: project.objects.map((objectEntry) =>
      objectEntry.id === input.objectId
        ? {
            ...objectEntry,
            events: objectEntry.events.filter((eventEntry) => eventEntry.id !== input.eventId)
          }
        : objectEntry
    )
  }
}

export function addObjectEventAction(project: ProjectV1, input: AddObjectEventActionInput): ProjectV1 {
  return {
    ...project,
    objects: project.objects.map((objectEntry) =>
      objectEntry.id === input.objectId
        ? {
            ...objectEntry,
            events: objectEntry.events.map((eventEntry) =>
              eventEntry.id === input.eventId
                ? {
                    ...eventEntry,
                    items: [...eventEntry.items, toActionItem(input.action)]
                  }
                : eventEntry
            )
          }
        : objectEntry
    )
  }
}

export function updateObjectEventAction(project: ProjectV1, input: UpdateObjectEventActionInput): ProjectV1 {
  return {
    ...project,
    objects: project.objects.map((objectEntry) =>
      objectEntry.id === input.objectId
        ? {
            ...objectEntry,
            events: objectEntry.events.map((eventEntry) =>
              eventEntry.id === input.eventId
                ? {
                    ...eventEntry,
                    items: eventEntry.items.map((itemEntry) =>
                      itemEntry.type === "action" && itemEntry.action.id === input.actionId
                        ? { ...itemEntry, action: { id: input.actionId, ...input.action } as ObjectAction }
                        : itemEntry
                    )
                  }
                : eventEntry
            )
          }
        : objectEntry
    )
  }
}

export function removeObjectEventAction(project: ProjectV1, input: RemoveObjectEventActionInput): ProjectV1 {
  return {
    ...project,
    objects: project.objects.map((objectEntry) =>
      objectEntry.id === input.objectId
        ? {
            ...objectEntry,
            events: objectEntry.events.map((eventEntry) =>
              eventEntry.id === input.eventId
                ? {
                    ...eventEntry,
                    items: eventEntry.items.filter(
                      (itemEntry) => itemEntry.type !== "action" || itemEntry.action.id !== input.actionId
                    )
                  }
                : eventEntry
            )
          }
        : objectEntry
    )
  }
}

export function moveObjectEventAction(project: ProjectV1, input: MoveObjectEventActionInput): ProjectV1 {
  return {
    ...project,
    objects: project.objects.map((objectEntry) => {
      if (objectEntry.id !== input.objectId) {
        return objectEntry
      }

      return {
        ...objectEntry,
        events: objectEntry.events.map((eventEntry) => {
          if (eventEntry.id !== input.eventId) {
            return eventEntry
          }
          const index = eventEntry.items.findIndex(
            (itemEntry) => itemEntry.type === "action" && itemEntry.action.id === input.actionId
          )
          if (index < 0) {
            return eventEntry
          }
          const target = input.direction === "up" ? index - 1 : index + 1
          if (target < 0 || target >= eventEntry.items.length) {
            return eventEntry
          }
          const reordered = [...eventEntry.items]
          const [moved] = reordered.splice(index, 1)
          if (!moved) {
            return eventEntry
          }
          reordered.splice(target, 0, moved)
          return {
            ...eventEntry,
            items: reordered
          }
        })
      }
    })
  }
}

export function addObjectEventIfBlock(project: ProjectV1, input: AddObjectEventIfBlockInput): ProjectV1 {
  return {
    ...project,
    objects: project.objects.map((objectEntry) =>
      objectEntry.id === input.objectId
        ? {
            ...objectEntry,
            events: objectEntry.events.map((eventEntry) =>
              eventEntry.id === input.eventId
                ? {
                    ...eventEntry,
                    items: [
                      ...eventEntry.items,
                      {
                        id: makeId("if"),
                        type: "if",
                        condition: input.condition,
                        actions: []
                      }
                    ]
                  }
                : eventEntry
            )
          }
        : objectEntry
    )
  }
}

export function updateObjectEventIfBlockCondition(project: ProjectV1, input: UpdateObjectEventIfBlockConditionInput): ProjectV1 {
  return {
    ...project,
    objects: project.objects.map((objectEntry) =>
      objectEntry.id === input.objectId
        ? {
            ...objectEntry,
            events: objectEntry.events.map((eventEntry) =>
              eventEntry.id === input.eventId
                ? {
                    ...eventEntry,
                    items: eventEntry.items.map((itemEntry) =>
                      itemEntry.type === "if" && itemEntry.id === input.ifBlockId
                        ? { ...itemEntry, condition: input.condition }
                        : itemEntry
                    )
                  }
                : eventEntry
            )
          }
        : objectEntry
    )
  }
}

export function removeObjectEventIfBlock(project: ProjectV1, input: RemoveObjectEventIfBlockInput): ProjectV1 {
  return {
    ...project,
    objects: project.objects.map((objectEntry) =>
      objectEntry.id === input.objectId
        ? {
            ...objectEntry,
            events: objectEntry.events.map((eventEntry) =>
              eventEntry.id === input.eventId
                ? {
                    ...eventEntry,
                    items: eventEntry.items.filter((itemEntry) => itemEntry.type !== "if" || itemEntry.id !== input.ifBlockId)
                  }
                : eventEntry
            )
          }
        : objectEntry
    )
  }
}

export function addObjectEventIfAction(project: ProjectV1, input: AddObjectEventIfActionInput): ProjectV1 {
  return {
    ...project,
    objects: project.objects.map((objectEntry) =>
      objectEntry.id === input.objectId
        ? {
            ...objectEntry,
            events: objectEntry.events.map((eventEntry) =>
              eventEntry.id === input.eventId
                ? {
                    ...eventEntry,
                    items: eventEntry.items.map((itemEntry) =>
                      itemEntry.type === "if" && itemEntry.id === input.ifBlockId
                        ? {
                            ...itemEntry,
                            actions: [...itemEntry.actions, { id: makeId("action"), ...input.action } as ObjectAction]
                          }
                        : itemEntry
                    )
                  }
                : eventEntry
            )
          }
        : objectEntry
    )
  }
}

export function updateObjectEventIfAction(project: ProjectV1, input: UpdateObjectEventIfActionInput): ProjectV1 {
  return {
    ...project,
    objects: project.objects.map((objectEntry) =>
      objectEntry.id === input.objectId
        ? {
            ...objectEntry,
            events: objectEntry.events.map((eventEntry) =>
              eventEntry.id === input.eventId
                ? {
                    ...eventEntry,
                    items: eventEntry.items.map((itemEntry) =>
                      itemEntry.type === "if" && itemEntry.id === input.ifBlockId
                        ? {
                            ...itemEntry,
                            actions: itemEntry.actions.map((actionEntry) =>
                              actionEntry.id === input.actionId
                                ? ({ id: input.actionId, ...input.action } as ObjectAction)
                                : actionEntry
                            )
                          }
                        : itemEntry
                    )
                  }
                : eventEntry
            )
          }
        : objectEntry
    )
  }
}

export function removeObjectEventIfAction(project: ProjectV1, input: RemoveObjectEventIfActionInput): ProjectV1 {
  return {
    ...project,
    objects: project.objects.map((objectEntry) =>
      objectEntry.id === input.objectId
        ? {
            ...objectEntry,
            events: objectEntry.events.map((eventEntry) =>
              eventEntry.id === input.eventId
                ? {
                    ...eventEntry,
                    items: eventEntry.items.map((itemEntry) =>
                      itemEntry.type === "if" && itemEntry.id === input.ifBlockId
                        ? {
                            ...itemEntry,
                            actions: itemEntry.actions.filter((actionEntry) => actionEntry.id !== input.actionId)
                          }
                        : itemEntry
                    )
                  }
                : eventEntry
            )
          }
        : objectEntry
    )
  }
}

export function updateObjectEventConfig(project: ProjectV1, input: UpdateObjectEventConfigInput): ProjectV1 {
  return {
    ...project,
    objects: project.objects.map((objectEntry) =>
      objectEntry.id === input.objectId
        ? {
            ...objectEntry,
            events: objectEntry.events.map((eventEntry) =>
              eventEntry.id === input.eventId
                ? {
                    ...eventEntry,
                    key: input.key === undefined ? eventEntry.key : input.key,
                    targetObjectId: input.targetObjectId === undefined ? eventEntry.targetObjectId : input.targetObjectId,
                    intervalMs: input.intervalMs === undefined ? eventEntry.intervalMs : input.intervalMs
                  }
                : eventEntry
            )
          }
        : objectEntry
    )
  }
}

export function addGlobalVariable(
  project: ProjectV1,
  input: AddGlobalVariableInput
): { project: ProjectV1; variableId: string | null } {
  const trimmedName = input.name.trim()
  if (!trimmedName) {
    return { project, variableId: null }
  }
  const globalDefinitions = project.variables.global
  if (hasVariableNameConflict(globalDefinitions, trimmedName)) {
    return { project, variableId: null }
  }
  const variableId = makeId("globalVar")
  return {
    project: {
      ...project,
      variables: {
        ...project.variables,
        global: [
          ...globalDefinitions,
          buildVariableDefinition({
            id: variableId,
            name: trimmedName,
            type: input.type,
            initialValue: input.initialValue
          })
        ]
      }
    },
    variableId
  }
}

export function updateGlobalVariable(project: ProjectV1, input: UpdateGlobalVariableInput): ProjectV1 {
  const trimmedName = input.name.trim()
  if (!trimmedName) {
    return project
  }
  const globalDefinitions = project.variables.global
  const existing = globalDefinitions.find((definition) => definition.id === input.variableId)
  if (!existing || hasVariableNameConflict(globalDefinitions, trimmedName, input.variableId)) {
    return project
  }
  const nextDefinition = buildVariableDefinition({
    id: existing.id,
    name: trimmedName,
    type: existing.type,
    initialValue: input.initialValue
  })
  return {
    ...project,
    variables: {
      ...project.variables,
      global: globalDefinitions.map((definition) => (definition.id === input.variableId ? nextDefinition : definition))
    }
  }
}

export function removeGlobalVariable(project: ProjectV1, input: RemoveGlobalVariableInput): ProjectV1 {
  return {
    ...project,
    variables: {
      ...project.variables,
      global: project.variables.global.filter((definition) => definition.id !== input.variableId)
    }
  }
}

export function addObjectVariable(
  project: ProjectV1,
  input: AddObjectVariableInput
): { project: ProjectV1; variableId: string | null } {
  const trimmedName = input.name.trim()
  if (!trimmedName) {
    return { project, variableId: null }
  }
  const currentDefinitions = project.variables.objectByObjectId[input.objectId] ?? []
  if (hasVariableNameConflict(currentDefinitions, trimmedName)) {
    return { project, variableId: null }
  }
  const variableId = makeId("objectVar")
  return {
    project: {
      ...project,
      variables: {
        ...project.variables,
        objectByObjectId: {
          ...project.variables.objectByObjectId,
          [input.objectId]: [
            ...currentDefinitions,
            buildVariableDefinition({
              id: variableId,
              name: trimmedName,
              type: input.type,
              initialValue: input.initialValue
            })
          ]
        }
      }
    },
    variableId
  }
}

export function updateObjectVariable(project: ProjectV1, input: UpdateObjectVariableInput): ProjectV1 {
  const trimmedName = input.name.trim()
  if (!trimmedName) {
    return project
  }
  const currentDefinitions = project.variables.objectByObjectId[input.objectId] ?? []
  const existing = currentDefinitions.find((definition) => definition.id === input.variableId)
  if (!existing || hasVariableNameConflict(currentDefinitions, trimmedName, input.variableId)) {
    return project
  }
  const nextDefinition = buildVariableDefinition({
    id: existing.id,
    name: trimmedName,
    type: existing.type,
    initialValue: input.initialValue
  })
  return {
    ...project,
    variables: {
      ...project.variables,
      objectByObjectId: {
        ...project.variables.objectByObjectId,
        [input.objectId]: currentDefinitions.map((definition) =>
          definition.id === input.variableId ? nextDefinition : definition
        )
      }
    }
  }
}

export function removeObjectVariable(project: ProjectV1, input: RemoveObjectVariableInput): ProjectV1 {
  const currentDefinitions = project.variables.objectByObjectId[input.objectId] ?? []
  return {
    ...project,
    variables: {
      ...project.variables,
      objectByObjectId: {
        ...project.variables.objectByObjectId,
        [input.objectId]: currentDefinitions.filter((definition) => definition.id !== input.variableId)
      }
    }
  }
}

export function moveRoomInstance(project: ProjectV1, input: MoveRoomInstanceInput): ProjectV1 {
  return {
    ...project,
    rooms: project.rooms.map((room) =>
      room.id === input.roomId
        ? {
            ...room,
            instances: room.instances.map((instance) =>
              instance.id === input.instanceId
                ? { ...instance, x: input.x, y: input.y }
                : instance
            )
          }
        : room
    )
  }
}

export type RemoveRoomInstanceInput = {
  roomId: string
  instanceId: string
}

export function removeRoomInstance(project: ProjectV1, input: RemoveRoomInstanceInput): ProjectV1 {
  return {
    ...project,
    rooms: project.rooms.map((room) =>
      room.id === input.roomId
        ? {
            ...room,
            instances: room.instances.filter((instance) => instance.id !== input.instanceId)
          }
        : room
    )
  }
}

export type AddInstanceInput = {
  roomId: string
  objectId: string
  x: number
  y: number
}

export function addInstanceForObject(
  project: ProjectV1,
  input: AddInstanceInput
): { project: ProjectV1; instanceId: string } {
  return addRoomInstance(project, input)
}
