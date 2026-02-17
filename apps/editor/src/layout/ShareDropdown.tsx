import { Copy, Send, ChevronDown } from "lucide-react"
import { useState } from "react"
import { Button } from "../components/ui/button.js"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from "../components/ui/dropdown-menu.js"
import type { EditorController } from "../features/editor-state/use-editor-controller.js"
import { buildSharePermalink, copyPermalinkToClipboard, publishProjectToShareApi } from "../features/share/share-api-client.js"

type ShareDropdownProps = {
  controller: EditorController
}

type ShareStatus = "idle" | "publishing" | "published" | "error"

export function ShareDropdown({ controller }: ShareDropdownProps) {
  const [shareStatus, setShareStatus] = useState<ShareStatus>("idle")
  const [sharePermalink, setSharePermalink] = useState("")
  const [copyStatus, setCopyStatus] = useState<"idle" | "copied" | "error">("idle")

  const publish = async (): Promise<void> => {
    try {
      setShareStatus("publishing")
      setCopyStatus("idle")
      const result = await publishProjectToShareApi(controller.project)
      const permalink = buildSharePermalink(window.location.origin, result.id)
      setSharePermalink(permalink)
      setShareStatus("published")
    } catch {
      setShareStatus("error")
    }
  }

  const copyLink = async (): Promise<void> => {
    if (!sharePermalink) {
      return
    }
    try {
      await copyPermalinkToClipboard(sharePermalink)
      setCopyStatus("copied")
    } catch {
      setCopyStatus("error")
    }
  }

  const isShared = shareStatus === "published" && Boolean(sharePermalink)

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          data-testid="header-share-trigger"
          variant="ghost"
          size="sm"
          className="mvp19-share-dropdown-trigger h-7 gap-1.5 px-2 text-xs text-slate-500 hover:text-slate-800"
        >
          <span
            className={`mvp19-share-dot inline-block h-2 w-2 shrink-0 rounded-full ${isShared ? "bg-emerald-500" : "bg-slate-300"}`}
          />
          Share
          <ChevronDown className="h-3.5 w-3.5" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="mvp19-share-dropdown-content w-72">
        <DropdownMenuLabel>Compartir joc</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem data-testid="header-share-publish-item" onSelect={() => void publish()}>
          <Send className="h-4 w-4 text-slate-500" />
          {shareStatus === "publishing" ? "Publicant..." : "Publicar joc"}
        </DropdownMenuItem>
        <DropdownMenuItem
          data-testid="header-share-copy-item"
          onSelect={() => void copyLink()}
          disabled={!sharePermalink}
        >
          <Copy className="h-4 w-4 text-slate-500" />
          Copiar enllac
        </DropdownMenuItem>
        {sharePermalink && (
          <>
            <DropdownMenuSeparator />
            <div className="mvp19-share-dropdown-link px-2 py-1 text-xs text-slate-500 break-all">
              {sharePermalink}
            </div>
          </>
        )}
        {copyStatus === "copied" && (
          <div data-testid="header-share-copy-status" className="mvp19-share-dropdown-copy-ok px-2 py-1 text-xs text-emerald-600">
            Enllac copiat.
          </div>
        )}
        {copyStatus === "error" && (
          <div className="mvp19-share-dropdown-copy-error px-2 py-1 text-xs text-red-600">
            No s&apos;ha pogut copiar l&apos;enllac.
          </div>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
