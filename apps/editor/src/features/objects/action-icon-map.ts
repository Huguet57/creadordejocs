import {
  ArrowLeftRight,
  CopyPlus,
  Dices,
  DoorOpen,
  FastForward,
  Flag,
  Hourglass,
  Locate,
  Maximize,
  MessageSquare,
  Move,
  RotateCcw,
  Trash,
  Trophy,
  Variable,
  X,
  type LucideIcon
} from "lucide-react"
import type { ActionType } from "@creadordejocs/project-format"

export const ACTION_ICON_MAP: Record<ActionType, LucideIcon> = {
  move: Move,
  setVelocity: FastForward,
  rotate: RotateCcw,
  moveToward: Move,
  clampToRoom: Maximize,
  teleport: Locate,
  destroySelf: Trash,
  destroyOther: X,
  spawnObject: CopyPlus,
  changeScore: Trophy,
  endGame: Flag,
  message: MessageSquare,
  playSound: MessageSquare,
  changeVariable: Variable,
  randomizeVariable: Dices,
  copyVariable: ArrowLeftRight,
  goToRoom: DoorOpen,
  restartRoom: RotateCcw,
  wait: Hourglass
}

