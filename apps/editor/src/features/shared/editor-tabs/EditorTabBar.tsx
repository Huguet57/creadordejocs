import { Box, X } from "lucide-react"
import type { MouseEvent } from "react"

export type EditorTabItem = {
  id: string
  name: string
  iconSrc: string | null
  pinned: boolean
}

type EditorTabBarProps = {
  tabs: EditorTabItem[]
  activeTabId: string | null
  onSelectTab: (id: string) => void
  onCloseTab: (id: string) => void
  onPinTab: (id: string) => void
  classNamePrefix: string
}

export function EditorTabBar({
  tabs,
  activeTabId,
  onSelectTab,
  onCloseTab,
  onPinTab,
  classNamePrefix
}: EditorTabBarProps) {
  if (tabs.length === 0) return null

  const handleCloseClick = (event: MouseEvent, tabId: string) => {
    event.stopPropagation()
    onCloseTab(tabId)
  }

  const handleAuxClick = (event: MouseEvent, tabId: string) => {
    if (event.button === 1) {
      event.preventDefault()
      onCloseTab(tabId)
    }
  }

  return (
    <div className={`${classNamePrefix}-bar flex min-h-[36px] items-end gap-0 overflow-x-auto border-b border-slate-200 bg-slate-100 px-1 pt-1`}>
      {tabs.map((tab) => {
        const isActive = tab.id === activeTabId
        return (
          <button
            key={tab.id}
            type="button"
            className={`${classNamePrefix}-tab group flex shrink-0 items-center gap-1.5 rounded-t-md border border-b-0 px-3 py-1.5 text-xs transition-colors ${
              isActive
                ? "border-slate-200 bg-white text-slate-900 font-medium"
                : "border-transparent bg-transparent text-slate-500 hover:bg-slate-50 hover:text-slate-700"
            }`}
            onClick={() => onSelectTab(tab.id)}
            onDoubleClick={() => onPinTab(tab.id)}
            onAuxClick={(event) => handleAuxClick(event, tab.id)}
            title={tab.name}
          >
            {tab.iconSrc ? (
              <img
                src={tab.iconSrc}
                alt=""
                className={`${classNamePrefix}-icon h-4 w-4 shrink-0 object-contain`}
                style={{ imageRendering: "pixelated" }}
              />
            ) : (
              <Box className={`h-3 w-3 shrink-0 ${isActive ? "text-blue-500" : "text-slate-400"}`} />
            )}
            <span className={`${classNamePrefix}-label max-w-[120px] truncate ${tab.pinned ? "" : "italic"}`}>{tab.name}</span>
            <span
              className={`${classNamePrefix}-close inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-sm transition-colors hover:bg-slate-200 hover:text-red-500 ${
                isActive ? "text-slate-400" : "text-transparent group-hover:text-slate-400"
              }`}
              onClick={(event) => handleCloseClick(event, tab.id)}
              role="button"
              tabIndex={-1}
              aria-label={`Close ${tab.name}`}
            >
              <X className="h-3 w-3" />
            </span>
          </button>
        )
      })}
    </div>
  )
}
