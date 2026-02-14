import { resolve } from "node:path"
import { fileURLToPath } from "node:url"
import react from "@vitejs/plugin-react"
import { defineConfig } from "vite"

const editorRoot = fileURLToPath(new URL(".", import.meta.url))

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": resolve(editorRoot, "src"),
      "@creadordejocs/project-format": resolve(
        editorRoot,
        "../../packages/project-format/src/index.ts"
      )
    }
  }
})
