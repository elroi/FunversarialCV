/**
 * Navigation E2E: Home ↔ Resources, key content visible.
 * TDD: tests define that main navigation flows work.
 */
import { test, expect } from "@playwright/test";

test.describe("Navigation", () => {
  test("Home → Resources → Back home: URL and key content", async ({
    page,
  }) => {
    await page.goto("/");

    await expect(page.getByText(/PII · client vault/i)).toBeVisible();
    const resourcesLink = page.getByRole("link", { name: /resources/i });
    await expect(resourcesLink).toBeVisible();
    await resourcesLink.click();

    await expect(page).toHaveURL(/\/resources$/);
    await expect(page.getByText("Usage and responsibility")).toBeVisible();
    await expect(page.getByRole("link", { name: /back home/i })).toBeVisible();

    await page.getByRole("link", { name: /back home/i }).click();

    await expect(page).toHaveURL("/");
    await expect(page.getByText(/PII · client vault/i)).toBeVisible();
  });
});
