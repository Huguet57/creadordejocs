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
})
