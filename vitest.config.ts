import { defineConfig } from "vitest/config"
import { resolve } from "node:path"

export default defineConfig({
  resolve: {
    alias: {
      "@creadordejocs/engine-core": resolve(__dirname, "packages/engine-core/src/index.ts"),
      "@creadordejocs/project-format": resolve(__dirname, "packages/project-format/src/index.ts")
    }
  },
  test: {
    include: ["packages/**/*.test.ts", "tests/**/*.test.ts", "apps/**/*.test.ts"],
    exclude: ["**/dist/**", "**/node_modules/**", "**/coverage/**"]
  }
})
