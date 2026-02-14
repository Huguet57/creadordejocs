import { runHelloSceneDemo } from "./hello-scene.js"

const result = runHelloSceneDemo()
console.info("Player ready for", result.project.metadata.name, {
  renderedFrames: result.renderedFrames,
  metrics: result.project.metrics
})
