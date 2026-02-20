import { WINDOW_HEIGHT, WINDOW_WIDTH, clampValue } from "../editor-state/runtime-types.js"
import { sortInstancesByLayer } from "../editor-state/instance-layer-utils.js"

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

const DEFAULT_INSTANCE_SIZE = 32

export function hitTestInstances(params: {
  worldX: number
  worldY: number
  instances: readonly { id: string; objectId: string; x: number; y: number; layer?: number | undefined }[]
  objects: readonly { id: string; width?: number | undefined; height?: number | undefined; visible?: boolean | undefined }[]
}): string | null {
  const sortedInstances = sortInstancesByLayer(params.instances)
  for (let i = sortedInstances.length - 1; i >= 0; i--) {
    const inst = sortedInstances[i]
    if (!inst) continue
    const obj = params.objects.find((o) => o.id === inst.objectId)
    if (!obj || obj.visible === false) continue
    const w = obj.width ?? DEFAULT_INSTANCE_SIZE
    const h = obj.height ?? DEFAULT_INSTANCE_SIZE
    if (
      params.worldX >= inst.x &&
      params.worldX < inst.x + w &&
      params.worldY >= inst.y &&
      params.worldY < inst.y + h
    ) {
      return inst.id
    }
  }
  return null
}
