import { Box, X } from "lucide-react"
import type { MouseEvent } from "react"

type ObjectTab = {
  id: string
  name: string
  spriteSrc: string | null
}

type ObjectTabBarProps = {
  tabs: ObjectTab[]
  activeTabId: string | null
  onSelectTab: (id: string) => void
  onCloseTab: (id: string) => void
}

export function ObjectTabBar({ tabs, activeTabId, onSelectTab, onCloseTab }: ObjectTabBarProps) {
  if (tabs.length === 0) return null

  const handleCloseClick = (e: MouseEvent, tabId: string) => {
    e.stopPropagation()
    onCloseTab(tabId)
  }

  const handleAuxClick = (e: MouseEvent, tabId: string) => {
    if (e.button === 1) {
      e.preventDefault()
      onCloseTab(tabId)
    }
  }

  return (
    <div className="objtabs-bar flex min-h-[36px] items-end gap-0 overflow-x-auto border-b border-slate-200 bg-slate-100 px-1 pt-1">
      {tabs.map((tab) => {
        const isActive = tab.id === activeTabId
        return (
          <button
            key={tab.id}
            type="button"
            className={`objtabs-tab group flex shrink-0 items-center gap-1.5 rounded-t-md border border-b-0 px-3 py-1.5 text-xs transition-colors ${
              isActive
                ? "border-slate-200 bg-white text-slate-900 font-medium"
                : "border-transparent bg-transparent text-slate-500 hover:bg-slate-50 hover:text-slate-700"
            }`}
            onClick={() => onSelectTab(tab.id)}
            onAuxClick={(e) => handleAuxClick(e, tab.id)}
            title={tab.name}
          >
            {tab.spriteSrc ? (
              <img
                src={tab.spriteSrc}
                alt=""
                className="objtabs-tab-sprite h-4 w-4 shrink-0 object-contain"
                style={{ imageRendering: "pixelated" }}
              />
            ) : (
              <Box className={`h-3 w-3 shrink-0 ${isActive ? "text-blue-500" : "text-slate-400"}`} />
            )}
            <span className="objtabs-tab-label max-w-[120px] truncate">{tab.name}</span>
            <span
              className={`objtabs-tab-close inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-sm transition-colors hover:bg-slate-200 hover:text-red-500 ${
                isActive ? "text-slate-400" : "text-transparent group-hover:text-slate-400"
              }`}
              onClick={(e) => handleCloseClick(e, tab.id)}
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
