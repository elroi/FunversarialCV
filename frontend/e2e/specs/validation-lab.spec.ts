/**
 * Validation section smoke: expand fold and see stable prompt id (BASE-00).
 * Security uses "Validation Lab"; HR uses "Try in an AI tool" (validationLabTitle).
 */
import { test, expect } from "@playwright/test";
import { ensureFairTestPanelExpanded } from "../helpers/fair-test-panel";
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

  test("security audience: #validation-lab-guided opens lab section and protocol fold", async ({
    page,
  }) => {
    await page.goto("/#validation-lab-guided");
    await ensureSecurityAudienceForE2e(page);
    const sectionToggle = page.getByRole("button", {
      name: new RegExp(
        `^${securityCopy.validationLabTitle}: show or hide`,
        "i"
      ),
    });
    await expect(sectionToggle).toHaveAttribute("aria-expanded", "true", { timeout: 15_000 });
    await expect(
      page.getByRole("button", { name: /External comparative evaluation: show or hide/i })
    ).toHaveAttribute("aria-expanded", "true", { timeout: 15_000 });
  });

  test("security audience: fair-test step links Validation Lab to #validation-lab", async ({
    page,
  }) => {
    await page.goto("/");
    await ensureSecurityAudienceForE2e(page);
    await ensureFairTestPanelExpanded(page);
    // Fair-test step 4 links to Validation Lab (copy varies; href is stable).
    const stepLink = page.locator("#experiment-flow-card-content a[href=\"#validation-lab\"]");
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

  test("security audience: ingestion harness appears before guided protocol in DOM order", async ({
    page,
  }) => {
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
    const order = await page.locator("#validation-lab-section-content").evaluate((el) => {
      const g = el.querySelector("#validation-lab-guided");
      const h = el.querySelector("#validation-lab-harness");
      if (!g || !h) return 0;
      return h.compareDocumentPosition(g);
    });
    // Node.DOCUMENT_POSITION_FOLLOWING === 4; guided follows harness.
    expect(order & 4).toBe(4);
  });

  test("security audience: protocol link scrolls to console upload anchor", async ({ page }) => {
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
    await page
      .getByRole("button", {
        name: /External comparative evaluation: show or hide/i,
      })
      .click();
    await page.getByRole("link", { name: /Upload or sample CV/i }).first().click();
    await expect(page.locator("#console-cv-upload")).toBeVisible();
    await expect(page.locator("#console-cv-upload")).toBeInViewport({ timeout: 10_000 });
  });

  test("security audience: ingestion lab extracts fixture docx", async ({ page }) => {
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
    await expect(page.getByTestId("lab-harness-root")).toBeVisible();
    await page.getByTestId("lab-harness-file-input").setInputFiles("e2e/fixtures/minimal.docx");
    await page.getByTestId("lab-harness-run-extract").click();
    await expect(page.getByTestId("lab-harness-results")).toBeVisible({ timeout: 20_000 });
    await expect(page.getByTestId("lab-harness-mode-docx_forensic_body")).toBeVisible();
  });

  test("HR audience: ingestion lab extracts fixture docx", async ({ page }) => {
    await page.goto("/");
    await page.waitForFunction(
      () => document.documentElement.hasAttribute("data-audience"),
      { timeout: 30_000 }
    );
    await page
      .getByRole("button", {
        name: new RegExp(`^${hrCopy.validationLabTitle}: show or hide`, "i"),
      })
      .click();
    await expect(page.getByTestId("lab-harness-root")).toBeVisible();
    await page.getByTestId("lab-harness-file-input").setInputFiles("e2e/fixtures/minimal.docx");
    await page.getByTestId("lab-harness-run-extract").click();
    await expect(page.getByTestId("lab-harness-results")).toBeVisible({ timeout: 20_000 });
  });

  test("HR audience: fair-test deep link opens section with pulse", async ({ page }) => {
    await page.goto("/");
    await page.waitForFunction(
      () => document.documentElement.hasAttribute("data-audience"),
      { timeout: 30_000 }
    );
    await ensureFairTestPanelExpanded(page);
    const stepLink = page.locator("#experiment-flow-card-content a[href=\"#validation-lab\"]");
    await expect(stepLink).toBeVisible({ timeout: 15_000 });
    await stepLink.click();
    const toggle = page.getByRole("button", {
      name: new RegExp(`^${hrCopy.validationLabTitle}: show or hide`, "i"),
    });
    await expect(toggle).toHaveAttribute("aria-expanded", "true");
    await expect(toggle).toHaveClass(/attention-pulse/);
  });
});
