import { createFixedTimestepLoop } from "@creadordejocs/engine-core"
import {
  createEmptyProjectV1,
  incrementMetric,
  setTimeToFirstPlayableFunMs,
  type ProjectV1
} from "@creadordejocs/project-format"

export type HelloSceneDemoResult = {
  project: ProjectV1
  renderedFrames: number
}

export function buildHelloSceneProject(): ProjectV1 {
  const project = createEmptyProjectV1("Hello Scene")

  return {
    ...project,
    scenes: [
      {
        id: "scene-hello",
        name: "Hello Scene",
        objects: [
          {
            id: "obj-player",
            name: "Player",
            x: 64,
            y: 64
          }
        ]
      }
    ]
  }
}

export function runHelloSceneDemo(getNowMs: () => number = Date.now): HelloSceneDemoResult {
  const startedAtMs = getNowMs()
  let project = buildHelloSceneProject()
  let renderedFrames = 0

  project = incrementMetric(project, "appStart")
  project = incrementMetric(project, "projectLoad")

  const loop = createFixedTimestepLoop({
    update(deltaMs) {
      if (deltaMs < 0) {
        throw new Error("Invalid runtime delta: deltaMs must be >= 0")
      }
    },
    draw() {
      renderedFrames += 1
    }
  })

  try {
    loop.step(16.67)
  } catch (error: unknown) {
    project = incrementMetric(project, "runtimeErrors")
    const message = error instanceof Error ? error.message : "unknown runtime error"
    throw new Error(`Hello Scene runtime failed: ${message}`)
  }

  project = setTimeToFirstPlayableFunMs(project, getNowMs() - startedAtMs)
  return { project, renderedFrames }
}
