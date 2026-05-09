import { expect, test } from "@playwright/test"

test("renders the app shell", async ({ page }) => {
  await page.goto("/")

  await expect(page.getByText("agent-html MVP")).toBeVisible()
  await expect(
    page.getByRole("heading", { name: "Phase 0 App Foundation" }),
  ).toBeVisible()
})
