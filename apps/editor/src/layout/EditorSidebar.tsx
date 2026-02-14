import { Button } from "../components/ui/button.js"
import type { EditorSection } from "../features/editor-state/types.js"

type EditorSidebarProps = {
  activeSection: EditorSection
  onSectionChange: (section: EditorSection) => void
}

const sectionItems: { id: EditorSection; label: string }[] = [
  { id: "sprites", label: "Sprites" },
  { id: "sounds", label: "Sounds" },
  { id: "objects", label: "Objects" },
  { id: "rooms", label: "Rooms" },
  { id: "globalVariables", label: "Globals" },
  { id: "run", label: "Run" }
]

export function EditorSidebar({ activeSection, onSectionChange }: EditorSidebarProps) {
  return (
    <aside className="mvp15-sidebar-panel rounded-lg border border-slate-200 bg-white p-3 shadow-sm">
      <p className="text-xs font-semibold text-slate-500">Editor sections</p>
      <div className="mt-3 flex flex-col gap-2">
        {sectionItems.map((sectionItem) => (
          <Button
            key={sectionItem.id}
            data-testid={`sidebar-${sectionItem.id}`}
            variant={activeSection === sectionItem.id ? "default" : "outline"}
            className="justify-start"
            onClick={() => onSectionChange(sectionItem.id)}
          >
            {sectionItem.label}
          </Button>
        ))}
      </div>
    </aside>
  )
}
