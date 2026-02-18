export function captureRuntimeKeyDown(pressedKeys: Set<string>, justPressedKeys: Set<string>, key: string): void {
  if (!pressedKeys.has(key)) {
    justPressedKeys.add(key)
  }
  pressedKeys.add(key)
}

export function captureRuntimeKeyUp(pressedKeys: Set<string>, justReleasedKeys: Set<string>, key: string): void {
  if (pressedKeys.has(key)) {
    justReleasedKeys.add(key)
  }
  pressedKeys.delete(key)
}

export function releaseAllRuntimeKeys(pressedKeys: Set<string>, justReleasedKeys: Set<string>): void {
  for (const key of pressedKeys) {
    justReleasedKeys.add(key)
  }
  pressedKeys.clear()
}

export function clearRuntimeKeyEdges(justPressedKeys: Set<string>, justReleasedKeys: Set<string>): void {
  justPressedKeys.clear()
  justReleasedKeys.clear()
}

export function resetRuntimeKeyBuffer(
  pressedKeys: Set<string>,
  justPressedKeys: Set<string>,
  justReleasedKeys: Set<string>
): void {
  pressedKeys.clear()
  justPressedKeys.clear()
  justReleasedKeys.clear()
}
