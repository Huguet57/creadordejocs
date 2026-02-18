import { describe, expect, it } from "vitest"
import type { ProjectV1 } from "@creadordejocs/project-format"
import { createCoinDashTemplateProject } from "./templates/coin-dash-template.js"
import { createLaneCrosserTemplateProject } from "./templates/lane-crosser-template.js"
import { createSpaceShooterTemplateProject } from "./templates/space-shooter-template.js"
import { createSwitchVaultTemplateProject } from "./templates/switch-vault-template.js"
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

function createKeyboardScoringProject(mode: "down" | "press"): ProjectV1 {
  return {
    version: 1,
    metadata: {
      id: `project-${mode}`,
      name: `${mode} keyboard scoring test`,
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
            type: "Keyboard",
            key: "Space",
            keyboardMode: mode,
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

function createMouseScoringProject(
  eventType: "MouseMove" | "Mouse",
  mouseMode: "down" | "press" | null = null
): ProjectV1 {
  return {
    version: 1,
    metadata: {
      id: `project-${eventType}`,
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
            id: "event-mouse",
            type: eventType,
            key: null,
            keyboardMode: null,
            targetObjectId: null,
            intervalMs: null,
            ...(eventType === "Mouse" ? { mouseMode: mouseMode ?? "down" } : {}),
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

function createMouseBuiltinConditionProject(): ProjectV1 {
  return {
    version: 1,
    metadata: {
      id: "project-mouse-builtins",
      name: "mouse builtins test",
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
            id: "event-step",
            type: "Step",
            key: null,
            keyboardMode: null,
            targetObjectId: null,
            intervalMs: null,
            items: [
              {
                id: "if-mouse-x",
                type: "if",
                condition: {
                  left: { source: "mouseAttribute", attribute: "x" },
                  operator: ">",
                  right: 100
                },
                thenActions: [{ id: "item-score", type: "action", action: { id: "action-score", type: "changeScore", delta: 1 } }],
                elseActions: []
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

    const result = runRuntimeTick(
      template.project,
      template.roomId,
      new Set(["Space"]),
      createInitialRuntimeState(),
      new Set(["Space"])
    )
    const roomAfter = result.project.rooms.find((roomEntry) => roomEntry.id === template.roomId)
    const bulletsAfter = roomAfter?.instances.filter((instanceEntry) => instanceEntry.objectId === bulletObjectId) ?? []
    const spawnedBullet = bulletsAfter[0]

    expect(bulletsAfter).toHaveLength(1)
    expect(spawnedBullet).toBeTruthy()
    // Relative spawn is from center of the ship (32x32 default → +16,+16)
    expect(spawnedBullet?.x).toBe((shipBefore?.x ?? 0) + 16 + 0)
    expect(spawnedBullet?.y).toBe((shipBefore?.y ?? 0) + 16 - 25)
  })

  it("runs Keyboard/down on every tick while key is held", () => {
    const project = createKeyboardScoringProject("down")
    const runtime = createInitialRuntimeState(project)

    const first = runRuntimeTick(project, "room-main", new Set(["Space"]), runtime, new Set(["Space"]))
    const second = runRuntimeTick(first.project, "room-main", new Set(["Space"]), first.runtime, new Set())
    const third = runRuntimeTick(second.project, "room-main", new Set(["Space"]), second.runtime, new Set())

    expect(first.runtime.score).toBe(1)
    expect(second.runtime.score).toBe(2)
    expect(third.runtime.score).toBe(3)
  })

  it("runs Keyboard/press only once per press", () => {
    const project = createKeyboardScoringProject("press")
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

  it("runs MouseMove on ticks where pointer moved", () => {
    const project = createMouseScoringProject("MouseMove")
    const runtime = createInitialRuntimeState(project)

    const first = runRuntimeTick(project, "room-main", new Set(), runtime, new Set(), {
      x: 10,
      y: 12,
      moved: true,
      pressedButtons: new Set(),
      justPressedButtons: new Set()
    })
    const second = runRuntimeTick(first.project, "room-main", new Set(), first.runtime, new Set(), {
      x: 10,
      y: 12,
      moved: false,
      pressedButtons: new Set(),
      justPressedButtons: new Set()
    })

    expect(first.runtime.score).toBe(1)
    expect(second.runtime.score).toBe(1)
  })

  it("runs Mouse/down while any mouse button is held", () => {
    const project = createMouseScoringProject("Mouse", "down")
    const runtime = createInitialRuntimeState(project)

    const held = runRuntimeTick(project, "room-main", new Set(), runtime, new Set(), {
      x: 0,
      y: 0,
      moved: false,
      pressedButtons: new Set(["left"]),
      justPressedButtons: new Set(["left"])
    })
    const released = runRuntimeTick(held.project, "room-main", new Set(), held.runtime, new Set(), {
      x: 0,
      y: 0,
      moved: false,
      pressedButtons: new Set(),
      justPressedButtons: new Set()
    })

    expect(held.runtime.score).toBe(1)
    expect(released.runtime.score).toBe(1)
  })

  it("runs Mouse/press only on press edge", () => {
    const project = createMouseScoringProject("Mouse", "press")
    const runtime = createInitialRuntimeState(project)

    const first = runRuntimeTick(project, "room-main", new Set(), runtime, new Set(), {
      x: 0,
      y: 0,
      moved: false,
      pressedButtons: new Set(["left"]),
      justPressedButtons: new Set(["left"])
    })
    const held = runRuntimeTick(first.project, "room-main", new Set(), first.runtime, new Set(), {
      x: 0,
      y: 0,
      moved: false,
      pressedButtons: new Set(["left"]),
      justPressedButtons: new Set()
    })
    const secondPress = runRuntimeTick(held.project, "room-main", new Set(), held.runtime, new Set(), {
      x: 0,
      y: 0,
      moved: false,
      pressedButtons: new Set(["left"]),
      justPressedButtons: new Set(["left"])
    })

    expect(first.runtime.score).toBe(1)
    expect(held.runtime.score).toBe(1)
    expect(secondPress.runtime.score).toBe(2)
  })

  it("resolves mouse.x as runtime mouse attribute", () => {
    const project = createMouseBuiltinConditionProject()
    const runtime = createInitialRuntimeState(project)

    const belowThreshold = runRuntimeTick(project, "room-main", new Set(), runtime, new Set(), {
      x: 90,
      y: 30,
      moved: true,
      pressedButtons: new Set(),
      justPressedButtons: new Set()
    })
    const aboveThreshold = runRuntimeTick(project, "room-main", new Set(), belowThreshold.runtime, new Set(), {
      x: 120,
      y: 30,
      moved: true,
      pressedButtons: new Set(),
      justPressedButtons: new Set()
    })

    expect(belowThreshold.runtime.score).toBe(0)
    expect(aboveThreshold.runtime.score).toBe(1)
    expect(aboveThreshold.runtime.mouse.x).toBe(120)
    expect(aboveThreshold.runtime.mouse.y).toBe(30)
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
      const result = runRuntimeTick(project, template.roomId, new Set(["Space"]), runtime, new Set(["Space"]))
      project = result.project
      runtime = result.runtime
    }

    const roomAfterShots = project.rooms.find((roomEntry) => roomEntry.id === template.roomId)
    const bulletInstances = roomAfterShots?.instances.filter((instanceEntry) => instanceEntry.objectId === bulletObjectId) ?? []

    expect(bulletInstances).toHaveLength(5)
    expect(runtime.globalVariables[weaponHeatId ?? ""]).toBe(5)
  })

  it("removes one asteroid instance when a bullet collides", () => {
    const template = createSpaceShooterTemplateProject()
    const bulletObjectId = template.project.objects.find((objectEntry) => objectEntry.name === "Bullet")?.id
    const asteroidObjectId = template.project.objects.find((objectEntry) => objectEntry.name === "Asteroid")?.id
    expect(bulletObjectId).toBeTruthy()
    expect(asteroidObjectId).toBeTruthy()

    const spawnedShot = runRuntimeTick(
      template.project,
      template.roomId,
      new Set(["Space"]),
      createInitialRuntimeState(template.project),
      new Set(["Space"])
    )
    const roomAfterShot = spawnedShot.project.rooms.find((roomEntry) => roomEntry.id === template.roomId)
    const asteroids =
      roomAfterShot?.instances.filter((instanceEntry) => instanceEntry.objectId === asteroidObjectId).sort((a, b) => a.x - b.x) ??
      []
    const leftmostAsteroid = asteroids[0]
    const spawnedBullet = roomAfterShot?.instances.find((instanceEntry) => instanceEntry.objectId === bulletObjectId)
    expect(leftmostAsteroid).toBeTruthy()
    expect(spawnedBullet).toBeTruthy()

    const projectWithoutStepMotion = {
      ...spawnedShot.project,
      objects: spawnedShot.project.objects.map((objectEntry) =>
        objectEntry.id === asteroidObjectId || objectEntry.id === bulletObjectId
          ? {
              ...objectEntry,
              events: objectEntry.events.filter((eventEntry) => eventEntry.type !== "Step")
            }
          : objectEntry
      )
    }

    const projectWithForcedCollision = updateRoomInstances(projectWithoutStepMotion, template.roomId, (instances) =>
      instances.map((instanceEntry) =>
        instanceEntry.id === spawnedBullet?.id
          ? { ...instanceEntry, x: leftmostAsteroid?.x ?? 0, y: leftmostAsteroid?.y ?? 0 }
          : instanceEntry
      )
    )

    const result = runRuntimeTick(projectWithForcedCollision, template.roomId, new Set(), spawnedShot.runtime)
    const resultRoom = result.project.rooms.find((roomEntry) => roomEntry.id === template.roomId)
    const asteroidIdsAfter =
      resultRoom?.instances.filter((instanceEntry) => instanceEntry.objectId === asteroidObjectId).map((entry) => entry.id) ??
      []
    const asteroidIdsBefore = asteroids.map((entry) => entry.id)
    const removedAsteroidCount = asteroidIdsBefore.filter((id) => !asteroidIdsAfter.includes(id)).length

    expect(asteroidIdsAfter).toHaveLength(2)
    expect(removedAsteroidCount).toBe(1)
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
              items: [{ id: "item-action-move", type: "action", action: { id: "action-move", type: "move", dx: 900, dy: 0 } }]
            },
            {
              id: "event-outside",
              type: "OutsideRoom",
              key: null,
              targetObjectId: null,
              intervalMs: null,
              items: [
                {
                  id: "item-action-jump-start",
                  type: "action",
                  action: { id: "action-jump-start", type: "teleport", mode: "start", x: null, y: null }
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

  it("teleport/start works inside collision events after moving", () => {
    const project: ProjectV1 = {
      version: 1,
      metadata: {
        id: "project-collision-jump-start",
        name: "Collision teleport/start test",
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
          x: 100,
          y: 200,
          speed: 0,
          direction: 0,
          events: [
            {
              id: "event-step-move",
              type: "Step",
              key: null,
              targetObjectId: null,
              intervalMs: null,
              items: [
                {
                  id: "item-action-move-to-enemy",
                  type: "action",
                  action: { id: "action-move-to-enemy", type: "move", dx: 200, dy: 0 }
                }
              ]
            },
            {
              id: "event-collision-enemy",
              type: "Collision",
              key: null,
              targetObjectId: "object-enemy",
              intervalMs: null,
              items: [
                {
                  id: "item-action-jump-start",
                  type: "action",
                  action: { id: "action-jump-start", type: "teleport", mode: "start", x: null, y: null }
                }
              ]
            }
          ]
        },
        {
          id: "object-enemy",
          name: "Enemy",
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
            { id: "instance-player", objectId: "object-player", x: 100, y: 200 },
            { id: "instance-enemy", objectId: "object-enemy", x: 305, y: 200 }
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

    // First tick: player starts at (100,200), Step moves it to (300,200),
    // now overlaps with enemy at (305,200), collision fires teleport/start
    const result = runRuntimeTick(project, "room-main", new Set(), createInitialRuntimeState())
    const room = result.project.rooms.find((roomEntry) => roomEntry.id === "room-main")
    const player = room?.instances.find((instanceEntry) => instanceEntry.id === "instance-player")

    // Player should have jumped back to its start position (100, 200), not stay at (300, 200)
    expect(player?.x).toBe(100)
    expect(player?.y).toBe(200)
  })

  it("applies teleport/position as an absolute move", () => {
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
                  action: { id: "action-jump-pos", type: "teleport", mode: "position", x: 123, y: 77 }
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

  it("applies teleport/mouse using current runtime mouse coordinates", () => {
    const project: ProjectV1 = {
      version: 1,
      metadata: {
        id: "project-jump-mouse",
        name: "Jump mouse test",
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
                  id: "item-action-jump-mouse",
                  type: "action",
                  action: { id: "action-jump-mouse", type: "teleport", mode: "mouse", x: null, y: null }
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

    const result = runRuntimeTick(project, "room-main", new Set(), createInitialRuntimeState(), new Set(), {
      x: 187,
      y: 93,
      moved: true,
      pressedButtons: new Set(),
      justPressedButtons: new Set()
    })
    const room = result.project.rooms.find((roomEntry) => roomEntry.id === "room-main")
    const teleporter = room?.instances.find((instanceEntry) => instanceEntry.id === "instance-teleporter")

    expect(teleporter?.x).toBe(187)
    expect(teleporter?.y).toBe(93)
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
                    type: "changeVariable",
                    scope: "global",
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
                    type: "changeVariable",
                    scope: "object",
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

  it("runs elseActions when if condition is false", () => {
    const project: ProjectV1 = {
      version: 1,
      metadata: {
        id: "project-if-else",
        name: "If else test",
        locale: "ca",
        createdAtIso: new Date().toISOString()
      },
      resources: {
        sprites: [],
        sounds: []
      },
      variables: {
        global: [{ id: "gv-flag", name: "flag", type: "boolean", initialValue: false }],
        objectByObjectId: {}
      },
      objects: [
        {
          id: "object-checker",
          name: "Checker",
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
              keyboardMode: null,
              targetObjectId: null,
              intervalMs: null,
              items: [
                {
                  id: "if-branch",
                  type: "if",
                  condition: {
                    left: { scope: "global", variableId: "gv-flag" },
                    operator: "==",
                    right: true
                  },
                  thenActions: [
                    {
                      id: "then-item",
                      type: "action",
                      action: { id: "then-action", type: "changeScore", delta: 5 }
                    }
                  ],
                  elseActions: [
                    {
                      id: "else-item",
                      type: "action",
                      action: { id: "else-action", type: "changeScore", delta: 2 }
                    }
                  ]
                }
              ]
            }
          ]
        }
      ],
      rooms: [{ id: "room-main", name: "Main", instances: [{ id: "instance-checker", objectId: "object-checker", x: 0, y: 0 }] }],
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
    expect(result.runtime.score).toBe(2)
  })

  it("runs nested if branches recursively", () => {
    const project: ProjectV1 = {
      version: 1,
      metadata: {
        id: "project-nested-if",
        name: "Nested if test",
        locale: "ca",
        createdAtIso: new Date().toISOString()
      },
      resources: {
        sprites: [],
        sounds: []
      },
      variables: {
        global: [
          { id: "gv-first", name: "first", type: "boolean", initialValue: true },
          { id: "gv-second", name: "second", type: "boolean", initialValue: false }
        ],
        objectByObjectId: {}
      },
      objects: [
        {
          id: "object-nested-checker",
          name: "NestedChecker",
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
              keyboardMode: null,
              targetObjectId: null,
              intervalMs: null,
              items: [
                {
                  id: "if-root",
                  type: "if",
                  condition: {
                    left: { scope: "global", variableId: "gv-first" },
                    operator: "==",
                    right: true
                  },
                  thenActions: [
                    {
                      id: "if-nested",
                      type: "if",
                      condition: {
                        left: { scope: "global", variableId: "gv-second" },
                        operator: "==",
                        right: true
                      },
                      thenActions: [
                        {
                          id: "nested-then-item",
                          type: "action",
                          action: { id: "nested-then-action", type: "changeScore", delta: 10 }
                        }
                      ],
                      elseActions: [
                        {
                          id: "nested-else-item",
                          type: "action",
                          action: { id: "nested-else-action", type: "changeScore", delta: 3 }
                        }
                      ]
                    }
                  ],
                  elseActions: [
                    {
                      id: "root-else-item",
                      type: "action",
                      action: { id: "root-else-action", type: "changeScore", delta: 1 }
                    }
                  ]
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
          instances: [{ id: "instance-nested-checker", objectId: "object-nested-checker", x: 0, y: 0 }]
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

    const result = runRuntimeTick(project, "room-main", new Set(), createInitialRuntimeState(project))
    expect(result.runtime.score).toBe(3)
  })

  it("runs thenActions when AND compound condition is true", () => {
    const project: ProjectV1 = {
      version: 1,
      metadata: {
        id: "project-if-and",
        name: "If AND test",
        locale: "ca",
        createdAtIso: new Date().toISOString()
      },
      resources: {
        sprites: [],
        sounds: []
      },
      variables: {
        global: [
          { id: "gv-a", name: "a", type: "boolean", initialValue: true },
          { id: "gv-b", name: "b", type: "boolean", initialValue: true }
        ],
        objectByObjectId: {}
      },
      objects: [
        {
          id: "object-checker",
          name: "Checker",
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
              keyboardMode: null,
              targetObjectId: null,
              intervalMs: null,
              items: [
                {
                  id: "if-and",
                  type: "if",
                  condition: {
                    logic: "AND",
                    conditions: [
                      {
                        left: { scope: "global", variableId: "gv-a" },
                        operator: "==",
                        right: true
                      },
                      {
                        left: { scope: "global", variableId: "gv-b" },
                        operator: "==",
                        right: true
                      }
                    ]
                  },
                  thenActions: [
                    {
                      id: "then-item",
                      type: "action",
                      action: { id: "then-action", type: "changeScore", delta: 7 }
                    }
                  ],
                  elseActions: [
                    {
                      id: "else-item",
                      type: "action",
                      action: { id: "else-action", type: "changeScore", delta: 2 }
                    }
                  ]
                }
              ]
            }
          ]
        }
      ],
      rooms: [{ id: "room-main", name: "Main", instances: [{ id: "instance-checker", objectId: "object-checker", x: 0, y: 0 }] }],
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
    expect(result.runtime.score).toBe(7)
  })

  it("runs thenActions when OR compound condition has one true branch", () => {
    const project: ProjectV1 = {
      version: 1,
      metadata: {
        id: "project-if-or",
        name: "If OR test",
        locale: "ca",
        createdAtIso: new Date().toISOString()
      },
      resources: {
        sprites: [],
        sounds: []
      },
      variables: {
        global: [
          { id: "gv-a", name: "a", type: "boolean", initialValue: false },
          { id: "gv-b", name: "b", type: "boolean", initialValue: true }
        ],
        objectByObjectId: {}
      },
      objects: [
        {
          id: "object-checker",
          name: "Checker",
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
              keyboardMode: null,
              targetObjectId: null,
              intervalMs: null,
              items: [
                {
                  id: "if-or",
                  type: "if",
                  condition: {
                    logic: "OR",
                    conditions: [
                      {
                        left: { scope: "global", variableId: "gv-a" },
                        operator: "==",
                        right: true
                      },
                      {
                        left: { scope: "global", variableId: "gv-b" },
                        operator: "==",
                        right: true
                      }
                    ]
                  },
                  thenActions: [
                    {
                      id: "then-item",
                      type: "action",
                      action: { id: "then-action", type: "changeScore", delta: 9 }
                    }
                  ],
                  elseActions: [
                    {
                      id: "else-item",
                      type: "action",
                      action: { id: "else-action", type: "changeScore", delta: 1 }
                    }
                  ]
                }
              ]
            }
          ]
        }
      ],
      rooms: [{ id: "room-main", name: "Main", instances: [{ id: "instance-checker", objectId: "object-checker", x: 0, y: 0 }] }],
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
    expect(result.runtime.score).toBe(9)
  })

  it("supports comparing one variable against another variable", () => {
    const project: ProjectV1 = {
      version: 1,
      metadata: {
        id: "project-if-var-vs-var",
        name: "If variable vs variable",
        locale: "ca",
        createdAtIso: new Date().toISOString()
      },
      resources: {
        sprites: [],
        sounds: []
      },
      variables: {
        global: [
          { id: "gv-left", name: "left", type: "number", initialValue: 8 },
          { id: "gv-right", name: "right", type: "number", initialValue: 5 }
        ],
        objectByObjectId: {}
      },
      objects: [
        {
          id: "object-checker",
          name: "Checker",
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
              keyboardMode: null,
              targetObjectId: null,
              intervalMs: null,
              items: [
                {
                  id: "if-var-ref",
                  type: "if",
                  condition: {
                    left: { scope: "global", variableId: "gv-left" },
                    operator: ">",
                    right: { scope: "global", variableId: "gv-right" }
                  },
                  thenActions: [
                    {
                      id: "then-item",
                      type: "action",
                      action: { id: "then-action", type: "changeScore", delta: 4 }
                    }
                  ],
                  elseActions: [
                    {
                      id: "else-item",
                      type: "action",
                      action: { id: "else-action", type: "changeScore", delta: 1 }
                    }
                  ]
                }
              ]
            }
          ]
        }
      ],
      rooms: [{ id: "room-main", name: "Main", instances: [{ id: "instance-checker", objectId: "object-checker", x: 0, y: 0 }] }],
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
    expect(result.runtime.score).toBe(4)
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

  it("randomizeVariable updates numeric global variables within inclusive range", () => {
    const project: ProjectV1 = {
      version: 1,
      metadata: {
        id: "project-random-global",
        name: "Random global test",
        locale: "ca",
        createdAtIso: new Date().toISOString()
      },
      resources: {
        sprites: [],
        sounds: []
      },
      variables: {
        global: [{ id: "gv-roll", name: "roll", type: "number", initialValue: 0 }],
        objectByObjectId: {}
      },
      objects: [
        {
          id: "object-randomizer",
          name: "Randomizer",
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
              keyboardMode: null,
              targetObjectId: null,
              intervalMs: null,
              items: [
                {
                  id: "item-random-global",
                  type: "action",
                  action: {
                    id: "action-random-global",
                    type: "randomizeVariable",
                    scope: "global",
                    variableId: "gv-roll",
                    min: 2,
                    max: 4
                  }
                }
              ]
            }
          ]
        }
      ],
      rooms: [{ id: "room-main", name: "Main", instances: [{ id: "instance-randomizer", objectId: "object-randomizer", x: 0, y: 0 }] }],
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
    const value = result.runtime.globalVariables["gv-roll"]
    expect(typeof value).toBe("number")
    expect(value as number).toBeGreaterThanOrEqual(2)
    expect(value as number).toBeLessThanOrEqual(4)
  })

  it("randomizeVariable updates numeric object variables on self target", () => {
    const project: ProjectV1 = {
      version: 1,
      metadata: {
        id: "project-random-self",
        name: "Random self test",
        locale: "ca",
        createdAtIso: new Date().toISOString()
      },
      resources: {
        sprites: [],
        sounds: []
      },
      variables: {
        global: [],
        objectByObjectId: {
          "object-randomizer": [{ id: "ov-roll", name: "roll", type: "number", initialValue: 0 }]
        }
      },
      objects: [
        {
          id: "object-randomizer",
          name: "Randomizer",
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
              keyboardMode: null,
              targetObjectId: null,
              intervalMs: null,
              items: [
                {
                  id: "item-random-self",
                  type: "action",
                  action: {
                    id: "action-random-self",
                    type: "randomizeVariable",
                    scope: "object",
                    variableId: "ov-roll",
                    target: "self",
                    targetInstanceId: null,
                    min: 10,
                    max: 12
                  }
                }
              ]
            }
          ]
        }
      ],
      rooms: [{ id: "room-main", name: "Main", instances: [{ id: "instance-randomizer", objectId: "object-randomizer", x: 0, y: 0 }] }],
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
    const value = result.runtime.objectInstanceVariables["instance-randomizer"]?.["ov-roll"]
    expect(typeof value).toBe("number")
    expect(value as number).toBeGreaterThanOrEqual(10)
    expect(value as number).toBeLessThanOrEqual(12)
  })

  it("randomizeVariable supports object target 'other' during collisions", () => {
    const project: ProjectV1 = {
      version: 1,
      metadata: {
        id: "project-random-other",
        name: "Random other collision test",
        locale: "ca",
        createdAtIso: new Date().toISOString()
      },
      resources: {
        sprites: [],
        sounds: []
      },
      variables: {
        global: [],
        objectByObjectId: {
          "object-target": [{ id: "ov-health", name: "health", type: "number", initialValue: 100 }]
        }
      },
      objects: [
        {
          id: "object-randomizer",
          name: "Randomizer",
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
              keyboardMode: null,
              targetObjectId: "object-target",
              intervalMs: null,
              items: [
                {
                  id: "item-random-other",
                  type: "action",
                  action: {
                    id: "action-random-other",
                    type: "randomizeVariable",
                    scope: "object",
                    variableId: "ov-health",
                    target: "other",
                    targetInstanceId: null,
                    min: 1,
                    max: 3
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
            { id: "instance-randomizer", objectId: "object-randomizer", x: 10, y: 10 },
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

    const result = runRuntimeTick(project, "room-main", new Set(), createInitialRuntimeState(project))
    const value = result.runtime.objectInstanceVariables["instance-target"]?.["ov-health"]
    expect(typeof value).toBe("number")
    expect(value as number).toBeGreaterThanOrEqual(1)
    expect(value as number).toBeLessThanOrEqual(3)
  })

  it("randomizeVariable does nothing when min is greater than max", () => {
    const project: ProjectV1 = {
      version: 1,
      metadata: {
        id: "project-random-invalid-range",
        name: "Random invalid range test",
        locale: "ca",
        createdAtIso: new Date().toISOString()
      },
      resources: {
        sprites: [],
        sounds: []
      },
      variables: {
        global: [{ id: "gv-roll", name: "roll", type: "number", initialValue: 7 }],
        objectByObjectId: {}
      },
      objects: [
        {
          id: "object-randomizer",
          name: "Randomizer",
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
              keyboardMode: null,
              targetObjectId: null,
              intervalMs: null,
              items: [
                {
                  id: "item-random-invalid-range",
                  type: "action",
                  action: {
                    id: "action-random-invalid-range",
                    type: "randomizeVariable",
                    scope: "global",
                    variableId: "gv-roll",
                    min: 9,
                    max: 3
                  }
                }
              ]
            }
          ]
        }
      ],
      rooms: [{ id: "room-main", name: "Main", instances: [{ id: "instance-randomizer", objectId: "object-randomizer", x: 0, y: 0 }] }],
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
    expect(result.runtime.globalVariables["gv-roll"]).toBe(7)
  })

  it("randomizeVariable ignores non-number target variables", () => {
    const project: ProjectV1 = {
      version: 1,
      metadata: {
        id: "project-random-type-guard",
        name: "Random type guard test",
        locale: "ca",
        createdAtIso: new Date().toISOString()
      },
      resources: {
        sprites: [],
        sounds: []
      },
      variables: {
        global: [{ id: "gv-label", name: "label", type: "string", initialValue: "ready" }],
        objectByObjectId: {}
      },
      objects: [
        {
          id: "object-randomizer",
          name: "Randomizer",
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
              keyboardMode: null,
              targetObjectId: null,
              intervalMs: null,
              items: [
                {
                  id: "item-random-type-guard",
                  type: "action",
                  action: {
                    id: "action-random-type-guard",
                    type: "randomizeVariable",
                    scope: "global",
                    variableId: "gv-label",
                    min: 1,
                    max: 3
                  }
                }
              ]
            }
          ]
        }
      ],
      rooms: [{ id: "room-main", name: "Main", instances: [{ id: "instance-randomizer", objectId: "object-randomizer", x: 0, y: 0 }] }],
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
    expect(result.runtime.globalVariables["gv-label"]).toBe("ready")
  })

  it("moveToward moves toward the closest matching object instance", () => {
    const project: ProjectV1 = {
      version: 1,
      metadata: {
        id: "project-move-toward-nearest",
        name: "Move toward nearest target",
        locale: "ca",
        createdAtIso: new Date().toISOString()
      },
      resources: { sprites: [], sounds: [] },
      variables: { global: [], objectByObjectId: {} },
      objects: [
        {
          id: "object-seeker",
          name: "Seeker",
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
              keyboardMode: null,
              targetObjectId: null,
              intervalMs: null,
              items: [
                {
                  id: "item-move-toward",
                  type: "action",
                  action: {
                    id: "action-move-toward",
                    type: "moveToward",
                    targetType: "object",
                    targetObjectId: "object-target",
                    speed: 2
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
            { id: "instance-seeker", objectId: "object-seeker", x: 0, y: 0 },
            { id: "instance-near", objectId: "object-target", x: 5, y: 0 },
            { id: "instance-far", objectId: "object-target", x: 30, y: 0 }
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

    const result = runRuntimeTick(project, "room-main", new Set(), createInitialRuntimeState(project))
    const seeker = result.project.rooms[0]?.instances.find((entry) => entry.id === "instance-seeker")
    expect(seeker?.x).toBeCloseTo(2)
    expect(seeker?.y).toBeCloseTo(0)
  })

  it("moveToward moves toward mouse coordinates", () => {
    const project: ProjectV1 = {
      version: 1,
      metadata: {
        id: "project-move-toward-mouse",
        name: "Move toward mouse",
        locale: "ca",
        createdAtIso: new Date().toISOString()
      },
      resources: { sprites: [], sounds: [] },
      variables: { global: [], objectByObjectId: {} },
      objects: [
        {
          id: "object-seeker",
          name: "Seeker",
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
              keyboardMode: null,
              targetObjectId: null,
              intervalMs: null,
              items: [
                {
                  id: "item-move-toward-mouse",
                  type: "action",
                  action: {
                    id: "action-move-toward-mouse",
                    type: "moveToward",
                    targetType: "mouse",
                    targetObjectId: null,
                    speed: 3
                  }
                }
              ]
            }
          ]
        }
      ],
      rooms: [{ id: "room-main", name: "Main", instances: [{ id: "instance-seeker", objectId: "object-seeker", x: 0, y: 0 }] }],
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

    const result = runRuntimeTick(
      project,
      "room-main",
      new Set(),
      createInitialRuntimeState(project),
      new Set(),
      {
        x: 12,
        y: 0,
        moved: true,
        pressedButtons: new Set(),
        justPressedButtons: new Set()
      }
    )
    const seeker = result.project.rooms[0]?.instances.find((entry) => entry.id === "instance-seeker")
    expect(seeker?.x).toBeCloseTo(3)
    expect(seeker?.y).toBeCloseTo(0)
  })

  it("moveToward does nothing when no matching target instance exists", () => {
    const project: ProjectV1 = {
      version: 1,
      metadata: {
        id: "project-move-toward-missing-target",
        name: "Move toward missing target",
        locale: "ca",
        createdAtIso: new Date().toISOString()
      },
      resources: { sprites: [], sounds: [] },
      variables: { global: [], objectByObjectId: {} },
      objects: [
        {
          id: "object-seeker",
          name: "Seeker",
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
              keyboardMode: null,
              targetObjectId: null,
              intervalMs: null,
              items: [
                {
                  id: "item-move-toward",
                  type: "action",
                  action: {
                    id: "action-move-toward",
                    type: "moveToward",
                    targetType: "object",
                    targetObjectId: "object-target",
                    speed: 5
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
      rooms: [{ id: "room-main", name: "Main", instances: [{ id: "instance-seeker", objectId: "object-seeker", x: 7, y: 9 }] }],
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
    const seeker = result.project.rooms[0]?.instances.find((entry) => entry.id === "instance-seeker")
    expect(seeker?.x).toBe(7)
    expect(seeker?.y).toBe(9)
  })

  it("moveToward does nothing when speed is zero", () => {
    const project: ProjectV1 = {
      version: 1,
      metadata: {
        id: "project-move-toward-zero-speed",
        name: "Move toward zero speed",
        locale: "ca",
        createdAtIso: new Date().toISOString()
      },
      resources: { sprites: [], sounds: [] },
      variables: { global: [], objectByObjectId: {} },
      objects: [
        {
          id: "object-seeker",
          name: "Seeker",
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
              keyboardMode: null,
              targetObjectId: null,
              intervalMs: null,
              items: [
                {
                  id: "item-move-toward",
                  type: "action",
                  action: {
                    id: "action-move-toward",
                    type: "moveToward",
                    targetType: "object",
                    targetObjectId: "object-target",
                    speed: 0
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
            { id: "instance-seeker", objectId: "object-seeker", x: 2, y: 2 },
            { id: "instance-target", objectId: "object-target", x: 8, y: 2 }
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

    const result = runRuntimeTick(project, "room-main", new Set(), createInitialRuntimeState(project))
    const seeker = result.project.rooms[0]?.instances.find((entry) => entry.id === "instance-seeker")
    expect(seeker?.x).toBe(2)
    expect(seeker?.y).toBe(2)
  })

  it("moveToward ignores object target mode when targetObjectId is null", () => {
    const project: ProjectV1 = {
      version: 1,
      metadata: {
        id: "project-move-toward-null-target",
        name: "Move toward null object target",
        locale: "ca",
        createdAtIso: new Date().toISOString()
      },
      resources: { sprites: [], sounds: [] },
      variables: { global: [], objectByObjectId: {} },
      objects: [
        {
          id: "object-seeker",
          name: "Seeker",
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
              keyboardMode: null,
              targetObjectId: null,
              intervalMs: null,
              items: [
                {
                  id: "item-move-toward",
                  type: "action",
                  action: {
                    id: "action-move-toward",
                    type: "moveToward",
                    targetType: "object",
                    targetObjectId: null,
                    speed: 4
                  }
                }
              ]
            }
          ]
        }
      ],
      rooms: [{ id: "room-main", name: "Main", instances: [{ id: "instance-seeker", objectId: "object-seeker", x: 5, y: 6 }] }],
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
    const seeker = result.project.rooms[0]?.instances.find((entry) => entry.id === "instance-seeker")
    expect(seeker?.x).toBe(5)
    expect(seeker?.y).toBe(6)
  })

  it("clamps move to the solid border when target position collides", () => {
    const project: ProjectV1 = {
      version: 1,
      metadata: {
        id: "project-solid-blocks-move",
        name: "Solid blocks move",
        locale: "ca",
        createdAtIso: new Date().toISOString()
      },
      resources: { sprites: [], sounds: [] },
      variables: { global: [], objectByObjectId: {} },
      objects: [
        {
          id: "object-mover",
          name: "Mover",
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
              keyboardMode: null,
              targetObjectId: null,
              intervalMs: null,
              items: [{ id: "item-move", type: "action", action: { id: "action-move", type: "move", dx: 7, dy: 0 } }]
            }
          ]
        },
        {
          id: "object-wall",
          name: "Wall",
          spriteId: null,
          x: 0,
          y: 0,
          speed: 0,
          direction: 0,
          solid: true,
          events: []
        }
      ],
      rooms: [
        {
          id: "room-main",
          name: "Main",
          instances: [
            { id: "instance-mover", objectId: "object-mover", x: 0, y: 0 },
            { id: "instance-wall", objectId: "object-wall", x: 37, y: 0 }
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

    const result = runRuntimeTick(project, "room-main", new Set(), createInitialRuntimeState(project))
    const mover = result.project.rooms[0]?.instances.find((entry) => entry.id === "instance-mover")
    expect(mover?.x).toBe(5)
    expect(mover?.y).toBe(0)
  })

  it("allows move through non-solid objects", () => {
    const project: ProjectV1 = {
      version: 1,
      metadata: {
        id: "project-nonsolid-allows-move",
        name: "Non solid allows move",
        locale: "ca",
        createdAtIso: new Date().toISOString()
      },
      resources: { sprites: [], sounds: [] },
      variables: { global: [], objectByObjectId: {} },
      objects: [
        {
          id: "object-mover",
          name: "Mover",
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
              keyboardMode: null,
              targetObjectId: null,
              intervalMs: null,
              items: [{ id: "item-move", type: "action", action: { id: "action-move", type: "move", dx: 4, dy: 0 } }]
            }
          ]
        },
        {
          id: "object-ghost",
          name: "Ghost",
          spriteId: null,
          x: 0,
          y: 0,
          speed: 0,
          direction: 0,
          solid: false,
          events: []
        }
      ],
      rooms: [
        {
          id: "room-main",
          name: "Main",
          instances: [
            { id: "instance-mover", objectId: "object-mover", x: 0, y: 0 },
            { id: "instance-ghost", objectId: "object-ghost", x: 32, y: 0 }
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

    const result = runRuntimeTick(project, "room-main", new Set(), createInitialRuntimeState(project))
    const mover = result.project.rooms[0]?.instances.find((entry) => entry.id === "instance-mover")
    expect(mover?.x).toBe(4)
    expect(mover?.y).toBe(0)
  })

  it("clamps setVelocity to the solid border when motion would collide", () => {
    const project: ProjectV1 = {
      version: 1,
      metadata: {
        id: "project-solid-blocks-set-velocity",
        name: "Solid blocks set velocity",
        locale: "ca",
        createdAtIso: new Date().toISOString()
      },
      resources: { sprites: [], sounds: [] },
      variables: { global: [], objectByObjectId: {} },
      objects: [
        {
          id: "object-mover",
          name: "Mover",
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
              keyboardMode: null,
              targetObjectId: null,
              intervalMs: null,
              items: [
                {
                  id: "item-velocity",
                  type: "action",
                  action: { id: "action-velocity", type: "setVelocity", speed: 7, direction: 0 }
                }
              ]
            }
          ]
        },
        {
          id: "object-wall",
          name: "Wall",
          spriteId: null,
          x: 0,
          y: 0,
          speed: 0,
          direction: 0,
          solid: true,
          events: []
        }
      ],
      rooms: [
        {
          id: "room-main",
          name: "Main",
          instances: [
            { id: "instance-mover", objectId: "object-mover", x: 0, y: 0 },
            { id: "instance-wall", objectId: "object-wall", x: 37, y: 0 }
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

    const result = runRuntimeTick(project, "room-main", new Set(), createInitialRuntimeState(project))
    const mover = result.project.rooms[0]?.instances.find((entry) => entry.id === "instance-mover")
    expect(mover?.x).toBe(5)
    expect(mover?.y).toBe(0)
  })

  it("clamps moveToward to the solid border when motion would collide", () => {
    const project: ProjectV1 = {
      version: 1,
      metadata: {
        id: "project-solid-blocks-move-toward",
        name: "Solid blocks move toward",
        locale: "ca",
        createdAtIso: new Date().toISOString()
      },
      resources: { sprites: [], sounds: [] },
      variables: { global: [], objectByObjectId: {} },
      objects: [
        {
          id: "object-seeker",
          name: "Seeker",
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
              keyboardMode: null,
              targetObjectId: null,
              intervalMs: null,
              items: [
                {
                  id: "item-move-toward",
                  type: "action",
                  action: {
                    id: "action-move-toward",
                    type: "moveToward",
                    targetType: "object",
                    targetObjectId: "object-wall",
                    speed: 7
                  }
                }
              ]
            }
          ]
        },
        {
          id: "object-wall",
          name: "Wall",
          spriteId: null,
          x: 0,
          y: 0,
          speed: 0,
          direction: 0,
          solid: true,
          events: []
        }
      ],
      rooms: [
        {
          id: "room-main",
          name: "Main",
          instances: [
            { id: "instance-seeker", objectId: "object-seeker", x: 0, y: 0 },
            { id: "instance-wall", objectId: "object-wall", x: 37, y: 0 }
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

    const result = runRuntimeTick(project, "room-main", new Set(), createInitialRuntimeState(project))
    const seeker = result.project.rooms[0]?.instances.find((entry) => entry.id === "instance-seeker")
    expect(seeker?.x).toBe(5)
    expect(seeker?.y).toBe(0)
  })

  it("rotate/set assigns an absolute rotation value", () => {
    const project: ProjectV1 = {
      version: 1,
      metadata: {
        id: "project-rotate-set",
        name: "Rotate set test",
        locale: "ca",
        createdAtIso: new Date().toISOString()
      },
      resources: { sprites: [], sounds: [] },
      variables: { global: [], objectByObjectId: {} },
      objects: [
        {
          id: "object-spinner",
          name: "Spinner",
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
              keyboardMode: null,
              targetObjectId: null,
              intervalMs: null,
              items: [
                {
                  id: "item-rotate-set",
                  type: "action",
                  action: { id: "action-rotate-set", type: "rotate", angle: 45, mode: "set" }
                }
              ]
            }
          ]
        }
      ],
      rooms: [{ id: "room-main", name: "Main", instances: [{ id: "instance-spinner", objectId: "object-spinner", x: 0, y: 0 }] }],
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
    const spinner = result.project.rooms[0]?.instances.find((entry) => entry.id === "instance-spinner")
    expect(spinner?.rotation).toBe(45)
  })

  it("rotate/add increments existing rotation value", () => {
    const project: ProjectV1 = {
      version: 1,
      metadata: {
        id: "project-rotate-add",
        name: "Rotate add test",
        locale: "ca",
        createdAtIso: new Date().toISOString()
      },
      resources: { sprites: [], sounds: [] },
      variables: { global: [], objectByObjectId: {} },
      objects: [
        {
          id: "object-spinner",
          name: "Spinner",
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
              keyboardMode: null,
              targetObjectId: null,
              intervalMs: null,
              items: [
                {
                  id: "item-rotate-add",
                  type: "action",
                  action: { id: "action-rotate-add", type: "rotate", angle: 15, mode: "add" }
                }
              ]
            }
          ]
        }
      ],
      rooms: [
        { id: "room-main", name: "Main", instances: [{ id: "instance-spinner", objectId: "object-spinner", x: 0, y: 0, rotation: 30 }] }
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

    const result = runRuntimeTick(project, "room-main", new Set(), createInitialRuntimeState(project))
    const spinner = result.project.rooms[0]?.instances.find((entry) => entry.id === "instance-spinner")
    expect(spinner?.rotation).toBe(45)
  })

  it("spawnObject initializes spawned instances with rotation 0", () => {
    const project: ProjectV1 = {
      version: 1,
      metadata: {
        id: "project-spawn-rotation",
        name: "Spawn rotation test",
        locale: "ca",
        createdAtIso: new Date().toISOString()
      },
      resources: { sprites: [], sounds: [] },
      variables: { global: [], objectByObjectId: {} },
      objects: [
        {
          id: "object-spawner",
          name: "Spawner",
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
              keyboardMode: null,
              targetObjectId: null,
              intervalMs: null,
              items: [
                {
                  id: "item-spawn",
                  type: "action",
                  action: {
                    id: "action-spawn",
                    type: "spawnObject",
                    objectId: "object-target",
                    offsetX: 10,
                    offsetY: 0
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
      rooms: [{ id: "room-main", name: "Main", instances: [{ id: "instance-spawner", objectId: "object-spawner", x: 0, y: 0 }] }],
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
    const spawned = result.project.rooms[0]?.instances.find((entry) => entry.id !== "instance-spawner")
    expect(spawned).toBeDefined()
    expect(spawned?.rotation).toBe(0)
  })

  it("spawnObject with positionMode 'absolute' uses world coordinates", () => {
    const project: ProjectV1 = {
      version: 1,
      metadata: {
        id: "project-spawn-absolute",
        name: "Spawn absolute test",
        locale: "ca",
        createdAtIso: new Date().toISOString()
      },
      resources: { sprites: [], sounds: [] },
      variables: { global: [], objectByObjectId: {} },
      objects: [
        {
          id: "object-spawner",
          name: "Spawner",
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
              keyboardMode: null,
              targetObjectId: null,
              intervalMs: null,
              items: [
                {
                  id: "item-spawn",
                  type: "action",
                  action: {
                    id: "action-spawn",
                    type: "spawnObject",
                    objectId: "object-target",
                    offsetX: 200,
                    offsetY: 300,
                    positionMode: "absolute"
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
      rooms: [{ id: "room-main", name: "Main", instances: [{ id: "instance-spawner", objectId: "object-spawner", x: 50, y: 75 }] }],
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
    const spawned = result.project.rooms[0]?.instances.find((entry) => entry.id !== "instance-spawner")
    expect(spawned).toBeDefined()
    expect(spawned?.x).toBe(200)
    expect(spawned?.y).toBe(300)
  })

  it("spawnObject without positionMode defaults to relative from center", () => {
    const project: ProjectV1 = {
      version: 1,
      metadata: {
        id: "project-spawn-relative-default",
        name: "Spawn relative default test",
        locale: "ca",
        createdAtIso: new Date().toISOString()
      },
      resources: { sprites: [], sounds: [] },
      variables: { global: [], objectByObjectId: {} },
      objects: [
        {
          id: "object-spawner",
          name: "Spawner",
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
              keyboardMode: null,
              targetObjectId: null,
              intervalMs: null,
              items: [
                {
                  id: "item-spawn",
                  type: "action",
                  action: {
                    id: "action-spawn",
                    type: "spawnObject",
                    objectId: "object-target",
                    offsetX: 10,
                    offsetY: 20
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
      rooms: [{ id: "room-main", name: "Main", instances: [{ id: "instance-spawner", objectId: "object-spawner", x: 50, y: 75 }] }],
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

    // Spawner at (50,75) with default 32x32 → center at (66,91). Offset (10,20) → (76,111)
    const result = runRuntimeTick(project, "room-main", new Set(), createInitialRuntimeState(project))
    const spawned = result.project.rooms[0]?.instances.find((entry) => entry.id !== "instance-spawner")
    expect(spawned).toBeDefined()
    expect(spawned?.x).toBe(76)
    expect(spawned?.y).toBe(111)
  })

  it("rotate/add treats missing rotation as zero (backward compatibility)", () => {
    const project: ProjectV1 = {
      version: 1,
      metadata: {
        id: "project-rotate-backward-compat",
        name: "Rotate backward compatibility test",
        locale: "ca",
        createdAtIso: new Date().toISOString()
      },
      resources: { sprites: [], sounds: [] },
      variables: { global: [], objectByObjectId: {} },
      objects: [
        {
          id: "object-spinner",
          name: "Spinner",
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
              keyboardMode: null,
              targetObjectId: null,
              intervalMs: null,
              items: [
                {
                  id: "item-rotate-add-backcompat",
                  type: "action",
                  action: { id: "action-rotate-add-backcompat", type: "rotate", angle: 20, mode: "add" }
                }
              ]
            }
          ]
        }
      ],
      rooms: [{ id: "room-main", name: "Main", instances: [{ id: "instance-spinner", objectId: "object-spinner", x: 0, y: 0 }] }],
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
    const spinner = result.project.rooms[0]?.instances.find((entry) => entry.id === "instance-spinner")
    expect(spinner?.rotation).toBe(20)
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

  it("wait action delays following actions until duration is reached", () => {
    const project: ProjectV1 = {
      version: 1,
      metadata: {
        id: "project-wait-delay",
        name: "Wait delay test",
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
          id: "object-waiter",
          name: "Waiter",
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
              keyboardMode: null,
              targetObjectId: null,
              intervalMs: null,
              items: [
                {
                  id: "item-wait",
                  type: "action",
                  action: { id: "action-wait", type: "wait", durationMs: 200 }
                },
                {
                  id: "item-score",
                  type: "action",
                  action: { id: "action-score", type: "changeScore", delta: 1 }
                }
              ]
            }
          ]
        }
      ],
      rooms: [{ id: "room-main", name: "Main", instances: [{ id: "instance-a", objectId: "object-waiter", x: 0, y: 0 }] }],
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

    let runtime = createInitialRuntimeState(project)
    runtime = runRuntimeTick(project, "room-main", new Set(), runtime).runtime
    expect(runtime.score).toBe(0)
    runtime = runRuntimeTick(project, "room-main", new Set(), runtime).runtime
    expect(runtime.score).toBe(0)
    runtime = runRuntimeTick(project, "room-main", new Set(), runtime).runtime
    expect(runtime.score).toBe(1)
  })

  it("wait action blocks later actions but keeps earlier actions running", () => {
    const project: ProjectV1 = {
      version: 1,
      metadata: {
        id: "project-wait-order",
        name: "Wait ordering test",
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
          id: "object-flow",
          name: "Flow",
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
              keyboardMode: null,
              targetObjectId: null,
              intervalMs: null,
              items: [
                {
                  id: "item-before",
                  type: "action",
                  action: { id: "action-before", type: "changeScore", delta: 1 }
                },
                {
                  id: "item-wait",
                  type: "action",
                  action: { id: "action-wait", type: "wait", durationMs: 200 }
                },
                {
                  id: "item-after",
                  type: "action",
                  action: { id: "action-after", type: "changeScore", delta: 5 }
                }
              ]
            }
          ]
        }
      ],
      rooms: [{ id: "room-main", name: "Main", instances: [{ id: "instance-a", objectId: "object-flow", x: 0, y: 0 }] }],
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

    let runtime = createInitialRuntimeState(project)
    runtime = runRuntimeTick(project, "room-main", new Set(), runtime).runtime
    expect(runtime.score).toBe(1)
    runtime = runRuntimeTick(project, "room-main", new Set(), runtime).runtime
    expect(runtime.score).toBe(2)
    runtime = runRuntimeTick(project, "room-main", new Set(), runtime).runtime
    expect(runtime.score).toBe(8)
  })

  it("shows runtime message toast when message action is executed", () => {
    const project: ProjectV1 = {
      version: 1,
      metadata: {
        id: "project-message-toast",
        name: "Message toast test",
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
          id: "object-speaker",
          name: "Speaker",
          spriteId: null,
          x: 0,
          y: 0,
          speed: 0,
          direction: 0,
          events: [
            {
              id: "event-create",
              type: "Create",
              key: null,
              keyboardMode: null,
              targetObjectId: null,
              intervalMs: null,
              items: [
                {
                  id: "item-message",
                  type: "action",
                  action: { id: "action-message", type: "message", text: "Benvingut!", durationMs: 160 }
                }
              ]
            }
          ]
        }
      ],
      rooms: [{ id: "room-main", name: "Main", instances: [{ id: "instance-speaker", objectId: "object-speaker", x: 0, y: 0 }] }],
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
    expect(firstTick.runtime.activeToast?.text ?? "").toBe("Benvingut!")
  })

  it("clears runtime message after duration elapsed", () => {
    const project: ProjectV1 = {
      version: 1,
      metadata: {
        id: "project-message-expire",
        name: "Message expiration test",
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
          id: "object-speaker",
          name: "Speaker",
          spriteId: null,
          x: 0,
          y: 0,
          speed: 0,
          direction: 0,
          events: [
            {
              id: "event-create",
              type: "Create",
              key: null,
              keyboardMode: null,
              targetObjectId: null,
              intervalMs: null,
              items: [
                {
                  id: "item-message",
                  type: "action",
                  action: { id: "action-message", type: "message", text: "Curt", durationMs: 160 }
                }
              ]
            }
          ]
        }
      ],
      rooms: [{ id: "room-main", name: "Main", instances: [{ id: "instance-speaker", objectId: "object-speaker", x: 0, y: 0 }] }],
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
    const thirdTick = runRuntimeTick(secondTick.project, "room-main", new Set(), secondTick.runtime)

    expect(firstTick.runtime.activeToast?.text ?? "").toBe("Curt")
    expect(secondTick.runtime.activeToast?.text ?? "").toBe("Curt")
    expect(thirdTick.runtime.activeToast?.text ?? "").toBe("")
  })

  it("queues multiple message actions and shows them in order", () => {
    const project: ProjectV1 = {
      version: 1,
      metadata: {
        id: "project-message-queue",
        name: "Message queue test",
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
          id: "object-speaker",
          name: "Speaker",
          spriteId: null,
          x: 0,
          y: 0,
          speed: 0,
          direction: 0,
          events: [
            {
              id: "event-create",
              type: "Create",
              key: null,
              keyboardMode: null,
              targetObjectId: null,
              intervalMs: null,
              items: [
                {
                  id: "item-message-a",
                  type: "action",
                  action: { id: "action-message-a", type: "message", text: "Primer", durationMs: 160 }
                },
                {
                  id: "item-message-b",
                  type: "action",
                  action: { id: "action-message-b", type: "message", text: "Segon", durationMs: 160 }
                }
              ]
            }
          ]
        }
      ],
      rooms: [{ id: "room-main", name: "Main", instances: [{ id: "instance-speaker", objectId: "object-speaker", x: 0, y: 0 }] }],
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
    const thirdTick = runRuntimeTick(secondTick.project, "room-main", new Set(), secondTick.runtime)
    const fourthTick = runRuntimeTick(thirdTick.project, "room-main", new Set(), thirdTick.runtime)
    const fifthTick = runRuntimeTick(fourthTick.project, "room-main", new Set(), fourthTick.runtime)

    expect(firstTick.runtime.activeToast?.text ?? "").toBe("Primer")
    expect(secondTick.runtime.activeToast?.text ?? "").toBe("Primer")
    expect(thirdTick.runtime.activeToast?.text ?? "").toBe("Segon")
    expect(fourthTick.runtime.activeToast?.text ?? "").toBe("Segon")
    expect(fifthTick.runtime.activeToast?.text ?? "").toBe("")
  })

  it("continues a locked collision event until completion even if objects stop colliding", () => {
    const project: ProjectV1 = {
      version: 1,
      metadata: {
        id: "project-collision-lock-continuation",
        name: "Collision lock continuation test",
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
                  id: "item-wait",
                  type: "action",
                  action: { id: "action-wait", type: "wait", durationMs: 200 }
                },
                {
                  id: "item-score",
                  type: "action",
                  action: { id: "action-score", type: "changeScore", delta: 5 }
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
            { id: "instance-source", objectId: "object-source", x: 20, y: 20 },
            { id: "instance-target", objectId: "object-target", x: 20, y: 20 }
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

    const first = runRuntimeTick(project, "room-main", new Set(), createInitialRuntimeState(project))
    expect(first.runtime.score).toBe(0)
    expect(Object.keys(first.runtime.eventLocksByKey)).toHaveLength(1)

    const separatedProject = updateRoomInstances(first.project, "room-main", (instances) =>
      instances.map((instanceEntry) =>
        instanceEntry.id === "instance-target" ? { ...instanceEntry, x: 400, y: 200 } : instanceEntry
      )
    )

    const second = runRuntimeTick(separatedProject, "room-main", new Set(), first.runtime)
    expect(second.runtime.score).toBe(0)
    expect(Object.keys(second.runtime.eventLocksByKey)).toHaveLength(1)

    const third = runRuntimeTick(second.project, "room-main", new Set(), second.runtime)
    expect(third.runtime.score).toBe(5)
    expect(Object.keys(third.runtime.eventLocksByKey)).toHaveLength(0)
  })

  it("keeps collision locks independent per target instance", () => {
    const project: ProjectV1 = {
      version: 1,
      metadata: {
        id: "project-collision-lock-per-target",
        name: "Collision lock per target test",
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
              targetObjectId: null,
              intervalMs: null,
              items: [
                {
                  id: "item-wait",
                  type: "action",
                  action: { id: "action-wait", type: "wait", durationMs: 200 }
                },
                {
                  id: "item-score",
                  type: "action",
                  action: { id: "action-score", type: "changeScore", delta: 1 }
                }
              ]
            }
          ]
        },
        { id: "object-target", name: "Target", spriteId: null, x: 0, y: 0, speed: 0, direction: 0, events: [] }
      ],
      rooms: [
        {
          id: "room-main",
          name: "Main",
          instances: [
            { id: "instance-source", objectId: "object-source", x: 20, y: 20 },
            { id: "instance-target-a", objectId: "object-target", x: 20, y: 20 },
            { id: "instance-target-b", objectId: "object-target", x: 320, y: 200 }
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

    const first = runRuntimeTick(project, "room-main", new Set(), createInitialRuntimeState(project))
    expect(Object.keys(first.runtime.eventLocksByKey)).toHaveLength(1)
    expect(first.runtime.score).toBe(0)

    const moveToSecondTarget = updateRoomInstances(first.project, "room-main", (instances) =>
      instances.map((instanceEntry) =>
        instanceEntry.id === "instance-source" ? { ...instanceEntry, x: 320, y: 200 } : instanceEntry
      )
    )

    const second = runRuntimeTick(moveToSecondTarget, "room-main", new Set(), first.runtime)
    expect(Object.keys(second.runtime.eventLocksByKey)).toHaveLength(2)
    expect(second.runtime.score).toBe(0)

    const third = runRuntimeTick(second.project, "room-main", new Set(), second.runtime)
    const fourth = runRuntimeTick(third.project, "room-main", new Set(), third.runtime)
    expect(fourth.runtime.score).toBe(2)
    expect(Object.keys(fourth.runtime.eventLocksByKey)).toHaveLength(1)
  })

  it("cleans collision lock when target instance is destroyed", () => {
    const project: ProjectV1 = {
      version: 1,
      metadata: {
        id: "project-collision-lock-cleanup",
        name: "Collision lock cleanup test",
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
          id: "object-source",
          name: "Source",
          spriteId: null,
          x: 0,
          y: 0,
          speed: 0,
          direction: 0,
          events: [
            {
              id: "event-source-collision",
              type: "Collision",
              key: null,
              targetObjectId: "object-target",
              intervalMs: null,
              items: [
                {
                  id: "item-wait",
                  type: "action",
                  action: { id: "action-wait", type: "wait", durationMs: 200 }
                },
                {
                  id: "item-score",
                  type: "action",
                  action: { id: "action-score", type: "changeScore", delta: 5 }
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
          events: [
            {
              id: "event-target-collision",
              type: "Collision",
              key: null,
              targetObjectId: "object-source",
              intervalMs: null,
              items: [
                {
                  id: "item-destroy-self",
                  type: "action",
                  action: { id: "action-destroy-self", type: "destroySelf" }
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
          instances: [
            { id: "instance-source", objectId: "object-source", x: 20, y: 20 },
            { id: "instance-target", objectId: "object-target", x: 20, y: 20 }
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

    const first = runRuntimeTick(project, "room-main", new Set(), createInitialRuntimeState(project))
    expect(first.runtime.score).toBe(0)
    expect(Object.keys(first.runtime.eventLocksByKey)).toHaveLength(0)

    const second = runRuntimeTick(first.project, "room-main", new Set(), first.runtime)
    expect(second.runtime.score).toBe(0)
    expect(Object.keys(second.runtime.eventLocksByKey)).toHaveLength(0)
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
                  action: { id: "a1", type: "changeVariable", scope: "global", variableId: "gv-number", operator: "add", value: 3 }
                },
                {
                  id: "item-a2",
                  type: "action",
                  action: { id: "a2", type: "changeVariable", scope: "global", variableId: "gv-number", operator: "subtract", value: 1 }
                },
                {
                  id: "item-a3",
                  type: "action",
                  action: { id: "a3", type: "changeVariable", scope: "global", variableId: "gv-number", operator: "multiply", value: 5 }
                },
                {
                  id: "item-a4",
                  type: "action",
                  action: { id: "a4", type: "changeVariable", scope: "global", variableId: "gv-string", operator: "add", value: 9 }
                },
                {
                  id: "item-a5",
                  type: "action",
                  action: {
                    id: "a5",
                    type: "changeVariable",
                    scope: "object",
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
                    type: "changeVariable",
                    scope: "object",
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
                    type: "changeVariable",
                    scope: "object",
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
                    type: "changeVariable",
                    scope: "object",
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

  it("resolves value sources in changeVariable actions", () => {
    const project: ProjectV1 = {
      version: 1,
      metadata: {
        id: "project-value-source-change-variable",
        name: "Value source change variable test",
        locale: "ca",
        createdAtIso: new Date().toISOString()
      },
      resources: {
        sprites: [],
        sounds: []
      },
      variables: {
        global: [
          { id: "gv-in", name: "in", type: "number", initialValue: 7 },
          { id: "gv-out", name: "out", type: "number", initialValue: 0 }
        ],
        objectByObjectId: {
          "object-calc": [
            { id: "ov-in", name: "inObject", type: "number", initialValue: 5 },
            { id: "ov-out", name: "outObject", type: "number", initialValue: 0 }
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
                  action: {
                    id: "a1",
                    type: "changeVariable",
                    scope: "global",
                    variableId: "gv-out",
                    operator: "set",
                    value: { source: "globalVariable", variableId: "gv-in" }
                  }
                },
                {
                  id: "item-a2",
                  type: "action",
                  action: {
                    id: "a2",
                    type: "changeVariable",
                    scope: "object",
                    variableId: "ov-out",
                    operator: "set",
                    target: "self",
                    targetInstanceId: null,
                    value: { source: "attribute", target: "self", attribute: "x" }
                  }
                },
                {
                  id: "item-a3",
                  type: "action",
                  action: {
                    id: "a3",
                    type: "changeVariable",
                    scope: "object",
                    variableId: "ov-out",
                    operator: "add",
                    target: "self",
                    targetInstanceId: null,
                    value: { source: "internalVariable", target: "self", variableId: "ov-in" }
                  }
                }
              ]
            }
          ]
        }
      ],
      rooms: [{ id: "room-main", name: "Main", instances: [{ id: "instance-calc", objectId: "object-calc", x: 12, y: 4 }] }],
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
    expect(result.runtime.globalVariables["gv-out"]).toBe(7)
    expect(result.runtime.objectInstanceVariables["instance-calc"]?.["ov-out"]).toBe(17)
  })

  it("supports instanceCount attribute for self and other targets", () => {
    const project: ProjectV1 = {
      version: 1,
      metadata: {
        id: "project-instance-count-attribute",
        name: "Instance count attribute test",
        locale: "ca",
        createdAtIso: new Date().toISOString()
      },
      resources: {
        sprites: [],
        sounds: []
      },
      variables: {
        global: [
          { id: "gv-self-count", name: "selfCount", type: "number", initialValue: 0 },
          { id: "gv-other-count", name: "otherCount", type: "number", initialValue: 0 }
        ],
        objectByObjectId: {}
      },
      objects: [
        {
          id: "object-main",
          name: "Main",
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
                  id: "item-step-self-count",
                  type: "action",
                  action: {
                    id: "a-step-self-count",
                    type: "changeVariable",
                    scope: "global",
                    variableId: "gv-self-count",
                    operator: "set",
                    value: { source: "attribute", target: "self", attribute: "instanceCount" }
                  }
                }
              ]
            },
            {
              id: "event-collision",
              type: "Collision",
              key: null,
              targetObjectId: "object-other",
              intervalMs: null,
              items: [
                {
                  id: "item-collision-other-count",
                  type: "action",
                  action: {
                    id: "a-collision-other-count",
                    type: "changeVariable",
                    scope: "global",
                    variableId: "gv-other-count",
                    operator: "set",
                    value: { source: "attribute", target: "other", attribute: "instanceCount" }
                  }
                }
              ]
            }
          ]
        },
        {
          id: "object-other",
          name: "Other",
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
            { id: "instance-main-1", objectId: "object-main", x: 0, y: 0 },
            { id: "instance-main-2", objectId: "object-main", x: 100, y: 100 },
            { id: "instance-other-1", objectId: "object-other", x: 0, y: 0 },
            { id: "instance-other-2", objectId: "object-other", x: 50, y: 50 },
            { id: "instance-other-3", objectId: "object-other", x: 200, y: 200 }
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

    const result = runRuntimeTick(project, "room-main", new Set(), createInitialRuntimeState(project))

    expect(result.runtime.globalVariables["gv-self-count"]).toBe(2)
    expect(result.runtime.globalVariables["gv-other-count"]).toBe(3)
  })

  it("supports random value source with custom step", () => {
    const originalRandom = Math.random
    Math.random = () => 0.95
    try {
      const project: ProjectV1 = {
        version: 1,
        metadata: {
          id: "project-random-source-step",
          name: "Random source step test",
          locale: "ca",
          createdAtIso: new Date().toISOString()
        },
        resources: {
          sprites: [],
          sounds: []
        },
        variables: {
          global: [{ id: "gv-value", name: "value", type: "number", initialValue: 0 }],
          objectByObjectId: {}
        },
        objects: [
          {
            id: "object-runner",
            name: "Runner",
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
                    action: {
                      id: "a1",
                      type: "changeVariable",
                      scope: "global",
                      variableId: "gv-value",
                      operator: "set",
                      value: { source: "random", min: 2, max: 8, step: 3 }
                    }
                  }
                ]
              }
            ]
          }
        ],
        rooms: [{ id: "room-main", name: "Main", instances: [{ id: "instance-runner", objectId: "object-runner", x: 0, y: 0 }] }],
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
      expect(result.runtime.globalVariables["gv-value"]).toBe(8)
    } finally {
      Math.random = originalRandom
    }
  })

  it("uses value sources in if conditions and keeps other-only refs collision-scoped", () => {
    const project: ProjectV1 = {
      version: 1,
      metadata: {
        id: "project-value-source-if",
        name: "Value source if test",
        locale: "ca",
        createdAtIso: new Date().toISOString()
      },
      resources: {
        sprites: [],
        sounds: []
      },
      variables: {
        global: [
          { id: "gv-left", name: "left", type: "number", initialValue: 10 },
          { id: "gv-right", name: "right", type: "number", initialValue: 10 },
          { id: "gv-collision", name: "collision", type: "number", initialValue: 0 }
        ],
        objectByObjectId: {
          "object-main": [{ id: "ov-main", name: "mainVal", type: "number", initialValue: 2 }],
          "object-other": [{ id: "ov-other", name: "otherVal", type: "number", initialValue: 5 }]
        }
      },
      objects: [
        {
          id: "object-main",
          name: "Main",
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
                  id: "item-if-step",
                  type: "if",
                  condition: {
                    left: { source: "globalVariable", variableId: "gv-left" },
                    operator: "==",
                    right: { source: "globalVariable", variableId: "gv-right" }
                  },
                  thenActions: [{ id: "item-score", type: "action", action: { id: "a-score", type: "changeScore", delta: 1 } }],
                  elseActions: []
                },
                {
                  id: "item-if-step-attribute",
                  type: "if",
                  condition: {
                    left: { source: "attribute", target: "self", attribute: "x" },
                    operator: "==",
                    right: 0
                  },
                  thenActions: [{ id: "item-score-attribute", type: "action", action: { id: "a-score-attribute", type: "changeScore", delta: 1 } }],
                  elseActions: []
                }
              ]
            },
            {
              id: "event-collision",
              type: "Collision",
              key: null,
              targetObjectId: "object-other",
              intervalMs: null,
              items: [
                {
                  id: "item-if-collision",
                  type: "if",
                  condition: {
                    left: { source: "internalVariable", target: "self", variableId: "ov-main" },
                    operator: "==",
                    right: { source: "internalVariable", target: "other", variableId: "ov-other" }
                  },
                  thenActions: [
                    {
                      id: "item-col-a1",
                      type: "action",
                      action: {
                        id: "a-col-1",
                        type: "changeVariable",
                        scope: "global",
                        variableId: "gv-collision",
                        operator: "set",
                        value: 1
                      }
                    }
                  ],
                  elseActions: []
                }
              ]
            }
          ]
        },
        {
          id: "object-other",
          name: "Other",
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
            { id: "instance-main", objectId: "object-main", x: 0, y: 0 },
            { id: "instance-other", objectId: "object-other", x: 0, y: 0 }
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
    expect(firstTick.runtime.score).toBe(2)
    expect(firstTick.runtime.globalVariables["gv-collision"]).toBe(0)
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

  it("awards Switch Vault switch score only once per switch pickup", () => {
    const template = createSwitchVaultTemplateProject()
    const room = template.project.rooms.find((roomEntry) => roomEntry.id === template.roomId)
    const agentObjectId = template.project.objects.find((objectEntry) => objectEntry.name === "Agent")?.id
    const switchObjectId = template.project.objects.find((objectEntry) => objectEntry.name === "Switch")?.id
    const switchInstance = room?.instances.find((instanceEntry) => instanceEntry.objectId === switchObjectId)
    expect(agentObjectId).toBeTruthy()
    expect(switchObjectId).toBeTruthy()
    expect(switchInstance).toBeTruthy()
    if (!switchInstance) {
      throw new Error("Missing switch instance in Switch Vault")
    }

    const overlappingProject = updateRoomInstances(template.project, template.roomId, (instances) =>
      instances.map((instanceEntry) =>
        instanceEntry.objectId === agentObjectId
          ? { ...instanceEntry, x: switchInstance.x, y: switchInstance.y }
          : instanceEntry
      )
    )
    const firstTick = runRuntimeTick(overlappingProject, template.roomId, new Set(), createInitialRuntimeState(overlappingProject))
    const secondTick = runRuntimeTick(firstTick.project, template.roomId, new Set(), firstTick.runtime)

    expect(firstTick.runtime.score).toBe(25)
    expect(secondTick.runtime.score).toBe(25)
  })

  it("keeps guard movement when colliding in Switch Vault", () => {
    const template = createSwitchVaultTemplateProject()
    const vaultRoom = template.project.rooms.find((roomEntry) => roomEntry.name === "Vault")
    const agentObjectId = template.project.objects.find((objectEntry) => objectEntry.name === "Agent")?.id
    const guardObjectId = template.project.objects.find((objectEntry) => objectEntry.name === "Guard")?.id
    const firstGuard = vaultRoom?.instances.find((instanceEntry) => instanceEntry.objectId === guardObjectId)
    expect(agentObjectId).toBeTruthy()
    expect(guardObjectId).toBeTruthy()
    expect(firstGuard).toBeTruthy()
    if (!firstGuard) {
      throw new Error("Missing guard instance in Switch Vault")
    }

    if (!vaultRoom) {
      throw new Error("Missing vault room in Switch Vault")
    }

    const forcedCollisionProject = updateRoomInstances(template.project, vaultRoom.id, (instances) =>
      instances.map((instanceEntry) =>
        instanceEntry.objectId === agentObjectId ? { ...instanceEntry, x: firstGuard.x, y: firstGuard.y } : instanceEntry
      )
    )
    const result = runRuntimeTick(
      forcedCollisionProject,
      vaultRoom.id,
      new Set(),
      createInitialRuntimeState(forcedCollisionProject)
    )
    const updatedRoom = result.project.rooms.find((roomEntry) => roomEntry.id === vaultRoom.id)
    const updatedGuard = updatedRoom?.instances.find((instanceEntry) => instanceEntry.id === firstGuard.id)

    expect(updatedGuard).toBeTruthy()
    expect(updatedGuard?.x).toBeCloseTo(firstGuard.x - 2.2, 3)
    expect(updatedGuard?.y).toBeCloseTo(firstGuard.y, 3)
  })

  it("does not enter Vault from lift before switch activation", () => {
    const template = createSwitchVaultTemplateProject()
    const room = template.project.rooms.find((roomEntry) => roomEntry.id === template.roomId)
    const agentObjectId = template.project.objects.find((objectEntry) => objectEntry.name === "Agent")?.id
    const liftObjectId = template.project.objects.find((objectEntry) => objectEntry.name === "Lift")?.id
    const controlLift = room?.instances.find((instanceEntry) => instanceEntry.objectId === liftObjectId)
    expect(agentObjectId).toBeTruthy()
    expect(liftObjectId).toBeTruthy()
    expect(controlLift).toBeTruthy()
    if (!controlLift) {
      throw new Error("Missing lift instance in control room")
    }

    const initialized = runRuntimeTick(template.project, template.roomId, new Set(), createInitialRuntimeState(template.project))
    const onLiftProject = updateRoomInstances(initialized.project, template.roomId, (instances) =>
      instances.map((instanceEntry) =>
        instanceEntry.objectId === agentObjectId ? { ...instanceEntry, x: controlLift.x, y: controlLift.y } : instanceEntry
      )
    )
    const result = runRuntimeTick(onLiftProject, template.roomId, new Set(), initialized.runtime)
    const roomAfter = result.project.rooms.find((roomEntry) => roomEntry.id === template.roomId)
    const agentAfter = roomAfter?.instances.find((instanceEntry) => instanceEntry.objectId === agentObjectId)

    expect(result.activeRoomId).toBe(template.roomId)
    expect(agentAfter?.x).toBe(80)
    expect(agentAfter?.y).toBe(260)
  })

  it("keeps an Agent instance available after entering Vault", () => {
    const template = createSwitchVaultTemplateProject()
    const controlRoom = template.project.rooms.find((roomEntry) => roomEntry.id === template.roomId)
    const vaultRoom = template.project.rooms.find((roomEntry) => roomEntry.name === "Vault")
    const agentObjectId = template.project.objects.find((objectEntry) => objectEntry.name === "Agent")?.id
    const switchObjectId = template.project.objects.find((objectEntry) => objectEntry.name === "Switch")?.id
    const liftObjectId = template.project.objects.find((objectEntry) => objectEntry.name === "Lift")?.id
    const switchInstance = controlRoom?.instances.find((instanceEntry) => instanceEntry.objectId === switchObjectId)
    const controlLift = controlRoom?.instances.find((instanceEntry) => instanceEntry.objectId === liftObjectId)
    expect(vaultRoom).toBeTruthy()
    expect(agentObjectId).toBeTruthy()
    expect(switchInstance).toBeTruthy()
    expect(controlLift).toBeTruthy()
    if (!switchInstance || !controlLift || !vaultRoom || !agentObjectId) {
      throw new Error("Missing Switch Vault setup instances")
    }

    const switchCollisionProject = updateRoomInstances(template.project, template.roomId, (instances) =>
      instances.map((instanceEntry) =>
        instanceEntry.objectId === agentObjectId ? { ...instanceEntry, x: switchInstance.x, y: switchInstance.y } : instanceEntry
      )
    )
    const afterSwitch = runRuntimeTick(
      switchCollisionProject,
      template.roomId,
      new Set(),
      createInitialRuntimeState(switchCollisionProject)
    )

    const liftCollisionProject = updateRoomInstances(afterSwitch.project, template.roomId, (instances) =>
      instances.map((instanceEntry) =>
        instanceEntry.objectId === agentObjectId ? { ...instanceEntry, x: controlLift.x, y: controlLift.y } : instanceEntry
      )
    )
    const afterLift = runRuntimeTick(liftCollisionProject, template.roomId, new Set(), afterSwitch.runtime)
    const vaultAfter = afterLift.project.rooms.find((roomEntry) => roomEntry.id === vaultRoom.id)
    const vaultAgents = vaultAfter?.instances.filter((instanceEntry) => instanceEntry.objectId === agentObjectId) ?? []
    const vaultLift = vaultAfter?.instances.find((instanceEntry) => instanceEntry.objectId === liftObjectId)
    const firstVaultAgent = vaultAgents[0]

    expect(afterLift.activeRoomId).toBe(vaultRoom.id)
    expect(vaultAgents.length).toBeGreaterThan(0)
    expect(firstVaultAgent?.x).not.toBe(vaultLift?.x)
    expect(firstVaultAgent?.y).toBe(vaultLift?.y)
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

    const firstResult = runRuntimeTick(template.project, template.roomId, new Set(["Space"]), runtime, new Set(["Space"]))
    const secondResult = runRuntimeTick(template.project, template.roomId, new Set(["Space"]), runtime, new Set(["Space"]))

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

describe("runtime object dimensions", () => {
  it("uses object width/height for collision checks", () => {
    const project: ProjectV1 = {
      version: 1,
      metadata: {
        id: "project-object-dimensions-collision",
        name: "Object dimensions collision test",
        locale: "ca",
        createdAtIso: new Date().toISOString()
      },
      resources: { sprites: [], sounds: [] },
      variables: { global: [], objectByObjectId: {} },
      objects: [
        {
          id: "object-large",
          name: "Large collider",
          spriteId: null,
          x: 0,
          y: 0,
          speed: 0,
          direction: 0,
          width: 64,
          height: 32,
          events: [
            {
              id: "event-collision-score",
              type: "Collision",
              key: null,
              keyboardMode: null,
              targetObjectId: "object-small",
              intervalMs: null,
              items: [
                {
                  id: "item-score",
                  type: "action",
                  action: { id: "action-score", type: "changeScore", delta: 1 }
                }
              ]
            }
          ]
        },
        {
          id: "object-small",
          name: "Small collider",
          spriteId: null,
          x: 0,
          y: 0,
          speed: 0,
          direction: 0,
          width: 32,
          height: 32,
          events: []
        }
      ],
      rooms: [
        {
          id: "room-main",
          name: "Main",
          instances: [
            { id: "instance-large", objectId: "object-large", x: 0, y: 0 },
            { id: "instance-small", objectId: "object-small", x: 50, y: 0 }
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

    const result = runRuntimeTick(project, "room-main", new Set(), createInitialRuntimeState(project))
    expect(result.runtime.score).toBe(1)
  })

  it("uses object width/height for outside-room checks", () => {
    const project: ProjectV1 = {
      version: 1,
      metadata: {
        id: "project-object-dimensions-outside",
        name: "Object dimensions outside room test",
        locale: "ca",
        createdAtIso: new Date().toISOString()
      },
      resources: { sprites: [], sounds: [] },
      variables: { global: [], objectByObjectId: {} },
      objects: [
        {
          id: "object-wide",
          name: "Wide object",
          spriteId: null,
          x: 0,
          y: 0,
          speed: 0,
          direction: 0,
          width: 100,
          height: 20,
          events: [
            {
              id: "event-outside",
              type: "OutsideRoom",
              key: null,
              keyboardMode: null,
              targetObjectId: null,
              intervalMs: null,
              items: [
                {
                  id: "item-score-outside",
                  type: "action",
                  action: { id: "action-score-outside", type: "changeScore", delta: 1 }
                }
              ]
            }
          ]
        }
      ],
      rooms: [{ id: "room-main", name: "Main", instances: [{ id: "instance-wide", objectId: "object-wide", x: 750, y: 10 }] }],
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
    expect(result.runtime.score).toBe(1)
  })
})

function createCollectionMutationProject(rawActions: unknown[], eventType: "Step" | "Collision" = "Step"): ProjectV1 {
  return {
    version: 1,
    metadata: {
      id: "project-collection-mutations",
      name: "Collection mutation runtime tests",
      locale: "ca",
      createdAtIso: new Date().toISOString()
    },
    resources: { sprites: [], sounds: [] },
    variables: {
      global: [
        { id: "gv-list", name: "gList", type: "list", itemType: "number", initialValue: [1, 2] },
        { id: "gv-map", name: "gMap", type: "map", itemType: "number", initialValue: { a: 1 } }
      ],
      objectByObjectId: {
        "object-actor": [
          { id: "ov-list", name: "oList", type: "list", itemType: "number", initialValue: [10, 20] },
          { id: "ov-map", name: "oMap", type: "map", itemType: "number", initialValue: { hp: 5 } }
        ],
        "object-target": [
          { id: "ov-list", name: "oList", type: "list", itemType: "number", initialValue: [30, 40] },
          { id: "ov-map", name: "oMap", type: "map", itemType: "number", initialValue: { hp: 9 } }
        ]
      }
    },
    objects: [
      {
        id: "object-actor",
        name: "Actor",
        spriteId: null,
        x: 0,
        y: 0,
        speed: 0,
        direction: 0,
        events: [
          {
            id: "event-main",
            type: eventType,
            key: null,
            keyboardMode: null,
            targetObjectId: eventType === "Collision" ? "object-target" : null,
            intervalMs: null,
            items: rawActions.map((action, index) => ({
              id: `item-${index}`,
              type: "action",
              action: action as never
            }))
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
          { id: "instance-actor", objectId: "object-actor", x: 0, y: 0 },
          { id: "instance-target", objectId: "object-target", x: 0, y: 0 }
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
}

describe("runtime collection mutation actions", () => {
  it("listPush appends an item to global list", () => {
    const project = createCollectionMutationProject([
      { id: "a-list-push", type: "listPush", scope: "global", variableId: "gv-list", value: 3 }
    ])
    const result = runRuntimeTick(project, "room-main", new Set(), createInitialRuntimeState(project))
    expect(result.runtime.globalVariables["gv-list"]).toEqual([1, 2, 3])
  })

  it("listPush does nothing when value type does not match list itemType", () => {
    const project = createCollectionMutationProject([
      { id: "a-list-push-invalid", type: "listPush", scope: "global", variableId: "gv-list", value: "bad" }
    ])
    const result = runRuntimeTick(project, "room-main", new Set(), createInitialRuntimeState(project))
    expect(result.runtime.globalVariables["gv-list"]).toEqual([1, 2])
  })

  it("listSetAt updates list index on global scope", () => {
    const project = createCollectionMutationProject([
      { id: "a-list-set", type: "listSetAt", scope: "global", variableId: "gv-list", index: 1, value: 99 }
    ])
    const result = runRuntimeTick(project, "room-main", new Set(), createInitialRuntimeState(project))
    expect(result.runtime.globalVariables["gv-list"]).toEqual([1, 99])
  })

  it("listSetAt does nothing when index is out of range", () => {
    const project = createCollectionMutationProject([
      { id: "a-list-set-oob", type: "listSetAt", scope: "global", variableId: "gv-list", index: 5, value: 99 }
    ])
    const result = runRuntimeTick(project, "room-main", new Set(), createInitialRuntimeState(project))
    expect(result.runtime.globalVariables["gv-list"]).toEqual([1, 2])
  })

  it("listRemoveAt removes item at index", () => {
    const project = createCollectionMutationProject([
      { id: "a-list-remove", type: "listRemoveAt", scope: "global", variableId: "gv-list", index: 0 }
    ])
    const result = runRuntimeTick(project, "room-main", new Set(), createInitialRuntimeState(project))
    expect(result.runtime.globalVariables["gv-list"]).toEqual([2])
  })

  it("listRemoveAt does nothing when index is out of range", () => {
    const project = createCollectionMutationProject([
      { id: "a-list-remove-oob", type: "listRemoveAt", scope: "global", variableId: "gv-list", index: -1 }
    ])
    const result = runRuntimeTick(project, "room-main", new Set(), createInitialRuntimeState(project))
    expect(result.runtime.globalVariables["gv-list"]).toEqual([1, 2])
  })

  it("listClear empties the list", () => {
    const project = createCollectionMutationProject([
      { id: "a-list-clear", type: "listClear", scope: "global", variableId: "gv-list" }
    ])
    const result = runRuntimeTick(project, "room-main", new Set(), createInitialRuntimeState(project))
    expect(result.runtime.globalVariables["gv-list"]).toEqual([])
  })

  it("listClear does nothing when variable is not a list", () => {
    const project = createCollectionMutationProject([
      { id: "a-list-clear-invalid", type: "listClear", scope: "global", variableId: "gv-map" }
    ])
    const result = runRuntimeTick(project, "room-main", new Set(), createInitialRuntimeState(project))
    expect(result.runtime.globalVariables["gv-map"]).toEqual({ a: 1 })
  })

  it("mapSet assigns key/value pair", () => {
    const project = createCollectionMutationProject([
      { id: "a-map-set", type: "mapSet", scope: "global", variableId: "gv-map", key: "b", value: 2 }
    ])
    const result = runRuntimeTick(project, "room-main", new Set(), createInitialRuntimeState(project))
    expect(result.runtime.globalVariables["gv-map"]).toEqual({ a: 1, b: 2 })
  })

  it("mapSet does nothing when value type does not match map itemType", () => {
    const project = createCollectionMutationProject([
      { id: "a-map-set-invalid", type: "mapSet", scope: "global", variableId: "gv-map", key: "b", value: false }
    ])
    const result = runRuntimeTick(project, "room-main", new Set(), createInitialRuntimeState(project))
    expect(result.runtime.globalVariables["gv-map"]).toEqual({ a: 1 })
  })

  it("mapDelete removes key", () => {
    const project = createCollectionMutationProject([
      { id: "a-map-delete", type: "mapDelete", scope: "global", variableId: "gv-map", key: "a" }
    ])
    const result = runRuntimeTick(project, "room-main", new Set(), createInitialRuntimeState(project))
    expect(result.runtime.globalVariables["gv-map"]).toEqual({})
  })

  it("mapDelete does nothing when key does not exist", () => {
    const project = createCollectionMutationProject([
      { id: "a-map-delete-miss", type: "mapDelete", scope: "global", variableId: "gv-map", key: "z" }
    ])
    const result = runRuntimeTick(project, "room-main", new Set(), createInitialRuntimeState(project))
    expect(result.runtime.globalVariables["gv-map"]).toEqual({ a: 1 })
  })

  it("mapClear empties map", () => {
    const project = createCollectionMutationProject([
      { id: "a-map-clear", type: "mapClear", scope: "global", variableId: "gv-map" }
    ])
    const result = runRuntimeTick(project, "room-main", new Set(), createInitialRuntimeState(project))
    expect(result.runtime.globalVariables["gv-map"]).toEqual({})
  })

  it("mapClear does nothing when variable is not a map", () => {
    const project = createCollectionMutationProject([
      { id: "a-map-clear-invalid", type: "mapClear", scope: "global", variableId: "gv-list" }
    ])
    const result = runRuntimeTick(project, "room-main", new Set(), createInitialRuntimeState(project))
    expect(result.runtime.globalVariables["gv-list"]).toEqual([1, 2])
  })

  it("object scope supports target other for collection actions in collisions", () => {
    const project = createCollectionMutationProject(
      [{ id: "a-list-push-other", type: "listPush", scope: "object", variableId: "ov-list", target: "other", value: 7 }],
      "Collision"
    )
    const result = runRuntimeTick(project, "room-main", new Set(), createInitialRuntimeState(project))
    expect(result.runtime.objectInstanceVariables["instance-target"]?.["ov-list"]).toEqual([30, 40, 7])
    expect(result.runtime.objectInstanceVariables["instance-actor"]?.["ov-list"]).toEqual([10, 20])
  })
})

function createSpriteActionProject(
  rawActions: unknown[],
  eventType: "Step" | "Collision" = "Step",
  frameCount = 3
): ProjectV1 {
  const frames = Array.from({ length: frameCount }, (_, i) => ({
    id: `frame-${i}`,
    pixelsRgba: Array.from({ length: 64 }, () => `#${String(i).padStart(2, "0")}0000ff`)
  }))
  return {
    version: 1,
    metadata: {
      id: "project-sprite-actions",
      name: "Sprite action runtime tests",
      locale: "ca",
      createdAtIso: new Date().toISOString()
    },
    resources: {
      sprites: [
        { id: "sprite-a", name: "Sprite A", width: 8, height: 8, assetSource: "", imagePath: "", uploadStatus: "notConnected" as const, pixelsRgba: frames[0]?.pixelsRgba ?? [], frames },
        { id: "sprite-b", name: "Sprite B", width: 8, height: 8, assetSource: "", imagePath: "", uploadStatus: "notConnected" as const, pixelsRgba: Array.from({ length: 64 }, () => "#ff0000ff"), frames: [{ id: "frame-only", pixelsRgba: Array.from({ length: 64 }, () => "#ff0000ff") }] }
      ],
      sounds: []
    },
    variables: { global: [], objectByObjectId: {} },
    objects: [
      {
        id: "object-actor",
        name: "Actor",
        spriteId: "sprite-a",
        x: 0,
        y: 0,
        speed: 0,
        direction: 0,
        events: [
          {
            id: "event-main",
            type: eventType,
            key: null,
            keyboardMode: null,
            targetObjectId: eventType === "Collision" ? "object-target" : null,
            intervalMs: null,
            items: rawActions.map((action, index) => ({
              id: `item-${index}`,
              type: "action",
              action: action as never
            }))
          }
        ]
      },
      {
        id: "object-target",
        name: "Target",
        spriteId: "sprite-b",
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
          { id: "instance-actor", objectId: "object-actor", x: 0, y: 0 },
          { id: "instance-target", objectId: "object-target", x: 0, y: 0 }
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
}

describe("changeSprite action", () => {
  it("overrides sprite for self instance", () => {
    const project = createSpriteActionProject([
      { id: "a-change-sprite", type: "changeSprite", spriteId: "sprite-b", target: "self" }
    ])
    const result = runRuntimeTick(project, "room-main", new Set(), createInitialRuntimeState(project))
    expect(result.runtime.spriteOverrideByInstanceId["instance-actor"]).toBe("sprite-b")
  })

  it("overrides sprite for other instance in collision", () => {
    const project = createSpriteActionProject(
      [{ id: "a-change-sprite-other", type: "changeSprite", spriteId: "sprite-a", target: "other" }],
      "Collision"
    )
    const result = runRuntimeTick(project, "room-main", new Set(), createInitialRuntimeState(project))
    expect(result.runtime.spriteOverrideByInstanceId["instance-target"]).toBe("sprite-a")
  })

  it("resets animation elapsed on sprite change", () => {
    const project = createSpriteActionProject([
      { id: "a-change-sprite", type: "changeSprite", spriteId: "sprite-b", target: "self" }
    ])
    const initialRuntime = createInitialRuntimeState(project)
    const runtimeWithElapsed = {
      ...initialRuntime,
      spriteAnimationElapsedMsByInstanceId: { "instance-actor": 250 }
    }
    const result = runRuntimeTick(project, "room-main", new Set(), runtimeWithElapsed)
    expect(result.runtime.spriteAnimationElapsedMsByInstanceId["instance-actor"]).toBe(0)
  })

  it("does not affect other instances when targeting self", () => {
    const project = createSpriteActionProject([
      { id: "a-change-sprite", type: "changeSprite", spriteId: "sprite-b", target: "self" }
    ])
    const result = runRuntimeTick(project, "room-main", new Set(), createInitialRuntimeState(project))
    expect(result.runtime.spriteOverrideByInstanceId["instance-target"]).toBeUndefined()
  })
})

describe("setSpriteSpeed action", () => {
  it("sets speed for self instance", () => {
    const project = createSpriteActionProject([
      { id: "a-set-speed", type: "setSpriteSpeed", speedMs: 200, target: "self" }
    ])
    const result = runRuntimeTick(project, "room-main", new Set(), createInitialRuntimeState(project))
    expect(result.runtime.spriteSpeedMsByInstanceId["instance-actor"]).toBe(200)
  })

  it("sets speed for other instance in collision", () => {
    const project = createSpriteActionProject(
      [{ id: "a-set-speed-other", type: "setSpriteSpeed", speedMs: 50, target: "other" }],
      "Collision"
    )
    const result = runRuntimeTick(project, "room-main", new Set(), createInitialRuntimeState(project))
    expect(result.runtime.spriteSpeedMsByInstanceId["instance-target"]).toBe(50)
  })

  it("clamps speed to minimum 1ms", () => {
    const project = createSpriteActionProject([
      { id: "a-set-speed-zero", type: "setSpriteSpeed", speedMs: 0, target: "self" }
    ])
    const result = runRuntimeTick(project, "room-main", new Set(), createInitialRuntimeState(project))
    expect(result.runtime.spriteSpeedMsByInstanceId["instance-actor"]).toBe(1)
  })
})

describe("sprite animation", () => {
  it("advances animation elapsed per tick for multi-frame sprites", () => {
    const project = createSpriteActionProject([], "Step", 3)
    const result = runRuntimeTick(project, "room-main", new Set(), createInitialRuntimeState(project))
    // RUNTIME_TICK_MS is 80, so after one tick elapsed should be 80
    expect(result.runtime.spriteAnimationElapsedMsByInstanceId["instance-actor"]).toBe(80)
  })

  it("does not advance for single-frame sprites", () => {
    const project = createSpriteActionProject([], "Step", 3)
    const result = runRuntimeTick(project, "room-main", new Set(), createInitialRuntimeState(project))
    // instance-target has sprite-b which has only 1 frame
    expect(result.runtime.spriteAnimationElapsedMsByInstanceId["instance-target"]).toBeUndefined()
  })

  it("wraps elapsed around total animation duration", () => {
    const project = createSpriteActionProject([], "Step", 3)
    const initialRuntime = createInitialRuntimeState(project)
    // Default speed is 100ms, 3 frames = 300ms total. Set elapsed to 280ms so next tick wraps.
    const runtimeNearEnd = {
      ...initialRuntime,
      spriteAnimationElapsedMsByInstanceId: { "instance-actor": 280 }
    }
    const result = runRuntimeTick(project, "room-main", new Set(), runtimeNearEnd)
    // 280 + 80 = 360 -> 360 % 300 = 60
    expect(result.runtime.spriteAnimationElapsedMsByInstanceId["instance-actor"]).toBe(60)
  })

  it("uses per-instance speed override when set", () => {
    const project = createSpriteActionProject([], "Step", 3)
    const initialRuntime = createInitialRuntimeState(project)
    // Set custom speed of 200ms per frame. Total = 200 * 3 = 600ms.
    const runtimeWithSpeed = {
      ...initialRuntime,
      spriteSpeedMsByInstanceId: { "instance-actor": 200 },
      spriteAnimationElapsedMsByInstanceId: { "instance-actor": 560 }
    }
    const result = runRuntimeTick(project, "room-main", new Set(), runtimeWithSpeed)
    // 560 + 80 = 640 -> 640 % 600 = 40
    expect(result.runtime.spriteAnimationElapsedMsByInstanceId["instance-actor"]).toBe(40)
  })

  it("uses default 100ms speed when no override", () => {
    const project = createSpriteActionProject([], "Step", 2)
    const initialRuntime = createInitialRuntimeState(project)
    // 2 frames at 100ms = 200ms total. Start at 160.
    const runtimeNearEnd = {
      ...initialRuntime,
      spriteAnimationElapsedMsByInstanceId: { "instance-actor": 160 }
    }
    const result = runRuntimeTick(project, "room-main", new Set(), runtimeNearEnd)
    // 160 + 80 = 240 -> 240 % 200 = 40
    expect(result.runtime.spriteAnimationElapsedMsByInstanceId["instance-actor"]).toBe(40)
  })
})
