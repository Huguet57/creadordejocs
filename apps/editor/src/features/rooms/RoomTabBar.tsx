import { EditorTabBar } from "../shared/editor-tabs/EditorTabBar.js"

type RoomTab = {
  id: string
  name: string
  pinned: boolean
}

type RoomTabBarProps = {
  tabs: RoomTab[]
  activeTabId: string | null
  onSelectTab: (id: string) => void
  onCloseTab: (id: string) => void
  onPinTab: (id: string) => void
}

export function RoomTabBar({ tabs, activeTabId, onSelectTab, onCloseTab, onPinTab }: RoomTabBarProps) {
  return (
    <EditorTabBar
      tabs={tabs.map((tab) => ({
        id: tab.id,
        name: tab.name,
        iconSrc: null,
        pinned: tab.pinned
      }))}
      activeTabId={activeTabId}
      onSelectTab={onSelectTab}
      onCloseTab={onCloseTab}
      onPinTab={onPinTab}
      classNamePrefix="roomtabs"
    />
  )
}
