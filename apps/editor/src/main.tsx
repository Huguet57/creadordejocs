import { posthog } from "posthog-js"
import React from "react"
import { createRoot } from "react-dom/client"
import { setActiveLocale } from "./i18n/index.js"
import { resolveLocaleFromHostname } from "./route-utils.js"
import { App } from "./App.js"
import { initKvStorageProvider } from "./features/storage/get-kv-storage-provider.js"
import "./index.css"

setActiveLocale(resolveLocaleFromHostname(window.location.hostname))

const posthogKey = import.meta.env.VITE_PUBLIC_POSTHOG_KEY?.trim()
const posthogApiHost = import.meta.env.VITE_PUBLIC_POSTHOG_HOST?.trim()
const isSecureProtocol = window.location.protocol === "https:"
if (posthogKey) {
  posthog.init(posthogKey, {
    api_host: posthogApiHost ?? "/ingest",
    ui_host: "https://us.posthog.com",
    person_profiles: "always",
    capture_pageview: true,
    capture_pageleave: true,
    disable_session_recording: false,
    cross_subdomain_cookie: false,
    secure_cookie: isSecureProtocol,
    loaded: (ph) => {
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
