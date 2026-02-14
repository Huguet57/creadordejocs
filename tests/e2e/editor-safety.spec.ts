import { expect, test } from "@playwright/test"

test.beforeEach(async ({ page }) => {
  await page.goto("/")
})

test("recovers autosaved state after reload", async ({ page }) => {
  await page.getByTestId("sidebar-objects").click()

  // Open add form, type name, confirm
  await page.getByRole("button", { name: "Add Object" }).click()
  await page.locator("input[placeholder='Name...']").fill("AutoRecover")
  await page.locator("input[placeholder='Name...']").press("Enter")

  await expect(page.getByText("AutoRecover")).toBeVisible()

  // Add an event to trigger a change and wait for autosave
  await page.getByText("AutoRecover").click()
  await page.getByRole("button", { name: "Add Event" }).click()
  await page.locator(".mvp3-event-list-panel button[title='Add event']").click()

  await expect(page.getByTestId("save-status")).toContainText("Saved", { timeout: 10000 })
  await page.reload()

  await expect(page.getByText("AutoRecover")).toBeVisible()
})

test("supports undo and redo via keyboard shortcuts", async ({ page }) => {
  const modifier = process.platform === "darwin" ? "Meta" : "Control"

  await page.getByTestId("sidebar-objects").click()

  // Open add form, type name, confirm
  await page.getByRole("button", { name: "Add Object" }).click()
  await page.locator("input[placeholder='Name...']").fill("UndoHero")
  await page.locator("input[placeholder='Name...']").press("Enter")
  await expect(page.getByText("UndoHero")).toBeVisible()

  await page.keyboard.press(`${modifier}+z`)
  await expect(page.getByText("UndoHero")).toHaveCount(0)

  await page.keyboard.press(`${modifier}+y`)
  await expect(page.getByText("UndoHero")).toBeVisible()
})
