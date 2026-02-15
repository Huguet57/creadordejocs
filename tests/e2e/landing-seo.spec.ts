import { expect, test } from "@playwright/test"

test("shows SEO landing and opens editor without login", async ({ page }) => {
  await page.goto("/")

  await expect(
    page.getByRole("heading", {
      level: 1,
      name: "Creador de jocs: com crear un joc sense programar"
    })
  ).toBeVisible()
  await expect(page.getByText("Comença gratis sense login")).toBeVisible()

  await page.getByTestId("landing-primary-cta").click()

  await expect(page).toHaveURL(/\/editor$/)
  await expect(page.getByTestId("sidebar-sprites")).toBeVisible()
})
