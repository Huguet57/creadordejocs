import { expect, test } from "@playwright/test"

test.beforeEach(async ({ page }) => {
  await page.goto("/")
})

test("recovers autosaved state after reload", async ({ page }) => {
  await page.getByTestId("sidebar-objects").click()
  await page.getByTestId("object-name-input").fill("AutoRecover")
  await page.getByTestId("add-object-button").click()

  const objectChip = page.getByRole("button", { name: "AutoRecover" })
  await expect(objectChip).toBeVisible()

  await page.getByTestId("add-object-event-button").click()
  await expect(page.getByTestId("save-status")).toContainText("Saved", { timeout: 10000 })
  await page.reload()

  await expect(page.getByRole("button", { name: "AutoRecover" })).toBeVisible()
})

test("supports undo and redo via keyboard shortcuts", async ({ page }) => {
  const modifier = process.platform === "darwin" ? "Meta" : "Control"

  await page.getByTestId("sidebar-objects").click()
  await page.getByTestId("object-name-input").fill("UndoHero")
  await page.getByTestId("add-object-button").click()
  await expect(page.getByRole("button", { name: "UndoHero" })).toBeVisible()

  await page.keyboard.press(`${modifier}+z`)
  await expect(page.getByRole("button", { name: "UndoHero" })).toHaveCount(0)

  await page.keyboard.press(`${modifier}+y`)
  await expect(page.getByRole("button", { name: "UndoHero" })).toBeVisible()
})
