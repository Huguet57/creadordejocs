import { describe, expect, it } from "vitest"
import type { ProjectV1 } from "@creadordejocs/project-format"
import { createCoinDashTemplateProject } from "./templates/coin-dash-template.js"
import { createLaneCrosserTemplateProject } from "./templates/lane-crosser-template.js"
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

function createKeyboardScoringProject(eventType: "KeyDown" | "KeyPress"): ProjectV1 {
  return {
    version: 1,
    metadata: {
      id: `project-${eventType.toLowerCase()}`,
      name: `${eventType} scoring test`,
      locale: "ca",
      createdAtIso: new Date().toISOString()
    },
    resources: {
      sprites: [],
      sounds: []
    },
    variables: {
      global: [],
      objectByObjectId: {}
    },
    objects: [
      {
        id: "object-player",
        name: "Player",
        spriteId: null,
        x: 0,
        y: 0,
        speed: 0,
        direction: 0,
        events: [
          {
            id: "event-keyboard",
            type: eventType,
            key: "Space",
            targetObjectId: null,
            intervalMs: null,
            items: [
              {
                id: "item-action-score",
                type: "action",
                action: { id: "action-score", type: "changeScore", delta: 1 }
              }
            ]
          }
        ]
      }
    ],
    rooms: [{ id: "room-main", name: "Main", instances: [{ id: "instance-player", objectId: "object-player", x: 0, y: 0 }] }],
    scenes: [],
    metrics: {
      appStart: 0,
      projectLoad: 0,
      runtimeErrors: 0,
      tutorialCompletion: 0,
      stuckRate: 0,
      timeToFirstPlayableFunMs: null
    }
  }
}

describe("runtime regressions", () => {
  it("Coin Dash template has no OnDestroy events on the Coin object", () => {
    const template = createCoinDashTemplateProject()
    const coinObject = template.project.objects.find((objectEntry) => objectEntry.name === "Coin")
    expect(coinObject).toBeTruthy()
    expect(coinObject?.events.filter((eventEntry) => eventEntry.type === "OnDestroy")).toHaveLength(0)
  })

  it("does not end Coin Dash after collecting only one coin", () => {
    const template = createCoinDashTemplateProject()
    const playerObjectId = template.project.objects.find((objectEntry) => objectEntry.name === "Explorer")?.id
    const coinObjectId = template.project.objects.find((objectEntry) => objectEntry.name === "Coin")?.id
    const coinsRemainingId = template.project.variables.global.find((variableEntry) => variableEntry.name === "coinsRemaining")?.id
    expect(playerObjectId).toBeTruthy()
    expect(coinObjectId).toBeTruthy()
    expect(coinsRemainingId).toBeTruthy()

    const room = template.project.rooms.find((roomEntry) => roomEntry.id === template.roomId)
    const player = room?.instances.find((instanceEntry) => instanceEntry.objectId === playerObjectId)
    expect(player).toBeTruthy()

    let movedCoin = false
    const projectWithForcedCollision = updateRoomInstances(template.project, template.roomId, (instances) => {
      return instances.map((instanceEntry) => {
        if (!movedCoin && instanceEntry.objectId === coinObjectId) {
          movedCoin = true
          return {
            ...instanceEntry,
            x: player?.x ?? instanceEntry.x,
            y: player?.y ?? instanceEntry.y
          }
        }
        return instanceEntry
      })
    })

    const result = runRuntimeTick(projectWithForcedCollision, template.roomId, new Set(), createInitialRuntimeState())
    const resultRoom = result.project.rooms.find((roomEntry) => roomEntry.id === template.roomId)
    const coinInstances = resultRoom?.instances.filter((instanceEntry) => instanceEntry.objectId === coinObjectId) ?? []

    expect(result.runtime.gameOver).toBe(false)
    expect(result.runtime.score).toBe(100)
    expect(result.runtime.globalVariables[coinsRemainingId ?? ""]).toBe(2)
    expect(coinInstances).toHaveLength(2)
  })

  it("does not end Coin Dash after collecting two coins sequentially", () => {
    const template = createCoinDashTemplateProject()
    const playerObjectId = template.project.objects.find((objectEntry) => objectEntry.name === "Explorer")?.id
    const coinObjectId = template.project.objects.find((objectEntry) => objectEntry.name === "Coin")?.id
    const coinsRemainingId = template.project.variables.global.find((variableEntry) => variableEntry.name === "coinsRemaining")?.id
    expect(playerObjectId).toBeTruthy()
    expect(coinObjectId).toBeTruthy()
    expect(coinsRemainingId).toBeTruthy()

    const projectWithoutEnemies = updateRoomInstances(template.project, template.roomId, (instances) =>
      instances.filter((instanceEntry) => instanceEntry.objectId === playerObjectId || instanceEntry.objectId === coinObjectId)
    )

    let project = projectWithoutEnemies
    let runtime = createInitialRuntimeState(project)

    for (let pickup = 0; pickup < 2; pickup += 1) {
      const room = project.rooms.find((roomEntry) => roomEntry.id === template.roomId)
      const playerInstance = room?.instances.find((instanceEntry) => instanceEntry.objectId === playerObjectId)
      const nextCoinInstance = room?.instances.find((instanceEntry) => instanceEntry.objectId === coinObjectId)
      expect(playerInstance).toBeTruthy()
      expect(nextCoinInstance).toBeTruthy()
      if (!playerInstance || !nextCoinInstance) {
        throw new Error("Missing player or coin instance during sequential pickup")
      }

      const projectWithForcedPickup = updateRoomInstances(project, template.roomId, (instances) =>
        instances.map((instanceEntry) =>
          instanceEntry.id === playerInstance.id
            ? { ...instanceEntry, x: nextCoinInstance.x, y: nextCoinInstance.y }
            : instanceEntry
        )
      )
      const result = runRuntimeTick(projectWithForcedPickup, template.roomId, new Set(), runtime)
      project = result.project
      runtime = result.runtime
    }

    const finalRoom = project.rooms.find((roomEntry) => roomEntry.id === template.roomId)
    const remainingCoins = finalRoom?.instances.filter((instanceEntry) => instanceEntry.objectId === coinObjectId) ?? []

    expect(runtime.score).toBe(200)
    expect(runtime.globalVariables[coinsRemainingId ?? ""]).toBe(1)
    expect(runtime.gameOver).toBe(false)
    expect(remainingCoins).toHaveLength(1)
  })

  it("does not end Coin Dash when two coins are collected in the same tick", () => {
    const template = createCoinDashTemplateProject()
    const playerObjectId = template.project.objects.find((objectEntry) => objectEntry.name === "Explorer")?.id
    const coinObjectId = template.project.objects.find((objectEntry) => objectEntry.name === "Coin")?.id
    const coinsRemainingId = template.project.variables.global.find((variableEntry) => variableEntry.name === "coinsRemaining")?.id
    expect(playerObjectId).toBeTruthy()
    expect(coinObjectId).toBeTruthy()
    expect(coinsRemainingId).toBeTruthy()

    const room = template.project.rooms.find((roomEntry) => roomEntry.id === template.roomId)
    const playerInstance = room?.instances.find((instanceEntry) => instanceEntry.objectId === playerObjectId)
    const coinInstances = room?.instances.filter((instanceEntry) => instanceEntry.objectId === coinObjectId) ?? []
    expect(playerInstance).toBeTruthy()
    expect(coinInstances.length).toBeGreaterThanOrEqual(2)
    if (!playerInstance || coinInstances.length < 2) {
      throw new Error("Missing instances for same-tick pickup test")
    }

    const firstCoin = coinInstances[0]
    const secondCoin = coinInstances[1]
    if (!firstCoin || !secondCoin) {
      throw new Error("Missing coin instances for same-tick pickup test")
    }
    const sharedX = firstCoin.x
    const sharedY = firstCoin.y
    const projectWithTwoCoinOverlap = updateRoomInstances(template.project, template.roomId, (instances) =>
      instances.map((instanceEntry) => {
        if (instanceEntry.id === playerInstance.id || instanceEntry.id === secondCoin.id) {
          return { ...instanceEntry, x: sharedX, y: sharedY }
        }
        return instanceEntry
      })
    )

    const result = runRuntimeTick(projectWithTwoCoinOverlap, template.roomId, new Set(), createInitialRuntimeState(projectWithTwoCoinOverlap))
    const resultRoom = result.project.rooms.find((roomEntry) => roomEntry.id === template.roomId)
    const remainingCoins = resultRoom?.instances.filter((instanceEntry) => instanceEntry.objectId === coinObjectId) ?? []

    expect(result.runtime.score).toBe(200)
    expect(result.runtime.globalVariables[coinsRemainingId ?? ""]).toBe(1)
    expect(result.runtime.gameOver).toBe(false)
    expect(remainingCoins).toHaveLength(1)
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

  it("runs KeyDown on every tick while key is held", () => {
    const project = createKeyboardScoringProject("KeyDown")
    const runtime = createInitialRuntimeState(project)

    const first = runRuntimeTick(project, "room-main", new Set(["Space"]), runtime, new Set(["Space"]))
    const second = runRuntimeTick(first.project, "room-main", new Set(["Space"]), first.runtime, new Set())
    const third = runRuntimeTick(second.project, "room-main", new Set(["Space"]), second.runtime, new Set())

    expect(first.runtime.score).toBe(1)
    expect(second.runtime.score).toBe(2)
    expect(third.runtime.score).toBe(3)
  })

  it("runs KeyPress only once per press", () => {
    const project = createKeyboardScoringProject("KeyPress")
    const runtime = createInitialRuntimeState(project)

    const first = runRuntimeTick(project, "room-main", new Set(["Space"]), runtime, new Set(["Space"]))
    const held = runRuntimeTick(first.project, "room-main", new Set(["Space"]), first.runtime, new Set())
    const released = runRuntimeTick(held.project, "room-main", new Set(), held.runtime, new Set())
    const secondPress = runRuntimeTick(released.project, "room-main", new Set(["Space"]), released.runtime, new Set(["Space"]))

    expect(first.runtime.score).toBe(1)
    expect(held.runtime.score).toBe(1)
    expect(released.runtime.score).toBe(1)
    expect(secondPress.runtime.score).toBe(2)
  })

  it("wins Coin Dash only after collecting all coins", () => {
    const template = createCoinDashTemplateProject()
    const playerObjectId = template.project.objects.find((objectEntry) => objectEntry.name === "Explorer")?.id
    const coinObjectId = template.project.objects.find((objectEntry) => objectEntry.name === "Coin")?.id
    const coinsRemainingId = template.project.variables.global.find((variableEntry) => variableEntry.name === "coinsRemaining")?.id
    expect(playerObjectId).toBeTruthy()
    expect(coinObjectId).toBeTruthy()
    expect(coinsRemainingId).toBeTruthy()

    const room = template.project.rooms.find((roomEntry) => roomEntry.id === template.roomId)
    const player = room?.instances.find((instanceEntry) => instanceEntry.objectId === playerObjectId)
    expect(player).toBeTruthy()

    const allCoinsOnPlayer = updateRoomInstances(template.project, template.roomId, (instances) =>
      instances.map((instanceEntry) =>
        instanceEntry.objectId === coinObjectId
          ? { ...instanceEntry, x: player?.x ?? instanceEntry.x, y: player?.y ?? instanceEntry.y }
          : instanceEntry
      )
    )
    const result = runRuntimeTick(allCoinsOnPlayer, template.roomId, new Set(), createInitialRuntimeState(allCoinsOnPlayer))

    expect(result.runtime.score).toBe(300)
    expect(result.runtime.globalVariables[coinsRemainingId ?? ""]).toBe(0)
    expect(result.runtime.gameOver).toBe(true)
    expect(result.runtime.message).toBe("Has recollit totes les monedes. Has guanyat!")
  })

  it("removes the final Coin instance after sequential pickups in Coin Dash", () => {
    const template = createCoinDashTemplateProject()
    const playerObjectId = template.project.objects.find((objectEntry) => objectEntry.name === "Explorer")?.id
    const coinObjectId = template.project.objects.find((objectEntry) => objectEntry.name === "Coin")?.id
    expect(playerObjectId).toBeTruthy()
    expect(coinObjectId).toBeTruthy()

    const projectWithoutEnemies = updateRoomInstances(template.project, template.roomId, (instances) =>
      instances.filter((instanceEntry) => instanceEntry.objectId === playerObjectId || instanceEntry.objectId === coinObjectId)
    )

    let project = projectWithoutEnemies
    let runtime = createInitialRuntimeState(project)

    for (let pickup = 0; pickup < 3; pickup += 1) {
      const room = project.rooms.find((roomEntry) => roomEntry.id === template.roomId)
      const playerInstance = room?.instances.find((instanceEntry) => instanceEntry.objectId === playerObjectId)
      const nextCoinInstance = room?.instances.find((instanceEntry) => instanceEntry.objectId === coinObjectId)
      expect(playerInstance).toBeTruthy()
      expect(nextCoinInstance).toBeTruthy()
      if (!playerInstance || !nextCoinInstance) {
        throw new Error("Missing player or coin instance during pickup flow")
      }

      const projectWithForcedPickup = updateRoomInstances(project, template.roomId, (instances) =>
        instances.map((instanceEntry) =>
          instanceEntry.id === playerInstance.id
            ? { ...instanceEntry, x: nextCoinInstance.x, y: nextCoinInstance.y }
            : instanceEntry
        )
      )
      const result = runRuntimeTick(projectWithForcedPickup, template.roomId, new Set(), runtime)
      project = result.project
      runtime = result.runtime
    }

    const finalRoom = project.rooms.find((roomEntry) => roomEntry.id === template.roomId)
    const remainingCoins = finalRoom?.instances.filter((instanceEntry) => instanceEntry.objectId === coinObjectId) ?? []

    expect(remainingCoins).toHaveLength(0)
    expect(runtime.score).toBe(300)
    expect(runtime.gameOver).toBe(true)
    expect(runtime.message).toBe("Has recollit totes les monedes. Has guanyat!")
  })

  it("limits Space Shooter firing when weapon heat reaches the cap", () => {
    const template = createSpaceShooterTemplateProject()
    const bulletObjectId = template.project.objects.find((objectEntry) => objectEntry.name === "Bullet")?.id
    const weaponHeatId = template.project.variables.global.find((variableEntry) => variableEntry.name === "weaponHeat")?.id
    expect(bulletObjectId).toBeTruthy()
    expect(weaponHeatId).toBeTruthy()

    let project = template.project
    let runtime = createInitialRuntimeState(project)
    for (let i = 0; i < 6; i += 1) {
      const result = runRuntimeTick(project, template.roomId, new Set(["Space"]), runtime)
      project = result.project
      runtime = result.runtime
    }

    const roomAfterShots = project.rooms.find((roomEntry) => roomEntry.id === template.roomId)
    const bulletInstances = roomAfterShots?.instances.filter((instanceEntry) => instanceEntry.objectId === bulletObjectId) ?? []

    expect(bulletInstances).toHaveLength(5)
    expect(runtime.globalVariables[weaponHeatId ?? ""]).toBe(5)
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

  it("runs OnDestroy actions when destroyOther removes a Coin instance", () => {
    const template = createCoinDashTemplateProject()
    const playerObjectId = template.project.objects.find((objectEntry) => objectEntry.name === "Explorer")?.id
    const coinObjectId = template.project.objects.find((objectEntry) => objectEntry.name === "Coin")?.id
    expect(playerObjectId).toBeTruthy()
    expect(coinObjectId).toBeTruthy()

    const room = template.project.rooms.find((roomEntry) => roomEntry.id === template.roomId)
    const player = room?.instances.find((instanceEntry) => instanceEntry.objectId === playerObjectId)
    expect(player).toBeTruthy()

    let movedCoin = false
    const projectWithForcedCollision = updateRoomInstances(template.project, template.roomId, (instances) =>
      instances.map((instanceEntry) => {
        if (!movedCoin && instanceEntry.objectId === coinObjectId) {
          movedCoin = true
          return {
            ...instanceEntry,
            x: player?.x ?? instanceEntry.x,
            y: player?.y ?? instanceEntry.y
          }
        }
        return instanceEntry
      })
    )

    const result = runRuntimeTick(projectWithForcedCollision, template.roomId, new Set(), createInitialRuntimeState())

    expect(result.runtime.score).toBe(100)
    expect(result.runtime.gameOver).toBe(false)
  })

  it("triggers OutsideRoom and jumps back to instance start", () => {
    const project: ProjectV1 = {
      version: 1,
      metadata: {
        id: "project-outside-room",
        name: "Outside room test",
        locale: "ca",
        createdAtIso: new Date().toISOString()
      },
      resources: {
        sprites: [],
        sounds: []
      },
      variables: {
        global: [],
        objectByObjectId: {}
      },
      objects: [
        {
          id: "object-player",
          name: "Player",
          spriteId: null,
          x: 40,
          y: 50,
          speed: 0,
          direction: 0,
          events: [
            {
              id: "event-step",
              type: "Step",
              key: null,
              targetObjectId: null,
              intervalMs: null,
              items: [{ id: "item-action-move", type: "action", action: { id: "action-move", type: "move", dx: 700, dy: 0 } }]
            },
            {
              id: "event-outside",
              type: "OutsideRoom",
              key: null,
              targetObjectId: null,
              intervalMs: null,
              items: [{ id: "item-action-jump-start", type: "action", action: { id: "action-jump-start", type: "jumpToStart" } }]
            }
          ]
        }
      ],
      rooms: [
        {
          id: "room-main",
          name: "Main",
          instances: [{ id: "instance-player", objectId: "object-player", x: 40, y: 50 }]
        }
      ],
      scenes: [],
      metrics: {
        appStart: 0,
        projectLoad: 0,
        runtimeErrors: 0,
        tutorialCompletion: 0,
        stuckRate: 0,
        timeToFirstPlayableFunMs: null
      }
    }

    const result = runRuntimeTick(project, "room-main", new Set(), createInitialRuntimeState())
    const room = result.project.rooms.find((roomEntry) => roomEntry.id === "room-main")
    const player = room?.instances.find((instanceEntry) => instanceEntry.id === "instance-player")

    expect(player?.x).toBe(40)
    expect(player?.y).toBe(50)
  })

  it("applies jumpToPosition as an absolute move", () => {
    const project: ProjectV1 = {
      version: 1,
      metadata: {
        id: "project-jump-pos",
        name: "Jump position test",
        locale: "ca",
        createdAtIso: new Date().toISOString()
      },
      resources: {
        sprites: [],
        sounds: []
      },
      variables: {
        global: [],
        objectByObjectId: {}
      },
      objects: [
        {
          id: "object-teleporter",
          name: "Teleporter",
          spriteId: null,
          x: 0,
          y: 0,
          speed: 0,
          direction: 0,
          events: [
            {
              id: "event-step",
              type: "Step",
              key: null,
              targetObjectId: null,
              intervalMs: null,
              items: [
                {
                  id: "item-action-jump-pos",
                  type: "action",
                  action: { id: "action-jump-pos", type: "jumpToPosition", x: 123, y: 77 }
                }
              ]
            }
          ]
        }
      ],
      rooms: [
        {
          id: "room-main",
          name: "Main",
          instances: [{ id: "instance-teleporter", objectId: "object-teleporter", x: 10, y: 20 }]
        }
      ],
      scenes: [],
      metrics: {
        appStart: 0,
        projectLoad: 0,
        runtimeErrors: 0,
        tutorialCompletion: 0,
        stuckRate: 0,
        timeToFirstPlayableFunMs: null
      }
    }

    const result = runRuntimeTick(project, "room-main", new Set(), createInitialRuntimeState())
    const room = result.project.rooms.find((roomEntry) => roomEntry.id === "room-main")
    const teleporter = room?.instances.find((instanceEntry) => instanceEntry.id === "instance-teleporter")

    expect(teleporter?.x).toBe(123)
    expect(teleporter?.y).toBe(77)
  })

  it("initializes and mutates global plus object instance variables", () => {
    const project: ProjectV1 = {
      version: 1,
      metadata: {
        id: "project-runtime-vars",
        name: "Runtime vars",
        locale: "ca",
        createdAtIso: new Date().toISOString()
      },
      resources: {
        sprites: [],
        sounds: []
      },
      variables: {
        global: [
          { id: "gv-score", name: "score", type: "number", initialValue: 1 },
          { id: "gv-flag", name: "flag", type: "boolean", initialValue: false }
        ],
        objectByObjectId: {
          "object-player": [{ id: "ov-health", name: "health", type: "number", initialValue: 3 }]
        }
      },
      objects: [
        {
          id: "object-player",
          name: "Player",
          spriteId: null,
          x: 0,
          y: 0,
          speed: 0,
          direction: 0,
          events: [
            {
              id: "event-step",
              type: "Step",
              key: null,
              targetObjectId: null,
              intervalMs: null,
              items: [
                {
                  id: "item-action-global",
                  type: "action",
                  action: {
                    id: "action-global",
                    type: "changeGlobalVariable",
                    variableId: "gv-score",
                    operator: "set",
                    value: 9
                  }
                },
                {
                  id: "item-action-object",
                  type: "action",
                  action: {
                    id: "action-object",
                    type: "changeObjectVariable",
                    variableId: "ov-health",
                    operator: "set",
                    target: "self",
                    targetInstanceId: null,
                    value: 7
                  }
                }
              ]
            }
          ]
        }
      ],
      rooms: [{ id: "room-main", name: "Main", instances: [{ id: "instance-player", objectId: "object-player", x: 0, y: 0 }] }],
      scenes: [],
      metrics: {
        appStart: 0,
        projectLoad: 0,
        runtimeErrors: 0,
        tutorialCompletion: 0,
        stuckRate: 0,
        timeToFirstPlayableFunMs: null
      }
    }

    const result = runRuntimeTick(project, "room-main", new Set(), createInitialRuntimeState(project))

    expect(result.runtime.globalVariables["gv-score"]).toBe(9)
    expect(result.runtime.globalVariables["gv-flag"]).toBe(false)
    expect(result.runtime.objectInstanceVariables["instance-player"]?.["ov-health"]).toBe(7)
  })

  it("supports cross-instance variable transfer with collision self/other", () => {
    const project: ProjectV1 = {
      version: 1,
      metadata: {
        id: "project-runtime-cross",
        name: "Runtime cross vars",
        locale: "ca",
        createdAtIso: new Date().toISOString()
      },
      resources: {
        sprites: [],
        sounds: []
      },
      variables: {
        global: [{ id: "gv-copied", name: "copied", type: "number", initialValue: 0 }],
        objectByObjectId: {
          "object-source": [{ id: "ov-power", name: "power", type: "number", initialValue: 5 }],
          "object-target": [{ id: "ov-received", name: "received", type: "number", initialValue: 0 }]
        }
      },
      objects: [
        {
          id: "object-source",
          name: "Source",
          spriteId: null,
          x: 0,
          y: 0,
          speed: 0,
          direction: 0,
          events: [
            {
              id: "event-collision",
              type: "Collision",
              key: null,
              targetObjectId: "object-target",
              intervalMs: null,
              items: [
                {
                  id: "item-action-copy-to-other",
                  type: "action",
                  action: {
                    id: "action-copy-to-other",
                    type: "copyVariable",
                    direction: "globalToObject",
                    globalVariableId: "gv-copied",
                    objectVariableId: "ov-received",
                    instanceTarget: "other",
                    instanceTargetId: null
                  }
                },
                {
                  id: "item-action-global-from-self",
                  type: "action",
                  action: {
                    id: "action-global-from-self",
                    type: "copyVariable",
                    direction: "objectToGlobal",
                    globalVariableId: "gv-copied",
                    objectVariableId: "ov-power",
                    instanceTarget: "self",
                    instanceTargetId: null
                  }
                }
              ]
            }
          ]
        },
        {
          id: "object-target",
          name: "Target",
          spriteId: null,
          x: 0,
          y: 0,
          speed: 0,
          direction: 0,
          events: []
        }
      ],
      rooms: [
        {
          id: "room-main",
          name: "Main",
          instances: [
            { id: "instance-source", objectId: "object-source", x: 10, y: 10 },
            { id: "instance-target", objectId: "object-target", x: 10, y: 10 }
          ]
        }
      ],
      scenes: [],
      metrics: {
        appStart: 0,
        projectLoad: 0,
        runtimeErrors: 0,
        tutorialCompletion: 0,
        stuckRate: 0,
        timeToFirstPlayableFunMs: null
      }
    }

    const firstTick = runRuntimeTick(project, "room-main", new Set(), createInitialRuntimeState(project))
    const secondTick = runRuntimeTick(firstTick.project, "room-main", new Set(), firstTick.runtime)

    expect(firstTick.runtime.globalVariables["gv-copied"]).toBe(5)
    expect(secondTick.runtime.objectInstanceVariables["instance-target"]?.["ov-received"]).toBe(5)
  })

  it("switches the active room when goToRoom is executed", () => {
    const project: ProjectV1 = {
      version: 1,
      metadata: {
        id: "project-go-to-room",
        name: "Go to room test",
        locale: "ca",
        createdAtIso: new Date().toISOString()
      },
      resources: {
        sprites: [],
        sounds: []
      },
      variables: {
        global: [],
        objectByObjectId: {}
      },
      objects: [
        {
          id: "object-portal",
          name: "Portal",
          spriteId: null,
          x: 0,
          y: 0,
          speed: 0,
          direction: 0,
          events: [
            {
              id: "event-step",
              type: "Step",
              key: null,
              targetObjectId: null,
              intervalMs: null,
              items: [
                {
                  id: "item-action-go-room",
                  type: "action",
                  action: { id: "action-go-room", type: "goToRoom", roomId: "room-b" }
                }
              ]
            }
          ]
        }
      ],
      rooms: [
        {
          id: "room-a",
          name: "Room A",
          instances: [{ id: "instance-portal", objectId: "object-portal", x: 10, y: 10 }]
        },
        {
          id: "room-b",
          name: "Room B",
          instances: []
        }
      ],
      scenes: [],
      metrics: {
        appStart: 0,
        projectLoad: 0,
        runtimeErrors: 0,
        tutorialCompletion: 0,
        stuckRate: 0,
        timeToFirstPlayableFunMs: null
      }
    }

    const result = runRuntimeTick(project, "room-a", new Set(), createInitialRuntimeState(project))

    expect(result.activeRoomId).toBe("room-b")
  })

  it("keeps the same active room when goToRoom points to a missing room", () => {
    const project: ProjectV1 = {
      version: 1,
      metadata: {
        id: "project-go-to-room-missing",
        name: "Go to room missing test",
        locale: "ca",
        createdAtIso: new Date().toISOString()
      },
      resources: {
        sprites: [],
        sounds: []
      },
      variables: {
        global: [],
        objectByObjectId: {}
      },
      objects: [
        {
          id: "object-portal",
          name: "Portal",
          spriteId: null,
          x: 0,
          y: 0,
          speed: 0,
          direction: 0,
          events: [
            {
              id: "event-step",
              type: "Step",
              key: null,
              targetObjectId: null,
              intervalMs: null,
              items: [
                {
                  id: "item-action-go-room",
                  type: "action",
                  action: { id: "action-go-room", type: "goToRoom", roomId: "room-missing" }
                }
              ]
            }
          ]
        }
      ],
      rooms: [
        {
          id: "room-a",
          name: "Room A",
          instances: [{ id: "instance-portal", objectId: "object-portal", x: 10, y: 10 }]
        }
      ],
      scenes: [],
      metrics: {
        appStart: 0,
        projectLoad: 0,
        runtimeErrors: 0,
        tutorialCompletion: 0,
        stuckRate: 0,
        timeToFirstPlayableFunMs: null
      }
    }

    const result = runRuntimeTick(project, "room-a", new Set(), createInitialRuntimeState(project))

    expect(result.activeRoomId).toBe("room-a")
  })

  it("flags restartRoom requests so controller can restore room snapshot", () => {
    const project: ProjectV1 = {
      version: 1,
      metadata: {
        id: "project-restart-room",
        name: "Restart room test",
        locale: "ca",
        createdAtIso: new Date().toISOString()
      },
      resources: {
        sprites: [],
        sounds: []
      },
      variables: {
        global: [],
        objectByObjectId: {}
      },
      objects: [
        {
          id: "object-restarter",
          name: "Restarter",
          spriteId: null,
          x: 0,
          y: 0,
          speed: 0,
          direction: 0,
          events: [
            {
              id: "event-step",
              type: "Step",
              key: null,
              targetObjectId: null,
              intervalMs: null,
              items: [
                {
                  id: "item-action-restart",
                  type: "action",
                  action: { id: "action-restart", type: "restartRoom" }
                }
              ]
            }
          ]
        }
      ],
      rooms: [{ id: "room-main", name: "Main", instances: [{ id: "instance-a", objectId: "object-restarter", x: 2, y: 3 }] }],
      scenes: [],
      metrics: {
        appStart: 0,
        projectLoad: 0,
        runtimeErrors: 0,
        tutorialCompletion: 0,
        stuckRate: 0,
        timeToFirstPlayableFunMs: null
      }
    }

    const result = runRuntimeTick(project, "room-main", new Set(), createInitialRuntimeState(project))

    expect(result.restartRoomRequested).toBe(true)
    expect(result.activeRoomId).toBe("room-main")
  })

  it("triggers Timer events only when interval elapsed", () => {
    const project: ProjectV1 = {
      version: 1,
      metadata: {
        id: "project-timer",
        name: "Timer test",
        locale: "ca",
        createdAtIso: new Date().toISOString()
      },
      resources: {
        sprites: [],
        sounds: []
      },
      variables: {
        global: [],
        objectByObjectId: {}
      },
      objects: [
        {
          id: "object-timer",
          name: "TimerObject",
          spriteId: null,
          x: 0,
          y: 0,
          speed: 0,
          direction: 0,
          events: [
            {
              id: "event-timer",
              type: "Timer",
              key: null,
              targetObjectId: null,
              intervalMs: 1000,
              items: [
                {
                  id: "item-action-score",
                  type: "action",
                  action: { id: "action-score", type: "changeScore", delta: 1 }
                }
              ]
            }
          ]
        }
      ],
      rooms: [{ id: "room-main", name: "Main", instances: [{ id: "instance-timer", objectId: "object-timer", x: 0, y: 0 }] }],
      scenes: [],
      metrics: {
        appStart: 0,
        projectLoad: 0,
        runtimeErrors: 0,
        tutorialCompletion: 0,
        stuckRate: 0,
        timeToFirstPlayableFunMs: null
      }
    }

    let state = createInitialRuntimeState(project)
    let currentProject = project
    for (let i = 0; i < 12; i += 1) {
      const result = runRuntimeTick(currentProject, "room-main", new Set(), state)
      state = result.runtime
      currentProject = result.project
    }
    expect(state.score).toBe(0)

    const firstTrigger = runRuntimeTick(currentProject, "room-main", new Set(), state)
    expect(firstTrigger.runtime.score).toBe(1)

    state = firstTrigger.runtime
    currentProject = firstTrigger.project
    for (let i = 0; i < 12; i += 1) {
      const result = runRuntimeTick(currentProject, "room-main", new Set(), state)
      state = result.runtime
      currentProject = result.project
    }
    expect(state.score).toBe(1)

    const secondTrigger = runRuntimeTick(currentProject, "room-main", new Set(), state)
    expect(secondTrigger.runtime.score).toBe(2)
  })

  it("applies add/subtract/multiply for numeric variables and ignores non numeric targets", () => {
    const project: ProjectV1 = {
      version: 1,
      metadata: {
        id: "project-arithmetic",
        name: "Arithmetic test",
        locale: "ca",
        createdAtIso: new Date().toISOString()
      },
      resources: {
        sprites: [],
        sounds: []
      },
      variables: {
        global: [
          { id: "gv-number", name: "number", type: "number", initialValue: 2 },
          { id: "gv-string", name: "text", type: "string", initialValue: "hola" }
        ],
        objectByObjectId: {
          "object-calc": [
            { id: "ov-number", name: "energy", type: "number", initialValue: 10 },
            { id: "ov-bool", name: "flag", type: "boolean", initialValue: true }
          ]
        }
      },
      objects: [
        {
          id: "object-calc",
          name: "Calculator",
          spriteId: null,
          x: 0,
          y: 0,
          speed: 0,
          direction: 0,
          events: [
            {
              id: "event-step",
              type: "Step",
              key: null,
              targetObjectId: null,
              intervalMs: null,
              items: [
                {
                  id: "item-a1",
                  type: "action",
                  action: { id: "a1", type: "changeGlobalVariable", variableId: "gv-number", operator: "add", value: 3 }
                },
                {
                  id: "item-a2",
                  type: "action",
                  action: { id: "a2", type: "changeGlobalVariable", variableId: "gv-number", operator: "subtract", value: 1 }
                },
                {
                  id: "item-a3",
                  type: "action",
                  action: { id: "a3", type: "changeGlobalVariable", variableId: "gv-number", operator: "multiply", value: 5 }
                },
                {
                  id: "item-a4",
                  type: "action",
                  action: { id: "a4", type: "changeGlobalVariable", variableId: "gv-string", operator: "add", value: 9 }
                },
                {
                  id: "item-a5",
                  type: "action",
                  action: {
                    id: "a5",
                    type: "changeObjectVariable",
                    variableId: "ov-number",
                    operator: "add",
                    target: "self",
                    targetInstanceId: null,
                    value: 5
                  }
                },
                {
                  id: "item-a6",
                  type: "action",
                  action: {
                    id: "a6",
                    type: "changeObjectVariable",
                    variableId: "ov-number",
                    operator: "subtract",
                    target: "self",
                    targetInstanceId: null,
                    value: 3
                  }
                },
                {
                  id: "item-a7",
                  type: "action",
                  action: {
                    id: "a7",
                    type: "changeObjectVariable",
                    variableId: "ov-number",
                    operator: "multiply",
                    target: "self",
                    targetInstanceId: null,
                    value: 2
                  }
                },
                {
                  id: "item-a8",
                  type: "action",
                  action: {
                    id: "a8",
                    type: "changeObjectVariable",
                    variableId: "ov-bool",
                    operator: "add",
                    target: "self",
                    targetInstanceId: null,
                    value: 1
                  }
                }
              ]
            }
          ]
        }
      ],
      rooms: [{ id: "room-main", name: "Main", instances: [{ id: "instance-calc", objectId: "object-calc", x: 0, y: 0 }] }],
      scenes: [],
      metrics: {
        appStart: 0,
        projectLoad: 0,
        runtimeErrors: 0,
        tutorialCompletion: 0,
        stuckRate: 0,
        timeToFirstPlayableFunMs: null
      }
    }

    const result = runRuntimeTick(project, "room-main", new Set(), createInitialRuntimeState(project))

    expect(result.runtime.globalVariables["gv-number"]).toBe(20)
    expect(result.runtime.globalVariables["gv-string"]).toBe("hola")
    expect(result.runtime.objectInstanceVariables["instance-calc"]?.["ov-number"]).toBe(24)
    expect(result.runtime.objectInstanceVariables["instance-calc"]?.["ov-bool"]).toBe(true)
  })

  it("uses Lane Crosser lives and only ends game after repeated collisions", () => {
    const template = createLaneCrosserTemplateProject()
    const runnerObjectId = template.project.objects.find((objectEntry) => objectEntry.name === "Runner")?.id
    const carObjectIds = template.project.objects
      .filter((objectEntry) => objectEntry.name === "CarRight" || objectEntry.name === "CarLeft")
      .map((objectEntry) => objectEntry.id)
    const livesVariableId = template.project.variables.global.find((variableEntry) => variableEntry.name === "lives")?.id
    expect(runnerObjectId).toBeTruthy()
    expect(carObjectIds).toHaveLength(2)
    expect(livesVariableId).toBeTruthy()

    let project = template.project
    let runtime = createInitialRuntimeState(project)

    const forceRunnerCarCollision = (sourceProject: ProjectV1): ProjectV1 => {
      const room = sourceProject.rooms.find((roomEntry) => roomEntry.id === template.roomId)
      const runnerInstance = room?.instances.find((instanceEntry) => instanceEntry.objectId === runnerObjectId)
      if (!runnerInstance) {
        return sourceProject
      }
      let shifted = false
      return updateRoomInstances(sourceProject, template.roomId, (instances) =>
        instances.map((instanceEntry) => {
          if (!shifted && carObjectIds.includes(instanceEntry.objectId)) {
            shifted = true
            return {
              ...instanceEntry,
              x: runnerInstance.x,
              y: runnerInstance.y
            }
          }
          return instanceEntry
        })
      )
    }

    const firstCollision = runRuntimeTick(forceRunnerCarCollision(project), template.roomId, new Set(), runtime)
    project = firstCollision.project
    runtime = firstCollision.runtime
    expect(runtime.gameOver).toBe(false)
    expect(runtime.globalVariables[livesVariableId ?? ""]).toBe(2)

    const secondCollision = runRuntimeTick(forceRunnerCarCollision(project), template.roomId, new Set(), runtime)
    project = secondCollision.project
    runtime = secondCollision.runtime
    expect(runtime.gameOver).toBe(false)
    expect(runtime.globalVariables[livesVariableId ?? ""]).toBe(1)

    const thirdCollision = runRuntimeTick(forceRunnerCarCollision(project), template.roomId, new Set(), runtime)
    expect(thirdCollision.runtime.gameOver).toBe(true)
    expect(thirdCollision.runtime.globalVariables[livesVariableId ?? ""]).toBe(0)
  })
})

describe("runtime tick idempotency (guards against StrictMode double-invoke)", () => {
  it("running the same Coin Dash tick twice with identical state does not double-decrement coinsRemaining", () => {
    const template = createCoinDashTemplateProject()
    const playerObjectId = template.project.objects.find((objectEntry) => objectEntry.name === "Explorer")?.id
    const coinObjectId = template.project.objects.find((objectEntry) => objectEntry.name === "Coin")?.id
    const coinsRemainingId = template.project.variables.global.find((variableEntry) => variableEntry.name === "coinsRemaining")?.id
    expect(playerObjectId).toBeTruthy()
    expect(coinObjectId).toBeTruthy()
    expect(coinsRemainingId).toBeTruthy()

    const room = template.project.rooms.find((roomEntry) => roomEntry.id === template.roomId)
    const playerInstance = room?.instances.find((instanceEntry) => instanceEntry.objectId === playerObjectId)
    const firstCoinInstance = room?.instances.find((instanceEntry) => instanceEntry.objectId === coinObjectId)
    expect(playerInstance).toBeTruthy()
    expect(firstCoinInstance).toBeTruthy()
    if (!playerInstance || !firstCoinInstance) {
      throw new Error("Missing player or coin instance")
    }

    const projectWithCollision = updateRoomInstances(template.project, template.roomId, (instances) =>
      instances.map((instanceEntry) =>
        instanceEntry.id === playerInstance.id
          ? { ...instanceEntry, x: firstCoinInstance.x, y: firstCoinInstance.y }
          : instanceEntry
      )
    )
    const runtime = createInitialRuntimeState(projectWithCollision)

    const firstResult = runRuntimeTick(projectWithCollision, template.roomId, new Set(), runtime)
    const secondResult = runRuntimeTick(projectWithCollision, template.roomId, new Set(), runtime)

    expect(firstResult.runtime.globalVariables[coinsRemainingId ?? ""]).toBe(2)
    expect(firstResult.runtime.score).toBe(100)

    expect(secondResult.runtime.globalVariables[coinsRemainingId ?? ""]).toBe(2)
    expect(secondResult.runtime.score).toBe(100)
  })

  it("running the same Space Shooter tick twice does not double-increment weaponHeat", () => {
    const template = createSpaceShooterTemplateProject()
    const weaponHeatId = template.project.variables.global.find((variableEntry) => variableEntry.name === "weaponHeat")?.id
    expect(weaponHeatId).toBeTruthy()

    const runtime = createInitialRuntimeState(template.project)

    const firstResult = runRuntimeTick(template.project, template.roomId, new Set(["Space"]), runtime)
    const secondResult = runRuntimeTick(template.project, template.roomId, new Set(["Space"]), runtime)

    expect(firstResult.runtime.globalVariables[weaponHeatId ?? ""]).toBe(1)
    expect(secondResult.runtime.globalVariables[weaponHeatId ?? ""]).toBe(1)
  })

  it("running the same Lane Crosser collision tick twice does not double-subtract lives", () => {
    const template = createLaneCrosserTemplateProject()
    const runnerObjectId = template.project.objects.find((objectEntry) => objectEntry.name === "Runner")?.id
    const carObjectIds = template.project.objects
      .filter((objectEntry) => objectEntry.name === "CarRight" || objectEntry.name === "CarLeft")
      .map((objectEntry) => objectEntry.id)
    const livesId = template.project.variables.global.find((variableEntry) => variableEntry.name === "lives")?.id
    expect(runnerObjectId).toBeTruthy()
    expect(livesId).toBeTruthy()

    const room = template.project.rooms.find((roomEntry) => roomEntry.id === template.roomId)
    const runnerInstance = room?.instances.find((instanceEntry) => instanceEntry.objectId === runnerObjectId)
    const carInstance = room?.instances.find((instanceEntry) => carObjectIds.includes(instanceEntry.objectId))
    expect(runnerInstance).toBeTruthy()
    expect(carInstance).toBeTruthy()
    if (!runnerInstance || !carInstance) {
      throw new Error("Missing runner or car instance")
    }

    const projectWithCollision = updateRoomInstances(template.project, template.roomId, (instances) =>
      instances.map((instanceEntry) =>
        instanceEntry.id === runnerInstance.id
          ? { ...instanceEntry, x: carInstance.x, y: carInstance.y }
          : instanceEntry
      )
    )
    const runtime = createInitialRuntimeState(projectWithCollision)

    const firstResult = runRuntimeTick(projectWithCollision, template.roomId, new Set(), runtime)
    const secondResult = runRuntimeTick(projectWithCollision, template.roomId, new Set(), runtime)

    expect(firstResult.runtime.globalVariables[livesId ?? ""]).toBe(2)
    expect(secondResult.runtime.globalVariables[livesId ?? ""]).toBe(2)
  })
})
