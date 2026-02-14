import { ChevronDown, ChevronUp, CopyPlus, Flag, Maximize, Move, FastForward, Trash, Trophy, Volume2, X } from "lucide-react"
import { Button } from "../../components/ui/button.js"
import { Input } from "../../components/ui/input.js"
import type { ObjectActionDraft } from "@creadordejocs/project-format"
import { type ObjectActionType } from "../editor-state/types.js"

type ActionBlockProps = {
  action: ObjectActionDraft & { id: string }
  index: number
  isFirst: boolean
  isLast: boolean
  onUpdate: (action: ObjectActionDraft) => void
  onMoveUp: () => void
  onMoveDown: () => void
  onRemove: () => void
  selectableObjects: { id: string; name: string }[]
  sounds: { id: string; name: string }[]
}

const ACTION_ICONS: Record<ObjectActionType, React.ElementType> = {
  move: Move,
  setVelocity: FastForward,
  spawnObject: CopyPlus,
  playSound: Volume2,
  changeScore: Trophy,
  endGame: Flag,
  clampToRoom: Maximize,
  destroySelf: Trash,
}

export function ActionBlock({
  action,
  isFirst,
  isLast,
  onUpdate,
  onMoveUp,
  onMoveDown,
  onRemove,
  selectableObjects,
  sounds
}: ActionBlockProps) {
  const Icon = ACTION_ICONS[action.type] ?? Move

  return (
    <div className="group flex items-center gap-3 rounded-md border border-slate-200 bg-white p-2 shadow-sm transition-all hover:shadow-md">
      <div className="flex items-center gap-2 min-w-[120px]">
        <Icon className="h-4 w-4 text-slate-500" />
        <span className="text-xs font-semibold uppercase tracking-wide text-slate-700">{action.type}</span>
      </div>

      <div className="flex-1 flex items-center gap-3 flex-wrap">
        {action.type === "move" && (
          <>
            <div className="flex items-center gap-1">
              <label className="text-[10px] font-medium opacity-60">DX</label>
              <Input
                type="number"
                className="h-6 w-16 px-1 text-xs bg-white/50 border-slate-300"
                value={action.dx}
                onChange={(e) => onUpdate({ ...action, dx: Number(e.target.value) })}
              />
            </div>
            <div className="flex items-center gap-1">
              <label className="text-[10px] font-medium opacity-60">DY</label>
              <Input
                type="number"
                className="h-6 w-16 px-1 text-xs bg-white/50 border-slate-300"
                value={action.dy}
                onChange={(e) => onUpdate({ ...action, dy: Number(e.target.value) })}
              />
            </div>
          </>
        )}

        {action.type === "setVelocity" && (
          <>
            <div className="flex items-center gap-1">
              <label className="text-[10px] font-medium opacity-60">Speed</label>
              <Input
                type="number"
                className="h-6 w-16 px-1 text-xs bg-white/50 border-slate-300"
                value={action.speed}
                onChange={(e) => onUpdate({ ...action, speed: Number(e.target.value) })}
              />
            </div>
            <div className="flex items-center gap-1">
              <label className="text-[10px] font-medium opacity-60">Dir</label>
              <Input
                type="number"
                className="h-6 w-16 px-1 text-xs bg-white/50 border-slate-300"
                value={action.direction}
                onChange={(e) => onUpdate({ ...action, direction: Number(e.target.value) })}
              />
            </div>
          </>
        )}

        {action.type === "spawnObject" && (
          <>
            <select
              className="h-6 rounded border border-slate-300 bg-white/50 px-1 text-xs focus:outline-none"
              value={action.objectId}
              onChange={(e) => onUpdate({ ...action, objectId: e.target.value })}
            >
              {selectableObjects.map((obj) => (
                <option key={obj.id} value={obj.id}>{obj.name}</option>
              ))}
            </select>
            <div className="flex items-center gap-1">
              <label className="text-[10px] font-medium opacity-60">X</label>
              <Input
                type="number"
                className="h-6 w-14 px-1 text-xs bg-white/50 border-slate-300"
                value={action.offsetX}
                onChange={(e) => onUpdate({ ...action, offsetX: Number(e.target.value) })}
              />
            </div>
            <div className="flex items-center gap-1">
              <label className="text-[10px] font-medium opacity-60">Y</label>
              <Input
                type="number"
                className="h-6 w-14 px-1 text-xs bg-white/50 border-slate-300"
                value={action.offsetY}
                onChange={(e) => onUpdate({ ...action, offsetY: Number(e.target.value) })}
              />
            </div>
          </>
        )}

        {action.type === "playSound" && (
          <select
            className="h-6 rounded border border-slate-300 bg-white/50 px-1 text-xs focus:outline-none min-w-[120px]"
            value={action.soundId}
            onChange={(e) => onUpdate({ ...action, soundId: e.target.value })}
          >
            {sounds.map((sound) => (
              <option key={sound.id} value={sound.id}>{sound.name}</option>
            ))}
          </select>
        )}

        {action.type === "changeScore" && (
          <div className="flex items-center gap-1">
            <label className="text-[10px] font-medium opacity-60">Delta</label>
            <Input
              type="number"
              className="h-6 w-16 px-1 text-xs bg-white/50 border-slate-300"
              value={action.delta}
              onChange={(e) => onUpdate({ ...action, delta: Number(e.target.value) })}
            />
          </div>
        )}

        {action.type === "endGame" && (
          <div className="flex items-center gap-1 flex-1">
            <label className="text-[10px] font-medium opacity-60">Msg</label>
            <Input
              className="h-6 w-full px-1 text-xs bg-white/50 border-slate-300"
              value={action.message}
              onChange={(e) => onUpdate({ ...action, message: e.target.value })}
            />
          </div>
        )}
      </div>

      <div className="flex items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100 focus-within:opacity-100">
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6 text-slate-400 hover:text-slate-700"
          disabled={isFirst}
          onClick={onMoveUp}
          title="Move up"
        >
          <ChevronUp className="h-3.5 w-3.5" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6 text-slate-400 hover:text-slate-700"
          disabled={isLast}
          onClick={onMoveDown}
          title="Move down"
        >
          <ChevronDown className="h-3.5 w-3.5" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6 text-red-300 hover:text-red-600 hover:bg-red-50"
          onClick={onRemove}
          title="Remove action"
        >
          <X className="h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  )
}
