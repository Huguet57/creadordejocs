import { describe, expect, it } from "vitest"
import type { ProjectV1 } from "@creadordejocs/project-format"
import { createCoinDashTemplateProject } from "./templates/coin-dash-template.js"
import { createSpaceShooterTemplateProject } from "./templates/space-shooter-template.js"
import { createInitialRuntimeState, runRuntimeTick } from "./runtime.js"

function updateRoomInstances(
  project: ProjectV1,
  roomId: string,
  updater: (instances: ProjectV1["rooms"][number]["instances"]) => ProjectV1["rooms"][number]["instances"]
): ProjectV1 {
  return {
    ...project,
    rooms: project.rooms.map((roomEntry) =>
      roomEntry.id === roomId ? { ...roomEntry, instances: updater(roomEntry.instances) } : roomEntry
    )
  }
}

describe("runtime regressions", () => {
  it("ends the game when a collision event has destroySelf and endGame", () => {
    const template = createCoinDashTemplateProject()
    const playerObjectId = template.project.objects.find((objectEntry) => objectEntry.name === "Explorer")?.id
    const coinObjectId = template.project.objects.find((objectEntry) => objectEntry.name === "Coin")?.id
    expect(playerObjectId).toBeTruthy()
    expect(coinObjectId).toBeTruthy()

    const room = template.project.rooms.find((roomEntry) => roomEntry.id === template.roomId)
    const player = room?.instances.find((instanceEntry) => instanceEntry.objectId === playerObjectId)
    expect(player).toBeTruthy()

    const projectWithForcedCollision = updateRoomInstances(template.project, template.roomId, (instances) =>
      instances.map((instanceEntry) =>
        instanceEntry.objectId === coinObjectId
          ? {
              ...instanceEntry,
              x: player?.x ?? instanceEntry.x,
              y: player?.y ?? instanceEntry.y
            }
          : instanceEntry
      )
    )

    const result = runRuntimeTick(projectWithForcedCollision, template.roomId, new Set(), createInitialRuntimeState())
    const resultRoom = result.project.rooms.find((roomEntry) => roomEntry.id === template.roomId)
    const coinInstances = resultRoom?.instances.filter((instanceEntry) => instanceEntry.objectId === coinObjectId) ?? []

    expect(result.runtime.gameOver).toBe(true)
    expect(result.runtime.message).toBe("Has recollit la moneda. Has guanyat!")
    expect(result.runtime.score).toBe(100)
    expect(coinInstances).toHaveLength(0)
  })

  it("spawns a bullet when Space is pressed in the shooter template", () => {
    const template = createSpaceShooterTemplateProject()
    const bulletObjectId = template.project.objects.find((objectEntry) => objectEntry.name === "Bullet")?.id
    const shipObjectId = template.project.objects.find((objectEntry) => objectEntry.name === "Ship")?.id
    expect(bulletObjectId).toBeTruthy()
    expect(shipObjectId).toBeTruthy()

    const roomBefore = template.project.rooms.find((roomEntry) => roomEntry.id === template.roomId)
    const bulletBefore =
      roomBefore?.instances.filter((instanceEntry) => instanceEntry.objectId === bulletObjectId).length ?? 0
    const shipBefore = roomBefore?.instances.find((instanceEntry) => instanceEntry.objectId === shipObjectId)
    expect(bulletBefore).toBe(0)
    expect(shipBefore).toBeTruthy()

    const result = runRuntimeTick(template.project, template.roomId, new Set(["Space"]), createInitialRuntimeState())
    const roomAfter = result.project.rooms.find((roomEntry) => roomEntry.id === template.roomId)
    const bulletsAfter = roomAfter?.instances.filter((instanceEntry) => instanceEntry.objectId === bulletObjectId) ?? []
    const spawnedBullet = bulletsAfter[0]

    expect(bulletsAfter).toHaveLength(1)
    expect(spawnedBullet).toBeTruthy()
    expect(spawnedBullet?.x).toBe((shipBefore?.x ?? 0) + 0)
    expect(spawnedBullet?.y).toBe((shipBefore?.y ?? 0) - 18)
  })

  it("removes the collided asteroid instance instead of a different one", () => {
    const template = createSpaceShooterTemplateProject()
    const bulletObjectId = template.project.objects.find((objectEntry) => objectEntry.name === "Bullet")?.id
    const asteroidObjectId = template.project.objects.find((objectEntry) => objectEntry.name === "Asteroid")?.id
    expect(bulletObjectId).toBeTruthy()
    expect(asteroidObjectId).toBeTruthy()

    const room = template.project.rooms.find((roomEntry) => roomEntry.id === template.roomId)
    const asteroids =
      room?.instances.filter((instanceEntry) => instanceEntry.objectId === asteroidObjectId).sort((a, b) => a.x - b.x) ??
      []
    const leftmostAsteroid = asteroids[0]
    const untouchedAsteroid = asteroids[1]
    expect(leftmostAsteroid).toBeTruthy()
    expect(untouchedAsteroid).toBeTruthy()

    const projectWithForcedCollision = updateRoomInstances(template.project, template.roomId, (instances) => [
      ...instances,
      {
        id: "test-bullet-collision",
        objectId: bulletObjectId ?? "",
        x: leftmostAsteroid?.x ?? 0,
        y: leftmostAsteroid?.y ?? 0
      }
    ])

    const result = runRuntimeTick(projectWithForcedCollision, template.roomId, new Set(), createInitialRuntimeState())
    const resultRoom = result.project.rooms.find((roomEntry) => roomEntry.id === template.roomId)
    const asteroidIdsAfter =
      resultRoom?.instances.filter((instanceEntry) => instanceEntry.objectId === asteroidObjectId).map((entry) => entry.id) ??
      []

    expect(asteroidIdsAfter).not.toContain(leftmostAsteroid?.id ?? "")
    expect(asteroidIdsAfter).toContain(untouchedAsteroid?.id ?? "")
    expect(asteroidIdsAfter).toHaveLength(2)
  })

  it("runs OnDestroy actions when destroyOther removes an instance", () => {
    const template = createCoinDashTemplateProject()
    const playerObjectId = template.project.objects.find((objectEntry) => objectEntry.name === "Explorer")?.id
    const coinObjectId = template.project.objects.find((objectEntry) => objectEntry.name === "Coin")?.id
    expect(playerObjectId).toBeTruthy()
    expect(coinObjectId).toBeTruthy()

    const room = template.project.rooms.find((roomEntry) => roomEntry.id === template.roomId)
    const player = room?.instances.find((instanceEntry) => instanceEntry.objectId === playerObjectId)
    expect(player).toBeTruthy()

    const projectWithForcedCollision = updateRoomInstances(template.project, template.roomId, (instances) =>
      instances.map((instanceEntry) =>
        instanceEntry.objectId === coinObjectId
          ? {
              ...instanceEntry,
              x: player?.x ?? instanceEntry.x,
              y: player?.y ?? instanceEntry.y
            }
          : instanceEntry
      )
    )

    const result = runRuntimeTick(projectWithForcedCollision, template.roomId, new Set(), createInitialRuntimeState())

    expect(result.runtime.score).toBe(100)
    expect(result.runtime.gameOver).toBe(true)
    expect(result.runtime.message).toBe("Has recollit la moneda. Has guanyat!")
  })
})
