import { t } from "@/i18n/index.js"
import { Button } from "../components/ui/button.js"
import type { EditorSection } from "../features/editor-state/types.js"

type EditorSidebarProps = {
  activeSection: EditorSection
  onSectionChange: (section: EditorSection) => void
}

const sectionItems: { id: EditorSection; label: string }[] = [
  { id: "sprites", label: t("sidebarSprites") },
  { id: "objects", label: t("sidebarObjects") },
  { id: "rooms", label: t("sidebarRooms") },
  { id: "globalVariables", label: t("sidebarGlobals") },
  { id: "run", label: t("sidebarRun") }
]

export function EditorSidebar({ activeSection, onSectionChange }: EditorSidebarProps) {
  return (
    <aside className="mvp15-sidebar-panel rounded-lg border border-slate-200 bg-white p-3 shadow-sm">
      <p className="text-xs font-semibold text-slate-500">{t("sidebarTitle")}</p>
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
