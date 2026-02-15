import { expect, test } from "@playwright/test"

test.beforeEach(async ({ page }) => {
  await page.goto("/editor")
})

test("navigates sidebar sections and keeps modular editors available", async ({ page }) => {
  await page.getByTestId("sidebar-sprites").click()
  await expect(page.getByText("Sprites", { exact: true }).first()).toBeVisible()

  await page.getByTestId("sidebar-sounds").click()
  await expect(page.getByText("Sounds", { exact: true }).first()).toBeVisible()

  await page.getByTestId("sidebar-objects").click()
  await expect(page.getByText("Objects", { exact: true }).first()).toBeVisible()

  await page.getByTestId("sidebar-rooms").click()
  await expect(page.getByText("Rooms", { exact: true }).first()).toBeVisible()

  await page.getByTestId("sidebar-run").click()
  await expect(page.getByText("Run", { exact: true }).first()).toBeVisible()
})

test("creates sprite, sound, object and object listener", async ({ page }) => {
  // Create sprite
  await page.getByTestId("sidebar-sprites").click()
  await page.getByRole("button", { name: "Add Sprite" }).click()
  await page.locator("input[placeholder='Name...']").fill("Ship")
  await page.locator("input[placeholder='Name...']").press("Enter")
  await expect(page.getByText("Ship", { exact: true }).first()).toBeVisible()

  // Create sound
  await page.getByTestId("sidebar-sounds").click()
  await page.getByRole("button", { name: "Add Sound" }).click()
  await page.locator("input[placeholder='Name...']").fill("Laser")
  await page.locator("input[placeholder='Name...']").press("Enter")
  await expect(page.getByText("Laser", { exact: true }).first()).toBeVisible()

  // Create object
  await page.getByTestId("sidebar-objects").click()
  await page.getByRole("button", { name: "Add Object" }).click()
  await page.locator("input[placeholder='Name...']").fill("PlayerShip")
  await page.locator("input[placeholder='Name...']").press("Enter")
  await expect(page.getByText("PlayerShip")).toBeVisible()
  await page.getByText("PlayerShip").click()

  // Add event
  await page.getByRole("button", { name: "Add Event" }).click()
  await page.locator(".mvp3-event-list-panel button[title='Add event']").click()
  await expect(page.getByText("When")).toBeVisible()

  // Open the action picker and add a "move" action
  await page.locator(".mvp3-action-picker-toggle").click()
  await page.locator(".mvp3-action-picker-item").filter({ hasText: "Moure" }).click()
  await expect(page.locator(".action-block-container")).toBeVisible()
})

test("loads a template and runs gameplay hud", async ({ page }) => {
  await page.getByTestId("sidebar-templates").click()
  await page.getByRole("button", { name: "Load Template" }).first().click()
  await page.getByTestId("sidebar-run").click()
  await expect(page.getByTestId("run-score")).toBeVisible()
  await expect(page.getByTestId("run-game-state")).toContainText("Running")
})
