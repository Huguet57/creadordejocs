import { Box, Grid3X3, Image, Music, Play } from "lucide-react"
import { Button } from "../components/ui/button.js"
import type { EditorSection } from "../features/editor-state/types.js"

type EditorSidebarCompactProps = {
  activeSection: EditorSection
  onSectionChange: (section: EditorSection) => void
}

const sectionItems: { id: EditorSection; label: string; icon: React.ElementType }[] = [
  { id: "sprites", label: "Sprites", icon: Image },
  { id: "sounds", label: "Sounds", icon: Music },
  { id: "objects", label: "Objects", icon: Box },
  { id: "rooms", label: "Rooms", icon: Grid3X3 },
  { id: "run", label: "Run", icon: Play }
]

export function EditorSidebarCompact({ activeSection, onSectionChange }: EditorSidebarCompactProps) {
  return (
    <aside className="mvp15-sidebar-compact flex w-16 flex-col items-center gap-2 rounded-lg border border-slate-200 bg-white py-4 shadow-sm">
      {sectionItems.map((sectionItem) => {
        const Icon = sectionItem.icon
        const isActive = activeSection === sectionItem.id
        return (
          <Button
            key={sectionItem.id}
            data-testid={`sidebar-${sectionItem.id}`}
            variant={isActive ? "default" : "ghost"}
            size="icon"
            className={`h-10 w-10 rounded-md ${isActive ? "" : "text-slate-500 hover:text-slate-900"}`}
            onClick={() => onSectionChange(sectionItem.id)}
            title={sectionItem.label}
          >
            <Icon className="h-5 w-5" />
            <span className="sr-only">{sectionItem.label}</span>
          </Button>
        )
      })}
    </aside>
  )
}
