import {
  CopyPlus,
  Flag,
  Maximize,
  Move,
  FastForward,
  Trash,
  Trophy,
  Plus,
  Locate,
  X,
  Variable,
  Dices,
  ArrowLeftRight,
  DoorOpen,
  RotateCcw,
  Hourglass,
  MessageSquare
} from "lucide-react"
import type { ElementType } from "react"
import {
  ACTION_CATEGORIES,
  ACTION_DISPLAY_NAMES,
  type ObjectActionType
} from "../editor-state/types.js"

type ActionSelectorPanelProps = {
  classNamePrefix: string
  onSelectAction: (type: ObjectActionType) => void
  onClose: () => void
}

const ACTION_ICONS: Record<ObjectActionType, ElementType> = {
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
  changeVariable: Variable,
  randomizeVariable: Dices,
  copyVariable: ArrowLeftRight,
  goToRoom: DoorOpen,
  restartRoom: RotateCcw,
  wait: Hourglass
}

export function ActionSelectorPanel({
  classNamePrefix,
  onSelectAction,
  onClose
}: ActionSelectorPanelProps) {
  return (
    <div className={`${classNamePrefix}-panel flex flex-1 flex-col overflow-hidden bg-slate-50/50`}>
      <div className={`${classNamePrefix}-panel-header flex items-center justify-between border-b border-slate-200 px-4 py-2`}>
        <p className={`${classNamePrefix}-panel-title text-[10px] font-semibold uppercase tracking-wider text-slate-500`}>
          Afegir acció
        </p>
        <button
          type="button"
          className={`${classNamePrefix}-close inline-flex h-6 w-6 items-center justify-center rounded text-slate-400 transition-colors hover:bg-slate-200 hover:text-slate-700`}
          onClick={onClose}
          title="Cancel"
          aria-label="Cancel add action"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>

      <div className={`${classNamePrefix}-grid flex-1 space-y-4 overflow-y-auto p-4`}>
        {ACTION_CATEGORIES.map((category) => (
          <div key={category.id} className={`${classNamePrefix}-category`}>
            <p className={`${classNamePrefix}-category-label mb-2 text-[10px] font-semibold uppercase tracking-wider text-slate-400`}>
              {category.label}
            </p>
            <div className="grid grid-cols-4 gap-2">
              {category.types.map((type) => {
                const Icon = ACTION_ICONS[type] ?? Plus
                return (
                  <button
                    key={type}
                    type="button"
                    className={`${classNamePrefix}-item flex flex-col items-center justify-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2 py-3 text-slate-600 transition-colors hover:border-slate-400 hover:bg-slate-100 hover:text-slate-900`}
                    onClick={() => onSelectAction(type)}
                  >
                    <Icon className="h-5 w-5" />
                    <span className="text-center text-[10px] font-medium leading-tight">{ACTION_DISPLAY_NAMES[type]}</span>
                  </button>
                )
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
