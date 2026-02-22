import { Download, FileUp, FilePlus2, Pencil, Trash2, ChevronDown, FolderOpen } from "lucide-react"
import { useRef, useState, type ChangeEvent } from "react"
import { t } from "@/i18n/index.js"
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
    const nextName = window.prompt(t("importPromptProjectName"), currentName)
    if (nextName === null) {
      return
    }
    controller.renameActiveProject(nextName)
  }

  const deleteActiveProject = async (): Promise<void> => {
    const confirmed = window.confirm(t("importConfirmDelete"))
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
            {t("importGameLabel")}
            <ChevronDown className="h-3.5 w-3.5" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="mvp19-import-dropdown-content w-72">
          <DropdownMenuLabel>{t("importProjectsLabel")}</DropdownMenuLabel>
          <div className="max-h-60 overflow-y-auto">
            <DropdownMenuRadioGroup value={controller.activeProjectId} onValueChange={(value) => void controller.switchProject(value)}>
              {controller.projects.map((projectSummary) => {
                const isActive = projectSummary.projectId === controller.activeProjectId
                return (
                  <div key={projectSummary.projectId} className="flex items-center">
                    <DropdownMenuRadioItem value={projectSummary.projectId} className="flex-1 min-w-0">
                      <FolderOpen className="h-4 w-4 shrink-0 text-slate-500" />
                      <span className="truncate">{projectSummary.name}</span>
                    </DropdownMenuRadioItem>
                    {isActive && (
                      <div className="flex shrink-0 items-center gap-0.5 pr-1.5">
                        <button
                          data-testid="header-rename-project-item"
                          className="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                          onClick={(e) => {
                            e.stopPropagation()
                            renameActiveProject()
                          }}
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                        <button
                          data-testid="header-delete-project-item"
                          className="rounded p-1 text-slate-400 hover:bg-red-50 hover:text-red-600"
                          onClick={(e) => {
                            e.stopPropagation()
                            void deleteActiveProject()
                          }}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    )}
                  </div>
                )
              })}
            </DropdownMenuRadioGroup>
          </div>

          <DropdownMenuSeparator />

          <DropdownMenuItem data-testid="header-create-blank-item" onSelect={() => controller.createBlankProject()}>
            <FilePlus2 className="h-4 w-4 text-slate-500" />
            {t("importCreateBlank")}
          </DropdownMenuItem>

          <DropdownMenuSub>
            <DropdownMenuSubTrigger data-testid="header-import-json-item">
              <FileUp className="h-4 w-4 text-slate-500" />
              {t("importJsonLabel")}
            </DropdownMenuSubTrigger>
            <DropdownMenuSubContent className="w-60">
              <DropdownMenuItem data-testid="header-import-json-new-item" onSelect={() => openImportPicker("create-new")}>
                {t("importJsonAsNew")}
              </DropdownMenuItem>
              <DropdownMenuItem
                data-testid="header-import-json-replace-item"
                onSelect={() => openImportPicker("replace-active")}
              >
                {t("importJsonReplace")}
              </DropdownMenuItem>
            </DropdownMenuSubContent>
          </DropdownMenuSub>

          <DropdownMenuItem data-testid="header-export-json-item" onSelect={exportCurrentProject}>
            <Download className="h-4 w-4 text-slate-500" />
            {t("importExport")}
          </DropdownMenuItem>

          {exportStatus === "error" && (
            <>
              <DropdownMenuSeparator />
              <div className="mvp19-import-dropdown-export-error px-2 py-1 text-xs text-red-600">
                {t("importErrorExport")}
              </div>
            </>
          )}
          {controller.importStatus === "importing" && (
            <>
              <DropdownMenuSeparator />
              <div className="mvp19-import-dropdown-importing px-2 py-1 text-xs text-amber-700">{t("importStatusImporting")}</div>
            </>
          )}
          {controller.importStatus === "imported" && (
            <>
              <DropdownMenuSeparator />
              <div className="mvp19-import-dropdown-imported px-2 py-1 text-xs text-emerald-700">{t("importStatusImported")}</div>
            </>
          )}
          {controller.importStatus === "error" && (
            <>
              <DropdownMenuSeparator />
              <div className="mvp19-import-dropdown-import-error px-2 py-1 text-xs text-red-600">{t("importErrorImport")}</div>
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
