/**
 * Happy path E2E: upload → Inject Eggs → download for DOCX (v1 DOCX-only).
 * Mocks POST /api/harden for deterministic CI (Next server + Processor timing/PII-guard
 * variance); the second test still asserts the real client payload to /api/harden.
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

/** Stable handle for the post-inject Download control (may sit inside a collapsed engine fold). */
function downloadHardenedButton(page: Page) {
  return page.getByTestId("download-hardened-docx");
}

function minimalHardenSuccessBody(originalName: string): string {
  return JSON.stringify({
    bufferBase64: minimalDocxBuffer.toString("base64"),
    mimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    originalName,
    scannerReport: {
      scan: { hasSuspiciousPatterns: false, matchedPatterns: [] },
      alerts: [],
    },
  });
}

test.describe("Happy path", () => {
  test("DOCX: upload, inject eggs, download yields valid DOCX", async ({ page }) => {
    let hardenPosts = 0;
    await page.route("**/api/harden", async (route) => {
      if (route.request().method() !== "POST") {
        return route.continue();
      }
      hardenPosts += 1;
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: minimalHardenSuccessBody("minimal.docx"),
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
    await fileInput.setInputFiles(path.join(fixturesDir, "minimal.docx"));

    await expandEngineConfigurationSection(page);
    await expect(page.getByText(securityUiRx.armedCvLabel)).toBeVisible({
      timeout: 15_000,
    });

    const injectBtn = page.getByRole("button", { name: /inject eggs/i });
    await expect(injectBtn).toBeEnabled({ timeout: 15_000 });

    await injectBtn.click();

    const downloadBtn = downloadHardenedButton(page);
    try {
      await downloadBtn.waitFor({ state: "attached", timeout: 60_000 });
    } catch {
      const alert = page.locator("#main-content [role='alert']");
      if (await alert.isVisible().catch(() => false)) {
        throw new Error(
          `Download control did not attach; UI error: ${(await alert.innerText()).slice(0, 800)}`
        );
      }
      throw new Error(
        "Download button (data-testid=download-hardened-docx) did not attach within 60s."
      );
    }

    expect(hardenPosts).toBe(1);

    const downloadPromise = page.waitForEvent("download");
    await downloadBtn.click({ force: true });
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
        body: minimalHardenSuccessBody("pii-sample.docx"),
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

    await downloadHardenedButton(page).waitFor({ state: "attached", timeout: 60_000 });

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
