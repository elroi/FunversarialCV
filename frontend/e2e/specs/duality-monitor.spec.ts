/**
 * Duality monitor E2E: after harden, Pipeline status section shows the monitor card and log (expanded by default).
 * Copy is audience-specific (HR: "Processing steps" / "Log"; security: "Duality Monitor" / "Terminal Log").
 * Mocks /api/harden so scannerReport.scan is present and log is populated.
 */
import { test, expect } from "@playwright/test";
import path from "path";

import fs from "fs";
import { expandEngineConfigurationSection } from "../helpers/engine-section";
import { ensureSecurityAudienceForE2e } from "../helpers/security-audience";

const fixturesDir = path.join(process.cwd(), "e2e", "fixtures");
const minimalDocxBuffer = fs.readFileSync(path.join(fixturesDir, "minimal.docx"));

test.describe("Duality monitor", () => {
  test.use({ viewport: { width: 375, height: 667 } });

  test("after harden, Pipeline status panel shows monitor and log content", async ({
    page,
  }) => {
    await page.route("**/api/harden", (route) => {
      if (route.request().method() !== "POST") return route.continue();
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          bufferBase64: minimalDocxBuffer.toString("base64"),
          mimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
          originalName: "minimal.docx",
          scannerReport: {
            scan: {
              hasSuspiciousPatterns: false,
              matchedPatterns: [],
              details: [],
            },
            alerts: [],
          },
        }),
      });
    });

    await page.goto("/");
    await ensureSecurityAudienceForE2e(page);

    const fileInput = page.getByTestId("dropzone-input");
    await fileInput.setInputFiles(path.join(fixturesDir, "minimal.docx"));

    await expect(page.getByText(/Armed CV:/i)).toBeVisible({ timeout: 15_000 });
    await expandEngineConfigurationSection(page);
    await page.getByRole("button", { name: /harden/i }).click();

    await expect(
      page.getByRole("button", { name: /download/i })
    ).toBeVisible({ timeout: 60_000 });

    const sectionToggle = page.getByRole("button", {
      name: /pipeline status: show or hide|processing steps: show or hide/i,
    });
    await expect(sectionToggle).toHaveAttribute("aria-expanded", "true");

    const content = page.locator("#pipeline-status-section-content");
    await content.scrollIntoViewIfNeeded();
    await expect(content).toBeVisible();

    await expect(
      content.getByRole("heading", {
        name: /Duality Monitor|Processing steps/i,
      })
    ).toBeVisible();
    await expect(
      content.getByText(/^Log$/i).or(content.getByText(/^Terminal Log$/i))
    ).toBeVisible();
    await expect(
      content.getByText(
        /No suspicious prompt-injection patterns detected|No existing hidden instructions or tracking links found/i
      )
    ).toBeVisible();
    await expect(
      content
        .locator("[role=log]")
        .filter({ hasText: /\[ACCEPT\]|\[DEHYDRATE\]|\[REHYDRATE\]|\[DUALITY\]/i })
    ).toBeVisible();
  });
});
