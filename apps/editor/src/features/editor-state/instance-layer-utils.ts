type LayeredInstance = {
  layer?: number | undefined
}

export function resolveInstanceLayer(instance: LayeredInstance): number {
  const rawLayer = instance.layer
  if (typeof rawLayer !== "number" || !Number.isFinite(rawLayer)) {
    return 0
  }
  return Math.max(0, Math.floor(rawLayer))
}

export function sortInstancesByLayer<T extends LayeredInstance>(instances: readonly T[]): T[] {
  return instances
    .map((instance, index) => ({
      instance,
      index,
      layer: resolveInstanceLayer(instance)
    }))
    .sort((first, second) => {
      if (first.layer !== second.layer) {
        return first.layer - second.layer
      }
      return first.index - second.index
    })
    .map((entry) => entry.instance)
}
