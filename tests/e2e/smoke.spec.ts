import { execSync } from "node:child_process"
import { expect, test } from "@playwright/test"

test("builds and runs hello scene flow", () => {
  const buildAndRunPlayerCommand = [
    "node ./node_modules/typescript/bin/tsc -b --force packages/engine-core packages/project-format apps/player --pretty false",
    "node apps/player/dist/main.js"
  ].join(" && ")

  const output = execSync(buildAndRunPlayerCommand, {
    cwd: process.cwd(),
    encoding: "utf-8"
  })

  expect(output).toContain("Player ready for Hello Scene")
  expect(output).toContain("appStart:")
  expect(output).toContain("projectLoad:")
})
