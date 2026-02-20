import { expect, test, type Page } from "@playwright/test"

async function createLargeSprite(page: Page): Promise<void> {
  await page.goto("/editor")
  await page.getByTestId("sidebar-sprites").click()
  await page.locator(".mvp16-sprite-add-btn").click()

  const addForm = page.locator(".mvp16-sprite-add-inline")
  const nameInput = addForm.getByPlaceholder("Sprite nou")
  await nameInput.fill("LargeSprite")

  const dimensionInputs = addForm.locator("input[inputmode='numeric']")
  await dimensionInputs.nth(0).fill("256")
  await dimensionInputs.nth(1).fill("200")
  await nameInput.press("Enter")

  await page.locator(".mvp16-sprite-item", { hasText: "LargeSprite" }).first().click()
}

test("handles large sprites with import, zoom and canvas scroll", async ({ page }) => {
  await createLargeSprite(page)

  await expect(page.getByRole("button", { name: "Import" })).toBeVisible()

  const zoomSlider = page.getByTestId("sprite-zoom-slider")
  await expect(zoomSlider).toHaveAttribute("min", "1")

  const sliderMax = await zoomSlider.getAttribute("max")
  await zoomSlider.evaluate((element, max) => {
    const input = element as HTMLInputElement
    const descriptor = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")!
    descriptor.set!.call(input, max)
    input.dispatchEvent(new Event("input", { bubbles: true }))
  }, sliderMax)

  const viewport = page.getByTestId("sprite-canvas-viewport")
  const beforeScroll = await viewport.evaluate((element) => ({
    scrollWidth: element.scrollWidth,
    clientWidth: element.clientWidth,
    scrollHeight: element.scrollHeight,
    clientHeight: element.clientHeight
  }))

  expect(beforeScroll.scrollWidth).toBeGreaterThanOrEqual(beforeScroll.clientWidth)
  expect(beforeScroll.scrollHeight).toBeGreaterThanOrEqual(beforeScroll.clientHeight)

  const afterScroll = await viewport.evaluate((element) => {
    element.scrollLeft = 220
    element.scrollTop = 180
    return { left: element.scrollLeft, top: element.scrollTop }
  })

  expect(afterScroll.left).toBeGreaterThan(0)
  expect(afterScroll.top).toBeGreaterThan(0)

  const fitButton = page.getByTestId("sprite-zoom-fit")
  await expect(fitButton).toBeVisible()

  await fitButton.click()
  const fitZoomValue = Number(await zoomSlider.inputValue())
  expect(fitZoomValue).toBeGreaterThanOrEqual(1)
  expect(fitZoomValue).toBeLessThan(10)
})

test("keeps pencil, select and move usable on large sprites", async ({ page }) => {
  await createLargeSprite(page)

  const canvas = page.getByTestId("sprite-canvas")
  await expect(canvas).toBeVisible()

  const box = await canvas.boundingBox()
  if (!box) throw new Error("Canvas bounding box not available")

  const startX = box.x + 24
  const startY = box.y + 24

  await page.locator("button[title='#000000FF']").click()
  await page.mouse.click(startX, startY)
  await expect(page.locator(".mvp16-sprite-frame-preview").first()).toBeVisible()

  await page.locator(".mvp16-sprite-tool-list-btn", { hasText: "Select" }).click()
  await page.mouse.move(startX, startY)
  await page.mouse.down()
  await page.mouse.move(startX + 30, startY + 30)
  await page.mouse.up()

  await page.locator(".mvp16-sprite-tool-list-btn", { hasText: "Move" }).click()
  await page.mouse.move(startX + 10, startY + 10)
  await page.mouse.down()
  await page.mouse.move(startX + 60, startY + 50)
  await page.mouse.up()

  await expect(page.getByRole("button", { name: "Import" })).toBeVisible()
})
