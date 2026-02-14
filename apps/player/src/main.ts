import { createFixedTimestepLoop } from "@creadordejocs/engine-core"
import { createEmptyProjectV1 } from "@creadordejocs/project-format"

const project = createEmptyProjectV1("Demo player")
const loop = createFixedTimestepLoop({
  update(deltaMs) {
    if (deltaMs < 0) {
      throw new Error("deltaMs must be non-negative")
    }
  },
  draw() {
    // Placeholder render step for MVP 0.
  }
})

loop.step(16.67)
console.info("Player ready for", project.metadata.name)
