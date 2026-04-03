/**
 * Validation section smoke: expand fold and see stable prompt id (BASE-00).
 * Security uses "Validation Lab"; HR uses "Try in an AI tool" (validationLabTitle).
 */
import { test, expect } from "@playwright/test";
import { ensureSecurityAudienceForE2e } from "../helpers/security-audience";
import { securityCopy } from "../../src/copy/security";
import { hrCopy } from "../../src/copy/hr";

test.describe("Validation section", () => {
  test("security audience: expand Validation Lab and see BASE-00", async ({ page }) => {
    await page.goto("/");
    await ensureSecurityAudienceForE2e(page);
    await page
      .getByRole("button", {
        name: new RegExp(
          `^${securityCopy.validationLabTitle}: show or hide`,
          "i"
        ),
      })
      .click();
    await expect(page.getByText("BASE-00", { exact: true })).toBeVisible();
  });

  test("security audience: fair-test step links Validation Lab to #validation-lab", async ({
    page,
  }) => {
    await page.goto("/");
    await ensureSecurityAudienceForE2e(page);
    await page
      .getByRole("button", { name: /how to run a fair test/i })
      .click();
    // Scoped to the protocol pointer step (same substring in HR/security copy).
    const stepLink = page
      .getByRole("listitem")
      .filter({ hasText: /External comparative evaluation steps end-to-end/ })
      .locator('a[href="#validation-lab"]');
    await expect(stepLink).toBeVisible({ timeout: 15_000 });
    await stepLink.click();
    await expect(page.locator("#validation-lab")).toBeVisible();
    const validationToggle = page.getByRole("button", {
      name: new RegExp(
        `^${securityCopy.validationLabTitle}: show or hide`,
        "i"
      ),
    });
    await expect(validationToggle).toHaveAttribute("aria-expanded", "true");
    await expect(validationToggle).toHaveClass(/attention-pulse/);
  });

  test("HR audience: expand Try in an AI tool and see BASE-00", async ({ page }) => {
    await page.goto("/");
    await page.waitForFunction(
      () => document.documentElement.hasAttribute("data-audience"),
      { timeout: 30_000 }
    );
    await page
      .getByRole("button", {
        name: new RegExp(
          `^${hrCopy.validationLabTitle}: show or hide`,
          "i"
        ),
      })
      .click();
    await expect(page.getByText("BASE-00", { exact: true })).toBeVisible();
  });

  test("HR audience: fair-test deep link opens section with pulse", async ({ page }) => {
    await page.goto("/");
    await page.waitForFunction(
      () => document.documentElement.hasAttribute("data-audience"),
      { timeout: 30_000 }
    );
    await page
      .getByRole("button", { name: /how to run a fair test/i })
      .click();
    const stepLink = page
      .getByRole("listitem")
      .filter({ hasText: /External comparative evaluation steps end-to-end/ })
      .locator('a[href="#validation-lab"]');
    await expect(stepLink).toBeVisible({ timeout: 15_000 });
    await stepLink.click();
    const toggle = page.getByRole("button", {
      name: new RegExp(`^${hrCopy.validationLabTitle}: show or hide`, "i"),
    });
    await expect(toggle).toHaveAttribute("aria-expanded", "true");
    await expect(toggle).toHaveClass(/attention-pulse/);
  });
});
