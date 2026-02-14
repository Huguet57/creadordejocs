import { EditorSidebarCompact } from "./layout/EditorSidebarCompact.js"
import { EditorTopbar } from "./layout/EditorTopbar.js"
import { EditorWorkspace } from "./layout/EditorWorkspace.js"
import { useEditorController } from "./features/editor-state/use-editor-controller.js"

function formatStatus(status: "idle" | "saved" | "saving" | "error"): string {
  if (status === "saving") return "Saving"
  if (status === "saved") return "Saved"
  if (status === "error") return "Error"
  return "Saved"
}

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

        <div className="mvp15-editor-layout grid gap-4 lg:grid-cols-[64px_1fr]">
          <EditorSidebarCompact
            activeSection={controller.activeSection}
            onSectionChange={(section) => controller.setActiveSection(section)}
          />
          <EditorWorkspace controller={controller} />
        </div>
      </div>
    </main>
  )
}
