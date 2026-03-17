/**
 * Duality monitor E2E: after harden, open Pipeline status panel and assert log/duality content visible.
 * Mocks /api/harden so scannerReport.scan is present and log is populated.
 * Uses mobile viewport so the Pipeline status toggle is visible (on desktop the panel is always shown).
 * DOCX-only: uses minimal.docx and mock returns DOCX.
 */
import { test, expect } from "@playwright/test";
import path from "path";

import fs from "fs";

const fixturesDir = path.join(process.cwd(), "e2e", "fixtures");
const minimalDocxBuffer = fs.readFileSync(path.join(fixturesDir, "minimal.docx"));

test.describe("Duality monitor", () => {
  test.use({ viewport: { width: 375, height: 667 } });

  test("after harden, open Pipeline status panel shows Duality Monitor and log content", async ({
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

    const fileInput = page.getByTestId("dropzone-input");
    await fileInput.setInputFiles(path.join(fixturesDir, "minimal.docx"));

    await expect(page.getByText(/Armed CV:/i)).toBeVisible({ timeout: 15_000 });
    await page.getByRole("button", { name: /harden/i }).click();

    await expect(
      page.getByRole("button", { name: /download/i })
    ).toBeVisible({ timeout: 60_000 });

    const toggle = page.locator("#duality-monitor-toggle");
    await toggle.scrollIntoViewIfNeeded();
    await toggle.click();

    await expect(toggle).toHaveAttribute("aria-expanded", "true");
    const content = page.locator("#duality-monitor-content");
    await expect(content).toBeVisible();

    await expect(content.getByText("Duality Monitor")).toBeVisible();
    await expect(content.getByText("Terminal Log")).toBeVisible();
    await expect(
      content.getByText(/No suspicious prompt-injection patterns detected/i)
    ).toBeVisible();
    await expect(
      content.locator("[role=log]").filter({ hasText: /ACCEPT|Hardened|Dehydrated/i })
    ).toBeVisible();
  });
});
