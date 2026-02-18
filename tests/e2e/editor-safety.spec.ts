import { expect, test } from "@playwright/test"

test.beforeEach(async ({ page }) => {
  await page.goto("/editor")
})

test("recovers autosaved state after reload", async ({ page }) => {
  await page.getByTestId("sidebar-objects").click()

  // Open add form, type name, confirm
  await page.locator(".objlist-add-btn").click()
  await page.locator(".objlist-add-form-inline input").fill("AutoRecover")
  await page.locator(".objlist-add-form-inline input").press("Enter")

  await expect(page.locator(".objlist-item", { hasText: "AutoRecover" }).first()).toBeVisible()

  // Add an event to trigger a change and wait for autosave
  await page.locator(".objlist-item", { hasText: "AutoRecover" }).first().click()
  await page.getByRole("button", { name: "Add Event" }).click()
  await page.locator(".mvp24-event-picker-item").filter({ hasText: "Create" }).click()

  await expect(page.getByTestId("save-status")).toContainText("Saved", { timeout: 10000 })
  await page.reload()

  await expect(page.locator(".objlist-item", { hasText: "AutoRecover" }).first()).toBeVisible()
})

test("supports undo and redo via keyboard shortcuts", async ({ page }) => {
  const modifier = process.platform === "darwin" ? "Meta" : "Control"

  await page.getByTestId("sidebar-objects").click()

  // Open add form, type name, confirm
  await page.locator(".objlist-add-btn").click()
  await page.locator(".objlist-add-form-inline input").fill("UndoHero")
  await page.locator(".objlist-add-form-inline input").press("Enter")
  await expect(page.locator(".objlist-item", { hasText: "UndoHero" }).first()).toBeVisible()

  await page.keyboard.press(`${modifier}+z`)
  await expect(page.locator(".objlist-item", { hasText: "UndoHero" })).toHaveCount(0)

  await page.keyboard.press(`${modifier}+y`)
  await expect(page.locator(".objlist-item", { hasText: "UndoHero" }).first()).toBeVisible()
})
