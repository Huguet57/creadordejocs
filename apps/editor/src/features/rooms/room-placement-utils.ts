import type { ProjectV1 } from "@creadordejocs/project-format"
import { intersectsInstances } from "../editor-state/runtime-types.js"

type RoomInstance = ProjectV1["rooms"][number]["instances"][number]

type OverlapInput = {
  project: ProjectV1
  roomInstances: RoomInstance[]
  objectId: string
  x: number
  y: number
  excludeInstanceId?: string
}

export function getPositionKey(x: number, y: number): string {
  return `${x},${y}`
}

export function getPositionCountsByCoordinate(
  instances: Pick<RoomInstance, "x" | "y">[]
): Map<string, number> {
  const positionCounts = new Map<string, number>()
  for (const instanceEntry of instances) {
    const key = getPositionKey(instanceEntry.x, instanceEntry.y)
    positionCounts.set(key, (positionCounts.get(key) ?? 0) + 1)
  }
  return positionCounts
}

function isObjectSolid(project: ProjectV1, objectId: string): boolean {
  return project.objects.find((objectEntry) => objectEntry.id === objectId)?.solid === true
}

export function wouldOverlapSolid(input: OverlapInput): boolean {
  const candidateIsSolid = isObjectSolid(input.project, input.objectId)
  const candidate: RoomInstance = {
    id: "__placement_candidate__",
    objectId: input.objectId,
    x: input.x,
    y: input.y
  }

  for (const otherInstance of input.roomInstances) {
    if (input.excludeInstanceId && otherInstance.id === input.excludeInstanceId) {
      continue
    }
    const otherIsSolid = isObjectSolid(input.project, otherInstance.objectId)
    if (!candidateIsSolid && !otherIsSolid) {
      continue
    }
    if (intersectsInstances(input.project, candidate, otherInstance)) {
      return true
    }
  }

  return false
}
