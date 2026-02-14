import { Button } from "../components/ui/button.js"

type EditorTopbarProps = {
  saveStatusText: string
  undoAvailable: boolean
  redoAvailable: boolean
  onRun: () => void
  onReset: () => void
  onUndo: () => void
  onRedo: () => void
  onSave: () => void
  onLoad: () => void
  onLoadTemplate: () => void
}

export function EditorTopbar({
  saveStatusText,
  undoAvailable,
  redoAvailable,
  onRun,
  onReset,
  onUndo,
  onRedo,
  onSave,
  onLoad,
  onLoadTemplate
}: EditorTopbarProps) {
  return (
    <header className="mvp15-topbar-panel flex items-center justify-between rounded-lg border border-slate-200 bg-white p-3 shadow-sm">
      <div>
        <h1 className="text-sm font-semibold text-slate-900">MVP 1.5 Editor UI</h1>
        <p data-testid="save-status" className="text-xs text-slate-600">
          Save status: {saveStatusText}
        </p>
      </div>
      <div className="mvp15-topbar-actions flex flex-wrap gap-2">
        <Button data-testid="run-button" onClick={onRun}>
          Run
        </Button>
        <Button data-testid="reset-button" variant="secondary" onClick={onReset}>
          Reset
        </Button>
        <Button data-testid="undo-button" variant="outline" disabled={!undoAvailable} onClick={onUndo}>
          Undo
        </Button>
        <Button data-testid="redo-button" variant="outline" disabled={!redoAvailable} onClick={onRedo}>
          Redo
        </Button>
        <Button data-testid="save-local-button" variant="secondary" onClick={onSave}>
          Save local
        </Button>
        <Button data-testid="load-local-button" variant="outline" onClick={onLoad}>
          Load local
        </Button>
        <Button data-testid="load-dodge-template-button" variant="outline" onClick={onLoadTemplate}>
          Load Dodge template
        </Button>
      </div>
    </header>
  )
}
