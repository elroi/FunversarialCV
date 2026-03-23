/**
 * Happy path E2E: upload → Inject Eggs → download for DOCX (v1 DOCX-only).
 * Uses real /api/harden and real fixtures. TDD: tests define expected flow.
 */
import { test, expect, type Page } from "@playwright/test";
import path from "path";
import fs from "fs";
import { expandEngineConfigurationSection } from "../helpers/engine-section";
import { ensureSecurityAudienceForE2e } from "../helpers/security-audience";
import { securityUiRx } from "../helpers/security-ui";

const fixturesDir = path.join(process.cwd(), "e2e", "fixtures");
const minimalDocxBuffer = fs.readFileSync(path.join(fixturesDir, "minimal.docx"));

/** Same key as home page `CHECKBOX_STORAGE_KEY` — clear so parallel E2E workers never inherit egg toggles. */
const CHECKBOX_STORAGE_KEY = "funversarialcv-checkboxes";

/**
 * Post-inject Download uses aria-label `Download <filename>.docx` (eggs on → …_final.docx; scan-only → original name).
 * Demo row "Download to view…" does not end with `.docx`, so it stays excluded.
 */
function downloadResultButton(page: Page) {
  return page
    .locator("#main-content")
    .getByRole("button", { name: /download .+\.docx$/i });
}

test.describe("Happy path", () => {
  test("DOCX: upload, inject eggs, download yields valid DOCX", async ({ page }) => {
    await page.goto("/");
    await page.evaluate((key) => {
      try {
        window.localStorage.removeItem(key);
      } catch {
        /* ignore */
      }
    }, CHECKBOX_STORAGE_KEY);
    await ensureSecurityAudienceForE2e(page);

    const fileInput = page.getByTestId("dropzone-input");
    await fileInput.setInputFiles(path.join(fixturesDir, "minimal.docx"));

    await expandEngineConfigurationSection(page);
    await expect(page.getByText(securityUiRx.armedCvLabel)).toBeVisible({
      timeout: 15_000,
    });

    const injectBtn = page.getByRole("button", { name: /inject eggs/i });
    await expect(injectBtn).toBeEnabled({ timeout: 15_000 });

    const hardenResponsePromise = page.waitForResponse(
      (response) =>
        response.url().includes("/api/harden") &&
        response.request().method() === "POST",
      { timeout: 90_000 }
    );
    await injectBtn.click();
    const hardenResponse = await hardenResponsePromise;
    if (!hardenResponse.ok()) {
      const body = await hardenResponse.text();
      throw new Error(
        `POST /api/harden failed ${hardenResponse.status()}: ${body.slice(0, 500)}`
      );
    }

    // Download + success live inside the engine SectionFold; if it collapsed, the control exists but is not visible.
    await expandEngineConfigurationSection(page);

    const downloadBtn = downloadResultButton(page);
    try {
      await expect(downloadBtn).toBeVisible({ timeout: 60_000 });
    } catch {
      const alert = page.locator("#main-content [role='alert']");
      if (await alert.isVisible().catch(() => false)) {
        throw new Error(
          `Download did not appear; UI error: ${(await alert.innerText()).slice(0, 800)}`
        );
      }
      const engineBody = page.locator("#engine-config-section-content");
      const engineHidden = await engineBody.getAttribute("hidden");
      const count = await downloadResultButton(page).count();
      throw new Error(
        `Download did not appear within 60s (engine content hidden=${engineHidden}, matching download buttons=${count}).`
      );
    }

    const downloadPromise = page.waitForEvent("download");
    await downloadBtn.scrollIntoViewIfNeeded();
    await downloadBtn.click();
    const download = await downloadPromise;

    expect(download.suggestedFilename()).toMatch(/\.docx$/i);
    const buffer = await download.path();
    expect(buffer).toBeTruthy();
    const fs = await import("fs");
    const bytes = fs.readFileSync(buffer);
    expect(bytes.length).toBeGreaterThan(0);
    expect(bytes[0]).toBe(0x50); // PK (ZIP/DOCX)
    expect(bytes[1]).toBe(0x4b);
  });

  test("Client PII dehydration: payload to /api/harden contains tokens or file (DOCX)", async ({
    page,
  }) => {
    const docxPath = path.join(fixturesDir, "minimal.docx");

    let capturedBody: string | null = null;

    await page.route("**/api/harden", async (route) => {
      if (route.request().method() !== "POST") {
        return route.continue();
      }
      const req = route.request();
      const postData = req.postData();
      if (postData != null) {
        capturedBody = postData;
      } else {
        const buf = req.postDataBuffer();
        capturedBody = buf ? buf.toString("utf8") : null;
      }
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          bufferBase64: minimalDocxBuffer.toString("base64"),
          mimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
          originalName: "pii-sample.docx",
          scannerReport: {
            scan: { hasSuspiciousPatterns: false, matchedPatterns: [] },
            alerts: [],
          },
        }),
      });
    });

    await page.goto("/");
    await page.evaluate((key) => {
      try {
        window.localStorage.removeItem(key);
      } catch {
        /* ignore */
      }
    }, CHECKBOX_STORAGE_KEY);
    await ensureSecurityAudienceForE2e(page);

    const fileInput = page.getByTestId("dropzone-input");
    await fileInput.setInputFiles(docxPath);

    await expandEngineConfigurationSection(page);
    await expect(page.getByText(securityUiRx.armedCvLabel)).toBeVisible({
      timeout: 15_000,
    });
    await page.getByRole("button", { name: /inject eggs/i }).click();

    await expandEngineConfigurationSection(page);
    await expect(downloadResultButton(page)).toBeVisible({ timeout: 60_000 });

    expect(capturedBody).toBeTruthy();
    const isTextMode = capturedBody!.includes("tokenizedText");
    if (isTextMode) {
      expect(capturedBody).toContain("{{PII_EMAIL_0}}");
      expect(capturedBody).not.toContain("user@example.com");
    } else {
      expect(capturedBody).toContain('name="file"');
    }
  });
});
