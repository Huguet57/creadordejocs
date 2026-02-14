import { describe, expect, it } from "vitest"
import { runHelloSceneDemo } from "../../apps/player/src/hello-scene.js"

describe("hello scene demo", () => {
  it("builds and runs a first playable scene with baseline metrics", () => {
    let now = 0
    const result = runHelloSceneDemo(() => {
      now += 800
      return now
    })

    expect(result.project.scenes[0]?.name).toBe("Hello Scene")
    expect(result.project.metrics.appStart).toBe(1)
    expect(result.project.metrics.projectLoad).toBe(1)
    expect(result.project.metrics.runtimeErrors).toBe(0)
    expect(result.project.metrics.timeToFirstPlayableFunMs).toBe(800)
    expect(result.renderedFrames).toBe(1)
  })
})
