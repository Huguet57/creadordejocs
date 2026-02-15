import { runHelloSceneDemo } from "./hello-scene.js"
import { extractShareIdFromPath, loadPublishedProject, renderPlayError, renderPlayLoading, renderPlayProject } from "./play-page.js"

async function bootstrapPlayer(): Promise<void> {
  if (typeof document === "undefined" || typeof window === "undefined") {
    const result = runHelloSceneDemo()
    console.info("Player ready for", result.project.metadata.name, {
      renderedFrames: result.renderedFrames,
      metrics: result.project.metrics
    })
    return
  }

  const root = document.body
  root.className = "mvp-player-root"

  const shareId = extractShareIdFromPath(window.location.pathname)
  if (!shareId) {
    renderPlayError(root, "Invalid shared game link.")
    return
  }

  renderPlayLoading(root)
  try {
    const project = await loadPublishedProject(shareId)
    renderPlayProject(root, project)
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Could not load shared game."
    renderPlayError(root, message)
  }
}

void bootstrapPlayer()
