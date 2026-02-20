import { expect, test } from "@playwright/test"

test.beforeEach(async ({ page }) => {
  await page.goto("/editor")
})

test("shows Google sign in action in header", async ({ page }) => {
  await expect(page.getByTestId("auth-button")).toHaveText("Sign in with Google")
})

test("navigates sidebar sections and keeps modular editors available", async ({ page }) => {
  await expect(page.getByTestId("header-import-trigger")).toBeVisible()
  await expect(page.getByTestId("header-share-trigger")).toBeVisible()
  await expect(page.getByTestId("auth-button")).toBeVisible()
  await expect(page.getByTestId("sidebar-share")).toHaveCount(0)

  await page.getByTestId("sidebar-sprites").click()
  await expect(page.getByText("Sprites", { exact: true }).first()).toBeVisible()

  await page.getByTestId("sidebar-objects").click()
  await expect(page.getByText("Objects", { exact: true }).first()).toBeVisible()

  await page.getByTestId("sidebar-rooms").click()
  await expect(page.getByText("Rooms", { exact: true }).first()).toBeVisible()

  await page.getByTestId("sidebar-run").click()
  await expect(page.getByText("Run", { exact: true }).first()).toBeVisible()
})

test("creates and switches local projects from Game menu", async ({ page }) => {
  await page.getByTestId("header-import-trigger").click()
  await page.getByTestId("header-create-blank-item").click()

  await page.getByTestId("header-import-trigger").click()
  const projectItems = page.getByRole("menuitemradio")
  await expect(projectItems).toHaveCount(2)

  await projectItems.first().click()
  await expect(page.getByTestId("header-import-trigger")).toBeVisible()
})

test("creates sprite, object and object listener", async ({ page }) => {
  // Create sprite
  await page.getByTestId("sidebar-sprites").click()
  await page.locator(".mvp16-sprite-add-btn").click()
  await page.locator(".mvp16-sprite-add-inline input[placeholder='Sprite nou']").fill("Ship")
  await page.locator(".mvp16-sprite-add-inline input[placeholder='Sprite nou']").press("Enter")
  await expect(page.getByText("Ship", { exact: true }).first()).toBeVisible()

  // Create object
  await page.getByTestId("sidebar-objects").click()
  await page.locator(".objlist-add-btn").click()
  await page.locator(".objlist-add-form-inline input").fill("PlayerShip")
  await page.locator(".objlist-add-form-inline input").press("Enter")
  await expect(page.locator(".objlist-item", { hasText: "PlayerShip" }).first()).toBeVisible()
  await page.locator(".objlist-item", { hasText: "PlayerShip" }).first().click()

  // Add event
  await page.getByRole("button", { name: "Add Event" }).click()
  await page.locator(".mvp24-event-picker-item").filter({ hasText: "Create" }).click()
  await expect(page.getByText("When")).toBeVisible()

  // Open the action picker and add a "move" action
  await page.locator(".mvp3-action-picker-toggle").click()
  await page.getByRole("button", { name: "Moure", exact: true }).click()
  await expect(page.locator(".action-block-container")).toBeVisible()
})

test("loads a template and runs gameplay hud", async ({ page }) => {
  await page.getByTestId("sidebar-templates").click()
  await page.getByRole("button", { name: "Load Template" }).first().click()
  await page.getByTestId("sidebar-run").click()
  await expect(page.getByTestId("run-score")).toBeVisible()
  await expect(page.getByTestId("run-game-state")).toContainText("Running")
})
