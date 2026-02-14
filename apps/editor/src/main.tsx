import React from "react"
import { createRoot } from "react-dom/client"
import { App } from "./App.js"
import "./index.css"

const rootNode = document.getElementById("root")
if (!rootNode) {
  throw new Error("Root node #root not found")
}

createRoot(rootNode).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
)
