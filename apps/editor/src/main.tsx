import { posthog } from "posthog-js"
import React from "react"
import { createRoot } from "react-dom/client"
import { App } from "./App.js"
import { initKvStorageProvider } from "./features/storage/get-kv-storage-provider.js"
import "./index.css"

const posthogKey = import.meta.env.VITE_PUBLIC_POSTHOG_KEY
const posthogHost = import.meta.env.VITE_PUBLIC_POSTHOG_HOST
if (posthogKey && posthogHost) {
  posthog.init(posthogKey, {
    api_host: posthogHost ?? "/ingest",
    ui_host: "https://us.posthog.com",
    person_profiles: "identified_only",
    capture_pageview: true,
    capture_pageleave: true
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
