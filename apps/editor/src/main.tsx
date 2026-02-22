import { posthog } from "posthog-js"
import React from "react"
import { createRoot } from "react-dom/client"
import { App } from "./App.js"
import { initKvStorageProvider } from "./features/storage/get-kv-storage-provider.js"
import "./index.css"

const posthogKey = import.meta.env.VITE_PUBLIC_POSTHOG_KEY
if (posthogKey) {
  posthog.init(posthogKey, {
    api_host: import.meta.env.VITE_PUBLIC_POSTHOG_HOST ?? "/ingest",
    ui_host: "https://us.posthog.com",
    person_profiles: "always",
    capture_pageview: true,
    capture_pageleave: true,
    respect_dnt: false,
    disable_compression: true,
    debug: true,
    disable_session_recording: false,
    loaded: (ph) => {
      ;(window as Window & { __ph?: unknown }).__ph = ph
      ph.startSessionRecording()
    }
  })
}

const rootNode = document.getElementById("root")
if (!rootNode) {
  throw new Error("Root node #root not found")
}

void initKvStorageProvider().then(() => {
  createRoot(rootNode).render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  )
})
