import { useState } from "react"
import { Coins, Crosshair, MousePointer2, Route, Waypoints } from "lucide-react"
import { Button } from "../../components/ui/button.js"
import {
  GAME_TEMPLATES,
  type GameTemplateDefinition,
  type GameTemplateId
} from "../editor-state/game-templates.js"
import type { EditorController } from "../editor-state/use-editor-controller.js"
import { downloadProjectAsJson } from "./export-project.js"

type TemplatesSectionProps = {
  controller: EditorController
}

const templateIcons: Record<GameTemplateId, React.ElementType> = {
  "coin-dash": Coins,
  "space-shooter": Crosshair,
  "lane-crosser": Route,
  "battery-courier": Coins,
  "mine-reset": Route,
  "switch-vault": Waypoints,
  "cursor-courier": MousePointer2
}

type TemplateCard = GameTemplateDefinition & {
  icon: React.ElementType
}

const templates: TemplateCard[] = GAME_TEMPLATES.map((templateEntry) => ({
  ...templateEntry,
  icon: templateIcons[templateEntry.id]
}))

const starterTemplates = templates.filter((templateEntry) => templateEntry.difficulty === "starter")
const intermediateTemplates = templates.filter((templateEntry) => templateEntry.difficulty === "intermediate")
const advancedTemplates = templates.filter((templateEntry) => templateEntry.difficulty === "advanced")

function renderTemplateCards(controller: EditorController, entries: TemplateCard[]) {
  return (
    <div className="mvp15-templates-grid grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {entries.map((template) => {
        const Icon = template.icon
        return (
          <div
            key={template.id}
            className="mvp15-template-card flex flex-col gap-3 rounded-lg border border-slate-200 p-4"
          >
            <div className="mvp15-template-card-header flex items-center gap-3">
              <div className="mvp15-template-card-icon flex h-10 w-10 items-center justify-center rounded-md bg-slate-100">
                <Icon className="h-5 w-5 text-slate-500" />
              </div>
              <h3 className="text-sm font-semibold text-slate-800">{template.name}</h3>
            </div>
            <p className="flex-1 text-xs text-slate-500">{template.description}</p>
            <Button
              variant="outline"
              size="sm"
              className="w-full text-xs"
              onClick={() => controller.loadTemplate(template.id)}
            >
              Load Template
            </Button>
          </div>
        )
      })}
    </div>
  )
}

export function TemplatesSection({ controller }: TemplatesSectionProps) {
  const [exportStatus, setExportStatus] = useState<"idle" | "error">("idle")

  const exportCurrentProject = (): void => {
    try {
      downloadProjectAsJson(controller.project)
      setExportStatus("idle")
    } catch {
      setExportStatus("error")
    }
  }

  return (
    <div className="mvp15-templates-panel flex h-[600px] flex-col gap-4 overflow-y-auto rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
      <div>
        <h2 className="text-sm font-semibold text-slate-800">Templates</h2>
        <p className="mt-1 text-xs text-slate-400">Load a pre-built game to learn or remix.</p>
      </div>

      <div className="mvp15-template-section flex flex-col gap-3">
        <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500">Templates inicials</h3>
        {renderTemplateCards(controller, starterTemplates)}
      </div>

      <div className="mvp15-template-section mvp15-template-section-intermediate flex flex-col gap-3">
        <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500">
          Templates de dificultat intermitja
        </h3>
        {renderTemplateCards(controller, intermediateTemplates)}
      </div>

      <div className="mvp18-template-section mvp18-template-section-advanced flex flex-col gap-3">
        <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500">
          Templates avançats (mouse)
        </h3>
        {renderTemplateCards(controller, advancedTemplates)}
      </div>

      <div className="mvp18-templates-footer mt-2 border-t border-slate-200 pt-4">
        <div className="mvp18-templates-footer-actions flex flex-wrap items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            className="mvp18-template-export-current-button text-xs"
            onClick={exportCurrentProject}
          >
            Exportar joc actual
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="mvp18-template-load-local-button text-xs"
            onClick={() => controller.loadSavedProject()}
          >
            Load from local storage
          </Button>
        </div>
        {exportStatus === "error" && (
          <p className="mvp18-template-export-error mt-2 text-xs text-red-600">
            No s&apos;ha pogut exportar el joc. Torna-ho a provar.
          </p>
        )}
      </div>
    </div>
  )
}
