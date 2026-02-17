import {
  GitBranch,
  RotateCcw,
  List,
  Map,
  X
} from "lucide-react"

export type ControlBlockType = "if" | "repeat" | "forEachList" | "forEachMap"

type BlockSelectorPanelProps = {
  onSelectBlock: (type: ControlBlockType) => void
  onClose: () => void
}

const BLOCK_OPTIONS: { type: ControlBlockType; label: string; icon: typeof GitBranch }[] = [
  { type: "if", label: "If / Condició", icon: GitBranch },
  { type: "repeat", label: "Repetir", icon: RotateCcw },
  { type: "forEachList", label: "Per cada (llista)", icon: List },
  { type: "forEachMap", label: "Per cada (mapa)", icon: Map }
]

export function BlockSelectorPanel({ onSelectBlock, onClose }: BlockSelectorPanelProps) {
  return (
    <div className="block-selector-panel flex flex-1 flex-col overflow-hidden bg-slate-50/50">
      <div className="block-selector-panel-header flex items-center justify-between border-b border-slate-200 px-4 py-2">
        <p className="block-selector-panel-title text-[10px] font-semibold uppercase tracking-wider text-slate-500">
          Afegir bloc
        </p>
        <button
          type="button"
          className="block-selector-panel-close inline-flex h-6 w-6 items-center justify-center rounded text-slate-400 transition-colors hover:bg-slate-200 hover:text-slate-700"
          onClick={onClose}
          title="Cancel"
          aria-label="Cancel add block"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>

      <div className="block-selector-panel-grid flex-1 p-4">
        <div className="grid grid-cols-2 gap-2">
          {BLOCK_OPTIONS.map(({ type, label, icon: Icon }) => (
            <button
              key={type}
              type="button"
              className="block-selector-panel-item flex flex-col items-center justify-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2 py-3 text-slate-600 transition-colors hover:border-slate-400 hover:bg-slate-100 hover:text-slate-900"
              onClick={() => onSelectBlock(type)}
            >
              <Icon className="h-5 w-5" />
              <span className="text-center text-[10px] font-medium leading-tight">{label}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
