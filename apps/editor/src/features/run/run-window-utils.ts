import { WINDOW_HEIGHT, WINDOW_WIDTH, clampValue } from "../editor-state/runtime-types.js"

export function mapPointerToWorldCoordinates(params: {
  clientX: number
  clientY: number
  rectLeft: number
  rectTop: number
  windowX: number
  windowY: number
  roomWidth: number
  roomHeight: number
  viewportWidth?: number
  viewportHeight?: number
}): { x: number; y: number } {
  const viewportWidth = params.viewportWidth ?? WINDOW_WIDTH
  const viewportHeight = params.viewportHeight ?? WINDOW_HEIGHT
  const localX = clampValue(params.clientX - params.rectLeft, 0, viewportWidth)
  const localY = clampValue(params.clientY - params.rectTop, 0, viewportHeight)
  return {
    x: clampValue(params.windowX + localX, 0, params.roomWidth),
    y: clampValue(params.windowY + localY, 0, params.roomHeight)
  }
}

export function isInstanceVisibleInWindow(params: {
  instanceX: number
  instanceY: number
  instanceWidth: number
  instanceHeight: number
  windowX: number
  windowY: number
  viewportWidth?: number
  viewportHeight?: number
}): boolean {
  const viewportWidth = params.viewportWidth ?? WINDOW_WIDTH
  const viewportHeight = params.viewportHeight ?? WINDOW_HEIGHT
  return (
    params.instanceX < params.windowX + viewportWidth &&
    params.instanceX + params.instanceWidth > params.windowX &&
    params.instanceY < params.windowY + viewportHeight &&
    params.instanceY + params.instanceHeight > params.windowY
  )
}

export function toScreenCoordinates(worldX: number, worldY: number, windowX: number, windowY: number): { x: number; y: number } {
  return {
    x: worldX - windowX,
    y: worldY - windowY
  }
}
