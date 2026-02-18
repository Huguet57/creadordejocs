import { useCallback, useMemo, useRef, useState } from "react"
import { TRANSPARENT_RGBA } from "../utils/pixel-rgba.js"
import { normalizePixelGrid } from "../utils/sprite-grid.js"

type LiftedEntry = {
  origX: number
  origY: number
  color: string
}

type MoveState = {
  basePixels: string[]
  liftedEntries: LiftedEntry[]
  startX: number
  startY: number
  offsetX: number
  offsetY: number
}

function composeMovedPixels(
  basePixels: string[],
  liftedEntries: LiftedEntry[],
  offsetX: number,
  offsetY: number,
  width: number,
  height: number
): string[] {
  const result = [...basePixels]
  for (const entry of liftedEntries) {
    const newX = entry.origX + offsetX
    const newY = entry.origY + offsetY
    if (newX >= 0 && newX < width && newY >= 0 && newY < height) {
      result[newY * width + newX] = entry.color
    }
  }
  return result
}

function shiftSelection(selection: Set<number>, offsetX: number, offsetY: number, width: number, height: number): Set<number> {
  const result = new Set<number>()
  for (const index of selection) {
    const x = index % width
    const y = Math.floor(index / width)
    const newX = x + offsetX
    const newY = y + offsetY
    if (newX >= 0 && newX < width && newY >= 0 && newY < height) {
      result.add(newY * width + newX)
    }
  }
  return result
}

type UseSpriteMoveInput = {
  width: number
  height: number
  pixelsRgba: string[]
  selection: Set<number>
  onPixelsChange: (pixelsRgba: string[]) => void
  onSelectionChange: (selection: Set<number>) => void
}

export function useSpriteMove({ width, height, pixelsRgba, selection, onPixelsChange, onSelectionChange }: UseSpriteMoveInput) {
  const [moveState, setMoveState] = useState<MoveState | null>(null)
  const selectionRef = useRef(selection)
  selectionRef.current = selection

  const onMoveStart = useCallback(
    (x: number, y: number) => {
      const safePixels = normalizePixelGrid(pixelsRgba, width, height)
      const sel = selectionRef.current
      const hasSelection = sel.size > 0

      const liftedEntries: LiftedEntry[] = []
      const basePixels = [...safePixels]

      for (let i = 0; i < safePixels.length; i++) {
        const color = safePixels[i] ?? TRANSPARENT_RGBA
        if (color === TRANSPARENT_RGBA) continue

        const shouldLift = hasSelection ? sel.has(i) : true
        if (shouldLift) {
          liftedEntries.push({
            origX: i % width,
            origY: Math.floor(i / width),
            color
          })
          basePixels[i] = TRANSPARENT_RGBA
        }
      }

      if (liftedEntries.length === 0) return

      setMoveState({
        basePixels,
        liftedEntries,
        startX: x,
        startY: y,
        offsetX: 0,
        offsetY: 0
      })
    },
    [pixelsRgba, width, height]
  )

  const onMoveDrag = useCallback((x: number, y: number) => {
    setMoveState((prev) => {
      if (!prev) return prev
      const offsetX = x - prev.startX
      const offsetY = y - prev.startY
      if (offsetX === prev.offsetX && offsetY === prev.offsetY) return prev
      return { ...prev, offsetX, offsetY }
    })
  }, [])

  const onMoveEnd = useCallback(() => {
    setMoveState((prev) => {
      if (!prev) return null
      const composed = composeMovedPixels(prev.basePixels, prev.liftedEntries, prev.offsetX, prev.offsetY, width, height)
      onPixelsChange(composed)

      const sel = selectionRef.current
      if (sel.size > 0) {
        onSelectionChange(shiftSelection(sel, prev.offsetX, prev.offsetY, width, height))
      }

      return null
    })
  }, [width, height, onPixelsChange, onSelectionChange])

  const displayPixels = useMemo(() => {
    if (!moveState) return pixelsRgba
    return composeMovedPixels(moveState.basePixels, moveState.liftedEntries, moveState.offsetX, moveState.offsetY, width, height)
  }, [moveState, pixelsRgba, width, height])

  return {
    isMoving: moveState !== null,
    displayPixels,
    onMoveStart,
    onMoveDrag,
    onMoveEnd
  }
}
