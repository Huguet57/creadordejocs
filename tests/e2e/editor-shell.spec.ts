import { expect, test } from "@playwright/test"

test.beforeEach(async ({ page }) => {
  await page.goto("/")
})

test("navigates sidebar sections and keeps modular editors available", async ({ page }) => {
  await page.getByTestId("sidebar-sprites").click()
  await expect(page.getByRole("heading", { name: "Sprite editor" })).toBeVisible()

  await page.getByTestId("sidebar-sounds").click()
  await expect(page.getByRole("heading", { name: "Sound editor" })).toBeVisible()

  await page.getByTestId("sidebar-objects").click()
  await expect(page.getByRole("heading", { name: "Object editor" })).toBeVisible()

  await page.getByTestId("sidebar-rooms").click()
  await expect(page.getByRole("heading", { name: "Room editor" })).toBeVisible()

  await page.getByTestId("sidebar-run").click()
  await expect(page.getByRole("heading", { name: "Run preview" })).toBeVisible()
})

test("creates sprite, sound, object and object listener", async ({ page }) => {
  await page.getByTestId("sidebar-sprites").click()
  await page.getByTestId("sprite-name-input").fill("Ship")
  await page.getByTestId("add-sprite-button").click()
  await expect(page.getByText("Ship", { exact: true })).toBeVisible()

  await page.getByTestId("sidebar-sounds").click()
  await page.getByLabel("Sound name").fill("Laser")
  await page.getByRole("button", { name: "+ Sound" }).click()
  await expect(page.getByText("Laser", { exact: true })).toBeVisible()

  await page.getByTestId("sidebar-objects").click()
  await page.getByTestId("object-name-input").fill("PlayerShip")
  await page.getByTestId("add-object-button").click()
  await expect(page.getByRole("button", { name: "PlayerShip" })).toBeVisible()
  await page.getByRole("button", { name: "PlayerShip" }).click()

  await page.getByTestId("object-event-type-select").selectOption("Create")
  await page.getByTestId("add-object-event-button").click()
  await expect(page.locator(".mvp2-object-event-row")).toHaveCount(1)
  await page.getByRole("button", { name: "+ Action block" }).click()
  await expect(page.locator(".mvp2-object-action-row")).toHaveCount(1)
})

test("loads dodge template and runs gameplay hud", async ({ page }) => {
  await page.getByTestId("load-dodge-template-button").click()
  await page.getByTestId("sidebar-run").click()
  await expect(page.getByTestId("run-score")).toContainText("Score:")
  await expect(page.getByTestId("run-game-state")).toContainText("Running")
})
