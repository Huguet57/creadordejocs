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

export type ObjectEventType = "Create" | "Step" | "Draw" | "Collision" | "Keyboard" | "OnDestroy"
export type ObjectEventKey = "ArrowUp" | "ArrowDown" | "ArrowLeft" | "ArrowRight" | "Space"
export type ObjectAction = ProjectV1["objects"][number]["events"][number]["actions"][number]
type DistributiveOmit<T, K extends PropertyKey> = T extends unknown ? Omit<T, K> : never
export type ObjectActionDraft = DistributiveOmit<ObjectAction, "id">

export type AddObjectEventInput = {
  objectId: string
  type: ObjectEventType
  key?: ObjectEventKey | null
  targetObjectId?: string | null
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

export type UpdateObjectEventConfigInput = {
  objectId: string
  eventId: string
  key?: ObjectEventKey | null
  targetObjectId?: string | null
}

function makeId(prefix: string): string {
  return `${prefix}-${crypto.randomUUID()}`
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
                actions: []
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
                    actions: [...eventEntry.actions, { id: makeId("action"), ...input.action } as ObjectAction]
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
                    actions: eventEntry.actions.map((actionEntry) =>
                      actionEntry.id === input.actionId
                        ? ({ id: input.actionId, ...input.action } as ObjectAction)
                        : actionEntry
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
                    actions: eventEntry.actions.filter((actionEntry) => actionEntry.id !== input.actionId)
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
          const index = eventEntry.actions.findIndex((actionEntry) => actionEntry.id === input.actionId)
          if (index < 0) {
            return eventEntry
          }
          const target = input.direction === "up" ? index - 1 : index + 1
          if (target < 0 || target >= eventEntry.actions.length) {
            return eventEntry
          }
          const reordered = [...eventEntry.actions]
          const [moved] = reordered.splice(index, 1)
          if (!moved) {
            return eventEntry
          }
          reordered.splice(target, 0, moved)
          return {
            ...eventEntry,
            actions: reordered
          }
        })
      }
    })
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
                    targetObjectId: input.targetObjectId === undefined ? eventEntry.targetObjectId : input.targetObjectId
                  }
                : eventEntry
            )
          }
        : objectEntry
    )
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
