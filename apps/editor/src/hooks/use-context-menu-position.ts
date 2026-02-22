import { useLayoutEffect, type RefObject } from "react"

type ContextMenuPosition = { x: number; y: number } | null

export function useContextMenuPosition(
  menuRef: RefObject<HTMLDivElement | null>,
  position: ContextMenuPosition
): void {
  useLayoutEffect(() => {
    const menu = menuRef.current
    if (!position || !menu) return

    const margin = 8
    const rect = menu.getBoundingClientRect()
    const vw = document.documentElement.clientWidth
    const vh = document.documentElement.clientHeight

    let x = position.x
    let y = position.y

    if (x + rect.width > vw - margin) {
      x = Math.max(margin, x - rect.width)
    }

    if (y + rect.height > vh - margin) {
      y = Math.max(margin, y - rect.height)
    }

    menu.style.left = `${x}px`
    menu.style.top = `${y}px`
  }, [menuRef, position])
}
