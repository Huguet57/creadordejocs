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
        sprites: [...project.resources.sprites, { id: spriteId, name, imagePath: "" }]
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
        sounds: [...project.resources.sounds, { id: soundId, name, audioPath: "" }]
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
          direction: input.direction ?? 0
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
