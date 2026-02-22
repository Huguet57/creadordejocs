import { t } from "@/i18n/index.js"
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
        <h1 className="text-sm font-semibold text-slate-900">{t("topbarTitle")}</h1>
        <p data-testid="save-status" className="text-xs text-slate-600">
          {t("topbarSaveStatusPrefix")} {saveStatusText}
        </p>
      </div>
      <div className="mvp15-topbar-actions flex flex-wrap gap-2">
        <Button data-testid="run-button" onClick={onRun}>
          {t("topbarRun")}
        </Button>
        <Button data-testid="reset-button" variant="secondary" onClick={onReset}>
          {t("topbarReset")}
        </Button>
        <Button data-testid="undo-button" variant="outline" disabled={!undoAvailable} onClick={onUndo}>
          {t("topbarUndo")}
        </Button>
        <Button data-testid="redo-button" variant="outline" disabled={!redoAvailable} onClick={onRedo}>
          {t("topbarRedo")}
        </Button>
        <Button data-testid="save-local-button" variant="secondary" onClick={onSave}>
          {t("topbarSaveLocal")}
        </Button>
        <Button data-testid="load-local-button" variant="outline" onClick={onLoad}>
          {t("topbarLoadLocal")}
        </Button>
        <Button data-testid="load-coin-dash-template-button" variant="outline" onClick={onLoadTemplate}>
          {t("topbarLoadTemplate")}
        </Button>
      </div>
    </header>
  )
}
