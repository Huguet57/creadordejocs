import { Coins, Crosshair, Gamepad2, Route } from "lucide-react"
import { Button } from "../../components/ui/button.js"
import {
  GAME_TEMPLATES,
  type GameTemplateDefinition,
  type GameTemplateId
} from "../editor-state/game-templates.js"
import type { EditorController } from "../editor-state/use-editor-controller.js"

type TemplatesSectionProps = {
  controller: EditorController
}

const templateIcons: Record<GameTemplateId, React.ElementType> = {
  dodge: Gamepad2,
  "coin-dash": Coins,
  "space-shooter": Crosshair,
  "lane-crosser": Route
}

type TemplateCard = GameTemplateDefinition & {
  icon: React.ElementType
}

const templates: TemplateCard[] = GAME_TEMPLATES.map((templateEntry) => ({
  ...templateEntry,
  icon: templateIcons[templateEntry.id]
}))

export function TemplatesSection({ controller }: TemplatesSectionProps) {
  return (
    <div className="mvp15-templates-panel flex flex-col gap-4 rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
      <div>
        <h2 className="text-sm font-semibold text-slate-800">Templates</h2>
        <p className="mt-1 text-xs text-slate-400">Load a pre-built game to learn or remix.</p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {templates.map((template) => {
          const Icon = template.icon
          return (
            <div
              key={template.id}
              className="flex flex-col gap-3 rounded-lg border border-slate-200 p-4"
            >
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-md bg-slate-100">
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

      <div className="mt-2 border-t border-slate-200 pt-4">
        <Button
          variant="outline"
          size="sm"
          className="text-xs"
          onClick={() => controller.loadSavedProject()}
        >
          Load from local storage
        </Button>
      </div>
    </div>
  )
}
