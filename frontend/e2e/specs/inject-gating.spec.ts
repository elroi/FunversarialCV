/**
 * Inject gating E2E: after a successful run, the primary pipeline button is disabled until egg/options drift.
 */
import { test, expect } from "@playwright/test";
import path from "path";
import fs from "fs";
import { expandEngineConfigurationSection } from "../helpers/engine-section";
import { ensureSecurityAudienceForE2e } from "../helpers/security-audience";
import { securityUiRx } from "../helpers/security-ui";

const fixturesDir = path.join(process.cwd(), "e2e", "fixtures");
const minimalDocxBuffer = fs.readFileSync(path.join(fixturesDir, "minimal.docx"));

test.describe("Inject gating", () => {
  test("after success inject is disabled until an egg checkbox changes; second run succeeds", async ({
    page,
  }) => {
    let hardenPosts = 0;
    await page.route("**/api/harden", (route) => {
      if (route.request().method() !== "POST") return route.continue();
      hardenPosts += 1;
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          bufferBase64: minimalDocxBuffer.toString("base64"),
          mimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
          originalName: "minimal.docx",
          scannerReport: {
            scan: { hasSuspiciousPatterns: false, matchedPatterns: [] },
            alerts: [],
          },
        }),
      });
    });

    await page.goto("/");
    await ensureSecurityAudienceForE2e(page);

    const fileInput = page.getByTestId("dropzone-input");
    await fileInput.setInputFiles(path.join(fixturesDir, "minimal.docx"));
    await expandEngineConfigurationSection(page);
    await expect(page.getByText(securityUiRx.armedCvLabel)).toBeVisible({
      timeout: 15_000,
    });

    const injectBtn = page.getByRole("button", { name: /inject eggs/i });
    await expect(injectBtn).toBeEnabled();
    await injectBtn.click();

    await expect(page.getByRole("button", { name: /download/i })).toBeVisible({
      timeout: 60_000,
    });

    await expect(injectBtn).toBeDisabled();
    await expect(page.getByRole("button", { name: /re-process/i })).toHaveCount(0);

    await page.getByRole("checkbox", { name: /Canary Wing/i }).uncheck();
    await expect(injectBtn).toBeEnabled();

    await injectBtn.click();
    await expect(page.getByRole("button", { name: /download/i })).toBeVisible({
      timeout: 60_000,
    });
    expect(hardenPosts).toBe(2);
  });
});
