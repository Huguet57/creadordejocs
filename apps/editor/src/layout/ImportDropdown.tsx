import { Download, FileUp, FilePlus2, Pencil, Trash2, ChevronDown, FolderOpen } from "lucide-react"
import { useRef, useState, type ChangeEvent } from "react"
import { Button } from "../components/ui/button.js"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger
} from "../components/ui/dropdown-menu.js"
import type { EditorController } from "../features/editor-state/use-editor-controller.js"
import { downloadProjectAsJson } from "../features/templates/export-project.js"

type ImportDropdownProps = {
  controller: EditorController
}

export function ImportDropdown({ controller }: ImportDropdownProps) {
  const [exportStatus, setExportStatus] = useState<"idle" | "error">("idle")
  const [pendingImportMode, setPendingImportMode] = useState<"create-new" | "replace-active">("replace-active")
  const importInputRef = useRef<HTMLInputElement | null>(null)

  const exportCurrentProject = (): void => {
    try {
      downloadProjectAsJson(controller.project)
      setExportStatus("idle")
    } catch {
      setExportStatus("error")
    }
  }

  const openImportPicker = (mode: "create-new" | "replace-active"): void => {
    controller.resetImportStatus()
    setPendingImportMode(mode)
    importInputRef.current?.click()
  }

  const importFromFile = async (event: ChangeEvent<HTMLInputElement>): Promise<void> => {
    const selectedFile = event.currentTarget.files?.[0]
    event.currentTarget.value = ""
    if (!selectedFile) {
      return
    }
    controller.resetImportStatus()
    await controller.importProjectFromJsonFile(selectedFile, pendingImportMode)
  }

  const renameActiveProject = (): void => {
    const currentName = controller.project.metadata.name
    const nextName = window.prompt("Nom del projecte", currentName)
    if (nextName === null) {
      return
    }
    controller.renameActiveProject(nextName)
  }

  const deleteActiveProject = async (): Promise<void> => {
    const confirmed = window.confirm("Vols esborrar el projecte actiu?")
    if (!confirmed) {
      return
    }
    await controller.deleteActiveProject()
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
            Game
            <ChevronDown className="h-3.5 w-3.5" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="mvp19-import-dropdown-content w-72">
          <DropdownMenuLabel>Projectes</DropdownMenuLabel>
          <DropdownMenuRadioGroup value={controller.activeProjectId} onValueChange={(value) => void controller.switchProject(value)}>
            {controller.projects.map((projectSummary) => (
              <DropdownMenuRadioItem key={projectSummary.projectId} value={projectSummary.projectId}>
                <FolderOpen className="h-4 w-4 text-slate-500" />
                <span className="truncate">{projectSummary.name}</span>
              </DropdownMenuRadioItem>
            ))}
          </DropdownMenuRadioGroup>

          <DropdownMenuSeparator />

          <DropdownMenuItem data-testid="header-create-blank-item" onSelect={() => controller.createBlankProject()}>
            <FilePlus2 className="h-4 w-4 text-slate-500" />
            Crear joc en blanc...
          </DropdownMenuItem>
          <DropdownMenuItem data-testid="header-rename-project-item" onSelect={renameActiveProject}>
            <Pencil className="h-4 w-4 text-slate-500" />
            Renombrar projecte actiu...
          </DropdownMenuItem>
          <DropdownMenuItem data-testid="header-delete-project-item" onSelect={() => void deleteActiveProject()}>
            <Trash2 className="h-4 w-4 text-slate-500" />
            Esborrar projecte actiu...
          </DropdownMenuItem>

          <DropdownMenuSeparator />

          <DropdownMenuSub>
            <DropdownMenuSubTrigger data-testid="header-import-json-item">
              <FileUp className="h-4 w-4 text-slate-500" />
              Importar joc (.json)
            </DropdownMenuSubTrigger>
            <DropdownMenuSubContent className="w-60">
              <DropdownMenuItem data-testid="header-import-json-new-item" onSelect={() => openImportPicker("create-new")}>
                Com a projecte nou
              </DropdownMenuItem>
              <DropdownMenuItem
                data-testid="header-import-json-replace-item"
                onSelect={() => openImportPicker("replace-active")}
              >
                Sobreescriure projecte actiu
              </DropdownMenuItem>
            </DropdownMenuSubContent>
          </DropdownMenuSub>

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
