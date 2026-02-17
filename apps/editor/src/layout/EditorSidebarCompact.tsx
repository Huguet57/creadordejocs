import { Box, Grid3X3, Image, LayoutTemplate, Play, Variable } from "lucide-react"
import { Button } from "../components/ui/button.js"
import type { EditorSection } from "../features/editor-state/types.js"

type EditorSidebarCompactProps = {
  activeSection: EditorSection
  onSectionChange: (section: EditorSection) => void
}

const mainItems: { id: EditorSection; label: string; icon: React.ElementType }[] = [
  { id: "sprites", label: "Sprites", icon: Image },
  { id: "objects", label: "Objects", icon: Box },
  { id: "rooms", label: "Rooms", icon: Grid3X3 },
  { id: "globalVariables", label: "Globals", icon: Variable },
  { id: "templates", label: "Import", icon: LayoutTemplate }
]

const bottomItems: { id: EditorSection; label: string; icon: React.ElementType }[] = [{ id: "run", label: "Run", icon: Play }]

export function EditorSidebarCompact({ activeSection, onSectionChange }: EditorSidebarCompactProps) {
  return (
    <aside className="mvp19-sidebar-compact flex w-16 flex-col items-center gap-2 rounded-lg border border-slate-200 bg-white py-3 shadow-sm">
      {mainItems.map((sectionItem) => {
        const Icon = sectionItem.icon
        const isActive = activeSection === sectionItem.id
        return (
          <Button
            key={sectionItem.id}
            data-testid={`sidebar-${sectionItem.id}`}
            variant={isActive ? "default" : "ghost"}
            className={`mvp19-sidebar-button flex h-14 w-12 flex-col items-center justify-center gap-1 rounded-md px-1 ${
              isActive ? "" : "text-slate-500 hover:text-slate-900"
            }`}
            onClick={() => onSectionChange(sectionItem.id)}
            title={sectionItem.label}
          >
            <Icon className="h-4 w-4" />
            <span className="mvp19-sidebar-button-label text-[10px] leading-none">{sectionItem.label}</span>
          </Button>
        )
      })}
      <div className="mvp19-sidebar-bottom mt-auto flex flex-col items-center gap-2">
        {bottomItems.map((sectionItem) => {
          const Icon = sectionItem.icon
          const isActive = activeSection === sectionItem.id
          return (
            <Button
              key={sectionItem.id}
              data-testid={`sidebar-${sectionItem.id}`}
              variant={isActive ? "default" : "ghost"}
              className={`mvp19-sidebar-button mvp19-sidebar-button-run flex h-14 w-12 flex-col items-center justify-center gap-1 rounded-md px-1 ${
                isActive ? "" : "text-slate-500 hover:text-slate-900"
              }`}
              onClick={() => onSectionChange(sectionItem.id)}
              title={sectionItem.label}
            >
              <Icon className="h-4 w-4" />
              <span className="mvp19-sidebar-button-label text-[10px] leading-none">{sectionItem.label}</span>
            </Button>
          )
        })}
      </div>
    </aside>
  )
}
