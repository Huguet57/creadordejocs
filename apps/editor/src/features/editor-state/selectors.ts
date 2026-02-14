import type { ProjectV1 } from "@creadordejocs/project-format"

export function selectActiveRoom(project: ProjectV1, activeRoomId: string) {
  return project.rooms.find((room) => room.id === activeRoomId) ?? project.rooms[0] ?? null
}

export function selectObject(project: ProjectV1, objectId: string | null) {
  if (!objectId) {
    return null
  }
  return project.objects.find((entry) => entry.id === objectId) ?? null
}
