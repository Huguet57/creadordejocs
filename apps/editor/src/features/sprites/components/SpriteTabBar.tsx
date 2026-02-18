import { EditorTabBar } from "../../shared/editor-tabs/EditorTabBar.js"

type SpriteTab = {
  id: string
  name: string
  previewSrc: string | null
  pinned: boolean
}

type SpriteTabBarProps = {
  tabs: SpriteTab[]
  activeTabId: string | null
  onSelectTab: (id: string) => void
  onCloseTab: (id: string) => void
  onPinTab: (id: string) => void
}

export function SpriteTabBar({ tabs, activeTabId, onSelectTab, onCloseTab, onPinTab }: SpriteTabBarProps) {
  return (
    <EditorTabBar
      tabs={tabs.map((tab) => ({
        id: tab.id,
        name: tab.name,
        iconSrc: tab.previewSrc,
        pinned: tab.pinned
      }))}
      activeTabId={activeTabId}
      onSelectTab={onSelectTab}
      onCloseTab={onCloseTab}
      onPinTab={onPinTab}
      classNamePrefix="sprtabs"
    />
  )
}
