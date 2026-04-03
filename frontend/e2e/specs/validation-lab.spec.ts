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
});
