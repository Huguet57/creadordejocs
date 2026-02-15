import { useState } from "react"
import { Copy, Send } from "lucide-react"
import type { EditorController } from "../editor-state/use-editor-controller.js"
import { Button } from "../../components/ui/button.js"
import { Input } from "../../components/ui/input.js"
import { buildSharePermalink, copyPermalinkToClipboard, publishProjectToShareApi } from "./share-api-client.js"

type ShareSectionProps = {
  controller: EditorController
}

type ShareStatus = "idle" | "publishing" | "published" | "error"

function statusMessage(status: ShareStatus, hasPermalink: boolean): string {
  if (status === "publishing") {
    return "Publicant joc..."
  }
  if (status === "published" && hasPermalink) {
    return "Enllaç preparat. Ja el pots compartir."
  }
  if (status === "error") {
    return "No s'ha pogut publicar el joc. Torna-ho a provar."
  }
  return "Publica el joc i comparteix l'enllaç amb els teus amics."
}

export function ShareSection({ controller }: ShareSectionProps) {
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

  return (
    <section className="mvp-share-section flex min-h-[700px] w-full flex-col gap-4 rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
      <header className="mvp-share-header space-y-1">
        <h2 className="mvp-share-title text-xl font-semibold text-slate-900">Share</h2>
        <p className="mvp-share-subtitle text-sm text-slate-500">{statusMessage(shareStatus, Boolean(sharePermalink))}</p>
      </header>

      <div className="mvp-share-actions flex flex-wrap items-center gap-2">
        <Button
          data-testid="share-publish-button"
          className="mvp-share-publish-button"
          onClick={() => void publish()}
          disabled={shareStatus === "publishing"}
        >
          <Send className="mr-2 h-4 w-4" />
          {shareStatus === "publishing" ? "Publicant..." : "Publicar joc"}
        </Button>
        <Button
          data-testid="share-copy-button"
          className="mvp-share-copy-button"
          variant="outline"
          onClick={() => void copyLink()}
          disabled={!sharePermalink}
        >
          <Copy className="mr-2 h-4 w-4" />
          Copiar enllaç
        </Button>
      </div>

      <div className="mvp-share-link-container space-y-2">
        <label htmlFor="share-link-input" className="mvp-share-link-label text-xs font-semibold uppercase tracking-wider text-slate-500">
          Permalink
        </label>
        <Input
          id="share-link-input"
          data-testid="share-link-input"
          className="mvp-share-link-input"
          readOnly
          value={sharePermalink}
          placeholder="https://creadordejocs.com/play/..."
        />
        {copyStatus === "copied" && (
          <p data-testid="share-copy-status" className="mvp-share-copy-status text-xs text-emerald-600">
            Enllaç copiat.
          </p>
        )}
        {copyStatus === "error" && (
          <p data-testid="share-copy-error" className="mvp-share-copy-error text-xs text-red-600">
            No s'ha pogut copiar l'enllaç.
          </p>
        )}
      </div>
    </section>
  )
}
