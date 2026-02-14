import { execSync } from "node:child_process"
import { expect, test } from "@playwright/test"

test("builds and runs hello scene flow", () => {
  const output = execSync("npm run build && node apps/player/dist/main.js", {
    cwd: process.cwd(),
    encoding: "utf-8"
  })

  expect(output).toContain("Player ready for Hello Scene")
  expect(output).toContain("appStart:")
  expect(output).toContain("projectLoad:")
})
