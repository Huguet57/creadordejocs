import type { GoToRoomTransition } from "@creadordejocs/project-format"

export const ROOM_TRANSITION_DURATION_MS = 220

export function getRoomTransitionAnimationClass(transition: GoToRoomTransition): string | null {
  if (transition === "fade") {
    return "mvp15-room-transition-fade"
  }
  if (transition === "slideLeft") {
    return "mvp15-room-transition-slide-left"
  }
  if (transition === "slideRight") {
    return "mvp15-room-transition-slide-right"
  }
  return null
}
