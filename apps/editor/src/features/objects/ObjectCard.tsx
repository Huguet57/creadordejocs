import { Box } from "lucide-react"

type ObjectCardProps = {
  objectName: string
  spriteSrc: string | null
  visible: boolean
  solid: boolean
  onToggleVisible: (nextValue: boolean) => void
  onToggleSolid: (nextValue: boolean) => void
}

const BUILTIN_ATTRIBUTES = ["x", "y", "w", "h"] as const

export function ObjectCard({ objectName, spriteSrc, visible, solid, onToggleVisible, onToggleSolid }: ObjectCardProps) {
  return (
    <div className="objcard-container border-b border-slate-200 bg-white p-3">
      <div className="objcard-preview flex items-center gap-3">
        <div className="objcard-sprite-thumb flex h-12 w-12 flex-shrink-0 items-center justify-center overflow-hidden rounded-md border border-slate-200 bg-slate-100">
          {spriteSrc ? (
            <img
              src={spriteSrc}
              alt={objectName}
              className="objcard-sprite-img h-full w-full object-contain"
            />
          ) : (
            <Box className="h-5 w-5 text-slate-400" />
          )}
        </div>
        <div className="objcard-info flex min-w-0 flex-1 flex-col gap-1">
          <span className="objcard-name truncate text-sm font-semibold text-slate-900">
            {objectName}
          </span>
          <div className="objcard-attrs flex flex-wrap gap-1">
            {BUILTIN_ATTRIBUTES.map((attr) => (
              <span
                key={attr}
                className="objcard-attr-badge inline-flex rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-medium text-slate-500"
              >
                {attr}
              </span>
            ))}
          </div>
          <div className="objcard-v2-toggle-list mt-1 flex flex-col gap-1">
            <label className="objcard-v2-toggle-row inline-flex items-center gap-2 text-[11px] text-slate-600">
              <input
                type="checkbox"
                className="objcard-v2-toggle-input h-3.5 w-3.5 rounded border-slate-300"
                checked={visible}
                onChange={(event) => onToggleVisible(event.target.checked)}
              />
              <span className="objcard-v2-toggle-label">visible</span>
            </label>
            <label className="objcard-v2-toggle-row inline-flex items-center gap-2 text-[11px] text-slate-600">
              <input
                type="checkbox"
                className="objcard-v2-toggle-input h-3.5 w-3.5 rounded border-slate-300"
                checked={solid}
                onChange={(event) => onToggleSolid(event.target.checked)}
              />
              <span className="objcard-v2-toggle-label">solid</span>
            </label>
          </div>
        </div>
      </div>
    </div>
  )
}
