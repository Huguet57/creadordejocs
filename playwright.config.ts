import { defineConfig } from "@playwright/test"

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: true,
  retries: 0,
  webServer: {
    command: "npm run dev -w @creadordejocs/editor -- --host localhost --port 4173",
    url: "http://localhost:4173",
    reuseExistingServer: true,
    timeout: 120 * 1000
  },
  use: {
    headless: true,
    baseURL: "http://localhost:4173"
  }
})
