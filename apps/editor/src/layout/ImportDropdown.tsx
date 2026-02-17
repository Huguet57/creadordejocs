import { Download, FileUp, ChevronDown } from "lucide-react"
import { useRef, useState, type ChangeEvent } from "react"
import { Button } from "../components/ui/button.js"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from "../components/ui/dropdown-menu.js"
import type { EditorController } from "../features/editor-state/use-editor-controller.js"
import { downloadProjectAsJson } from "../features/templates/export-project.js"

type ImportDropdownProps = {
  controller: EditorController
}

export function ImportDropdown({ controller }: ImportDropdownProps) {
  const [exportStatus, setExportStatus] = useState<"idle" | "error">("idle")
  const importInputRef = useRef<HTMLInputElement | null>(null)

  const exportCurrentProject = (): void => {
    try {
      downloadProjectAsJson(controller.project)
      setExportStatus("idle")
    } catch {
      setExportStatus("error")
    }
  }

  const openImportPicker = (): void => {
    controller.resetImportStatus()
    importInputRef.current?.click()
  }

  const importFromFile = async (event: ChangeEvent<HTMLInputElement>): Promise<void> => {
    const selectedFile = event.currentTarget.files?.[0]
    event.currentTarget.value = ""
    if (!selectedFile) {
      return
    }
    controller.resetImportStatus()
    await controller.importProjectFromJsonFile(selectedFile)
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            data-testid="header-import-trigger"
            variant="ghost"
            size="sm"
            className="mvp19-import-dropdown-trigger h-7 gap-1 px-2 text-xs text-slate-500 hover:text-slate-800"
          >
            Import
            <ChevronDown className="h-3.5 w-3.5" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="mvp19-import-dropdown-content w-52">
          <DropdownMenuItem data-testid="header-import-json-item" onSelect={openImportPicker}>
            <FileUp className="h-4 w-4 text-slate-500" />
            Importar joc (.json)
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem data-testid="header-export-json-item" onSelect={exportCurrentProject}>
            <Download className="h-4 w-4 text-slate-500" />
            Exportar joc actual
          </DropdownMenuItem>
          {exportStatus === "error" && (
            <>
              <DropdownMenuSeparator />
              <div className="mvp19-import-dropdown-export-error px-2 py-1 text-xs text-red-600">
                No s&apos;ha pogut exportar el joc. Torna-ho a provar.
              </div>
            </>
          )}
          {controller.importStatus === "importing" && (
            <>
              <DropdownMenuSeparator />
              <div className="mvp19-import-dropdown-importing px-2 py-1 text-xs text-amber-700">Important joc...</div>
            </>
          )}
          {controller.importStatus === "imported" && (
            <>
              <DropdownMenuSeparator />
              <div className="mvp19-import-dropdown-imported px-2 py-1 text-xs text-emerald-700">Joc importat correctament.</div>
            </>
          )}
          {controller.importStatus === "error" && (
            <>
              <DropdownMenuSeparator />
              <div className="mvp19-import-dropdown-import-error px-2 py-1 text-xs text-red-600">No s&apos;ha pogut importar el fitxer.</div>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
      <input
        ref={importInputRef}
        type="file"
        accept="application/json,.json"
        className="mvp19-import-dropdown-input hidden"
        onChange={(event) => void importFromFile(event)}
      />
    </>
  )
}
