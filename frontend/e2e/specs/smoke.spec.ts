/**
 * Smoke E2E: app loads and main entry points are visible.
 * TDD: these tests define the minimum viable E2E pass.
 */
import { test, expect } from "@playwright/test";

test.describe("Smoke", () => {
  test("home page loads and shows trust line plus primary drop zone entry", async ({
    page,
  }) => {
    await page.goto("/");
    await expect(page.getByText(/PII · client vault/i)).toBeVisible();
  });

  test("home page shows drop zone when no file selected", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByText(/Drop your CV here/i)).toBeVisible();
  });
});
