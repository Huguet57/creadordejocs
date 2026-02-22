import { useState } from "react"
import { Copy, Send } from "lucide-react"
import { t } from "@/i18n/index.js"
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
    return t("shareStatusPublishing")
  }
  if (status === "published" && hasPermalink) {
    return t("shareStatusPublished")
  }
  if (status === "error") {
    return t("shareStatusError")
  }
  return t("shareStatusIdle")
}

function stateBadge(status: ShareStatus, hasPermalink: boolean): { label: string; className: string } {
  if (status === "publishing") {
    return { label: t("shareBadgePublishing"), className: "bg-amber-100 text-amber-800" }
  }
  if (status === "published" && hasPermalink) {
    return { label: t("shareBadgePublished"), className: "bg-emerald-100 text-emerald-800" }
  }
  if (status === "error") {
    return { label: t("shareBadgeError"), className: "bg-red-100 text-red-800" }
  }
  return { label: t("shareBadgeIdle"), className: "bg-slate-100 text-slate-700" }
}

export function ShareSection({ controller }: ShareSectionProps) {
  const [shareStatus, setShareStatus] = useState<ShareStatus>("idle")
  const [sharePermalink, setSharePermalink] = useState("")
  const [copyStatus, setCopyStatus] = useState<"idle" | "copied" | "error">("idle")
  const currentState = stateBadge(shareStatus, Boolean(sharePermalink))

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
    <section className="mvp-share-section flex h-full w-full flex-col gap-4 overflow-y-auto rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
      <header className="mvp-share-header space-y-2">
        <div className="mvp-share-title-row flex items-center gap-2">
          <h2 className="mvp-share-title text-xl font-semibold text-slate-900">{t("shareTitle")}</h2>
          <span
            data-testid="share-state-badge"
            className={`mvp-share-state-badge rounded-full px-2 py-0.5 text-xs font-medium ${currentState.className}`}
          >
            {currentState.label}
          </span>
        </div>
        <p className="mvp-share-subtitle text-sm text-slate-500" aria-live="polite">
          {statusMessage(shareStatus, Boolean(sharePermalink))}
        </p>
      </header>

      <div className="mvp-share-explainer rounded-md border border-slate-200 bg-slate-50 p-3">
        <p className="mvp-share-explainer-title text-sm font-semibold text-slate-800">{t("shareExplainerTitle")}</p>
        <ul className="mvp-share-explainer-list mt-2 list-disc space-y-1 pl-5 text-xs text-slate-600">
          <li>{t("shareExplainerPublish")}</li>
          <li>{t("shareExplainerPlayOnly")}</li>
          <li>{t("shareExplainerRepublish")}</li>
        </ul>
      </div>

      <div className="mvp-share-actions flex flex-wrap items-center gap-2">
        <Button
          data-testid="share-publish-button"
          className="mvp-share-publish-button"
          onClick={() => void publish()}
          disabled={shareStatus === "publishing"}
        >
          <Send className="mr-2 h-4 w-4" />
          {shareStatus === "publishing" ? t("sharePublishButtonPublishing") : t("sharePublishButton")}
        </Button>
        <Button
          data-testid="share-copy-button"
          className="mvp-share-copy-button"
          variant="outline"
          onClick={() => void copyLink()}
          disabled={!sharePermalink}
        >
          <Copy className="mr-2 h-4 w-4" />
          {t("shareCopyLinkButton")}
        </Button>
      </div>

      <div className="mvp-share-link-container space-y-2">
        <label htmlFor="share-link-input" className="mvp-share-link-label text-xs font-semibold uppercase tracking-wider text-slate-500">
          {t("sharePermalinkLabel")}
        </label>
        <Input
          id="share-link-input"
          data-testid="share-link-input"
          className="mvp-share-link-input"
          readOnly
          value={sharePermalink}
          placeholder={t("sharePermalinkPlaceholder")}
        />
        {!sharePermalink && (
          <p data-testid="share-not-published" className="mvp-share-not-published text-xs text-slate-500">
            {t("shareNotPublished")}
          </p>
        )}
        {sharePermalink && (
          <p data-testid="share-published-note" className="mvp-share-published-note text-xs text-slate-500">
            {t("sharePublishedNote")}
          </p>
        )}
        {copyStatus === "copied" && (
          <p data-testid="share-copy-status" className="mvp-share-copy-status text-xs text-emerald-600">
            {t("shareCopied")}
          </p>
        )}
        {copyStatus === "error" && (
          <p data-testid="share-copy-error" className="mvp-share-copy-error text-xs text-red-600">
            {t("shareCopyError")}
          </p>
        )}
      </div>
    </section>
  )
}
