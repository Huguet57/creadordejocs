import { EditorInspectorPanel } from "./layout/EditorInspectorPanel.js"
import { EditorSidebar } from "./layout/EditorSidebar.js"
import { EditorTopbar } from "./layout/EditorTopbar.js"
import { EditorWorkspace } from "./layout/EditorWorkspace.js"
import { useEditorController } from "./features/editor-state/use-editor-controller.js"

function formatStatus(status: "idle" | "saved" | "saving" | "error"): string {
  if (status === "saving") return "Saving"
  if (status === "saved") return "Saved"
  if (status === "error") return "Error"
  return "Saved"
}

const WORKFLOW_STEPS = ["Resource", "Object", "Event", "Action", "Room", "Run"] as const

export function App() {
  const controller = useEditorController()

  return (
    <main className="mvp15-editor-shell min-h-screen bg-slate-50 px-4 py-6 text-slate-900">
      <div className="mvp15-editor-frame mx-auto flex max-w-7xl flex-col gap-4">
        <EditorTopbar
          saveStatusText={formatStatus(controller.saveStatus)}
          undoAvailable={controller.undoAvailable}
          redoAvailable={controller.redoAvailable}
          onRun={() => controller.run()}
          onReset={() => controller.reset()}
          onUndo={() => controller.undo()}
          onRedo={() => controller.redo()}
          onSave={() => controller.saveNow()}
          onLoad={() => controller.loadSavedProject()}
          onLoadTemplate={() => controller.loadDodgeTemplate()}
        />
        <section className="mvp2-workflow-rail rounded-lg border border-slate-200 bg-white p-3 shadow-sm">
          <p className="text-xs font-semibold text-slate-600">Workflow</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {WORKFLOW_STEPS.map((stepLabel, index) => (
              <span
                key={stepLabel}
                className={`mvp2-workflow-step rounded px-2 py-1 text-xs ${
                  index <= controller.workflowStep ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-600"
                }`}
              >
                {index + 1}. {stepLabel}
              </span>
            ))}
          </div>
          <p className="mt-2 text-xs text-slate-500">
            Següent pas recomanat:{" "}
            <strong>{WORKFLOW_STEPS[Math.min(controller.workflowStep + 1, WORKFLOW_STEPS.length - 1)]}</strong>
          </p>
        </section>

        <div className="mvp15-editor-layout grid gap-4 lg:grid-cols-[220px_1fr_320px]">
          <EditorSidebar
            activeSection={controller.activeSection}
            onSectionChange={(section) => {
              controller.setActiveSection(section)
              if (section === "sprites" || section === "sounds") controller.markWorkflowStep(0)
              if (section === "objects") controller.markWorkflowStep(2)
              if (section === "rooms") controller.markWorkflowStep(4)
              if (section === "run") controller.markWorkflowStep(5)
            }}
          />
          <EditorWorkspace controller={controller} />
          <EditorInspectorPanel controller={controller} />
        </div>
      </div>
    </main>
  )
}
