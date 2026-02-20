import React from "react"
import { createRoot } from "react-dom/client"
import { App } from "./App.js"
import { initKvStorageProvider } from "./features/storage/get-kv-storage-provider.js"
import "./index.css"

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
