import { extractShareIdFromPath, loadPublishedProject, renderPlayError, renderPlayLoading, renderPlayProject } from "./play-page.js"

async function bootstrapPlayer(): Promise<void> {
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
