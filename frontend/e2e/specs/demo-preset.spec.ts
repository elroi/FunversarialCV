/**
 * Demo preset E2E: Load preset (Clean/Dirty · PDF/DOCX) → Armed → Inject Eggs → Download.
 * Mocks GET /api/demo-cv and POST /api/harden for speed and determinism.
 */
import path from "path";
import fs from "fs";
import { test, expect } from "@playwright/test";
import { expandEngineConfigurationSection } from "../helpers/engine-section";
import { ensureSecurityAudienceForE2e } from "../helpers/security-audience";
import { securityUiRx } from "../helpers/security-ui";

const fixturesDir = path.join(process.cwd(), "e2e", "fixtures");
const minimalDocxBuffer = fs.readFileSync(path.join(fixturesDir, "minimal.docx"));

const demoPdfPayload = {
  bufferBase64: Buffer.from("%PDF-1.4\n%\n").toString("base64"),
  mimeType: "application/pdf",
  originalName: "FunversarialCV Demo – Senior Security Architect (clean).pdf",
};

const demoDocxPayload = {
  // Real minimal.docx so in-browser dehydration succeeds (magic-only buffer fails).
  bufferBase64: minimalDocxBuffer.toString("base64"),
  mimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  originalName: "FunversarialCV Demo – Senior Security Architect (clean).docx",
};

function mockDemoCvAndHarden(
  page: import("@playwright/test").Page,
  format: "pdf" | "docx"
) {
  const body =
    format === "pdf"
      ? { ...demoPdfPayload, scannerReport: { scan: { hasSuspiciousPatterns: false, matchedPatterns: [] }, alerts: [] } }
      : { ...demoDocxPayload, scannerReport: { scan: { hasSuspiciousPatterns: false, matchedPatterns: [] }, alerts: [] } };

  page.route("**/api/demo-cv*", (route) => {
    if (route.request().method() !== "GET") return route.continue();
    return route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(
        format === "pdf"
          ? { bufferBase64: demoPdfPayload.bufferBase64, mimeType: demoPdfPayload.mimeType, originalName: demoPdfPayload.originalName }
          : { bufferBase64: demoDocxPayload.bufferBase64, mimeType: demoDocxPayload.mimeType, originalName: demoDocxPayload.originalName }
      ),
    });
  });

  page.route("**/api/harden", (route) => {
    if (route.request().method() !== "POST") return route.continue();
    return route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(body),
    });
  });
}

test.describe("Demo preset", () => {
  test("Clean · DOCX: load preset, inject eggs, download yields valid DOCX", async ({
    page,
  }) => {
    mockDemoCvAndHarden(page, "docx");

    await page.goto("/");
    await ensureSecurityAudienceForE2e(page);

    await page.getByRole("button", { name: securityUiRx.sampleCvButton }).click();
    await page.getByRole("button", { name: /clean · docx/i }).click();

    await expandEngineConfigurationSection(page);
    await expect(page.getByText(securityUiRx.armedCvLabel)).toBeVisible({
      timeout: 15_000,
    });
    await expect(page.getByRole("button", { name: /inject eggs/i })).toBeEnabled();

    await page.getByRole("button", { name: /inject eggs/i }).click();

    const hardenedDownload = page.getByTestId("download-hardened-docx");
    await expect(hardenedDownload).toBeVisible({ timeout: 30_000 });

    const downloadPromise = page.waitForEvent("download");
    await hardenedDownload.click({ force: true });
    const download = await downloadPromise;

    expect(download.suggestedFilename()).toMatch(/\.docx$/i);
    const buffer = await download.path();
    expect(buffer).toBeTruthy();
    const fs = await import("fs");
    const bytes = fs.readFileSync(buffer);
    expect(bytes.length).toBeGreaterThan(0);
    expect(bytes[0]).toBe(0x50); // PK
    expect(bytes[1]).toBe(0x4b);
  });

  test("Dirty · DOCX: load preset, inject eggs, download yields valid DOCX", async ({
    page,
  }) => {
    mockDemoCvAndHarden(page, "docx");

    await page.goto("/");
    await ensureSecurityAudienceForE2e(page);

    await page.getByRole("button", { name: securityUiRx.sampleCvButton }).click();
    await page.getByRole("button", { name: /dirty · docx/i }).click();

    await expandEngineConfigurationSection(page);
    await expect(page.getByText(securityUiRx.armedCvLabel)).toBeVisible({
      timeout: 15_000,
    });
    await expect(page.getByRole("button", { name: /inject eggs/i })).toBeEnabled();

    await page.getByRole("button", { name: /inject eggs/i }).click();

    const hardenedDownload = page.getByTestId("download-hardened-docx");
    await expect(hardenedDownload).toBeVisible({ timeout: 30_000 });

    const downloadPromise = page.waitForEvent("download");
    await hardenedDownload.click({ force: true });
    const download = await downloadPromise;

    expect(download.suggestedFilename()).toMatch(/\.docx$/i);
    const buffer = await download.path();
    expect(buffer).toBeTruthy();
    const fs = await import("fs");
    const bytes = fs.readFileSync(buffer);
    expect(bytes.length).toBeGreaterThan(0);
    expect(bytes[0]).toBe(0x50);
    expect(bytes[1]).toBe(0x4b);
  });
});
