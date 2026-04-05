/**
 * State reset E2E: after success, clear/change file resets state; change file and inject eggs again works.
 * TDD: tests define that clear and change-file flows reset UI and allow another injection run.
 * DOCX-only: uses minimal.docx and mocks return DOCX.
 */
import { test, expect } from "@playwright/test";
import path from "path";
import fs from "fs";
import { expandEngineConfigurationSection } from "../helpers/engine-section";
import { ensureSecurityAudienceForE2e } from "../helpers/security-audience";
import { securityUiRx } from "../helpers/security-ui";

const fixturesDir = path.join(process.cwd(), "e2e", "fixtures");

function getMinimalDocxBuffer(): Buffer {
  return fs.readFileSync(path.join(fixturesDir, "minimal.docx"));
}

function mockHardenSuccess(
  page: import("@playwright/test").Page,
  originalName: string = "minimal.docx"
) {
  const docxBuffer = getMinimalDocxBuffer();
  page.route("**/api/harden", (route) => {
    if (route.request().method() !== "POST") return route.continue();
    return route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        bufferBase64: docxBuffer.toString("base64"),
        mimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        originalName,
        scannerReport: {
          scan: { hasSuspiciousPatterns: false, matchedPatterns: [] },
          alerts: [],
        },
      }),
    });
  });
}

test.describe("State reset", () => {
  test("after success, Change file resets state: drop zone visible, no Armed CV, no Download", async ({
    page,
  }) => {
    mockHardenSuccess(page);

    await page.goto("/");
    await ensureSecurityAudienceForE2e(page);

    const fileInput = page.getByTestId("dropzone-input");
    await fileInput.setInputFiles(path.join(fixturesDir, "minimal.docx"));

    await expandEngineConfigurationSection(page);
    await expect(page.getByText(securityUiRx.armedCvLabel)).toBeVisible({
      timeout: 15_000,
    });
    await page.getByRole("button", { name: /inject eggs/i }).click();

    await expect(
      page.getByRole("button", { name: /download/i })
    ).toBeVisible({ timeout: 60_000 });

    const changeFileBtn = page.getByRole("button", { name: /change file/i });
    await changeFileBtn.scrollIntoViewIfNeeded();
    await changeFileBtn.click();

    await expect(page.getByText(/Drop your CV here/i)).toBeVisible();
    await expect(page.getByText(securityUiRx.armedCvLabel)).toHaveCount(0);
    await expect(page.getByText(/eggs injected/i)).toHaveCount(0);
  });

  test("after success, selecting another file shows new filename; inject eggs again yields Download", async ({
    page,
  }) => {
    const docxBuffer = getMinimalDocxBuffer();
    let callCount = 0;
    page.route("**/api/harden", (route) => {
      if (route.request().method() !== "POST") return route.continue();
      callCount++;
      const name = callCount === 1 ? "first.docx" : "second.docx";
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          bufferBase64: docxBuffer.toString("base64"),
          mimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
          originalName: name,
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
    // Scope to engine Armed CV line — lab harness also mentions the filename ("Using armed file: …").
    await expect(
      page.locator("p").filter({ hasText: securityUiRx.armedCvLabel }).locator("span.font-semibold")
    ).toHaveText("minimal.docx");
    await page.getByRole("button", { name: /inject eggs/i }).click();

    await expect(
      page.getByRole("button", { name: /download/i })
    ).toBeVisible({ timeout: 60_000 });

    const fs = await import("fs");
    const docxBytes = fs.readFileSync(path.join(fixturesDir, "minimal.docx"));
    await fileInput.setInputFiles({
      name: "second.docx",
      mimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      buffer: docxBytes,
    });

    await expandEngineConfigurationSection(page);
    await expect(page.getByText(securityUiRx.armedCvLabel)).toBeVisible({
      timeout: 15_000,
    });
    await expect(
      page.locator("p").filter({ hasText: securityUiRx.armedCvLabel }).locator("span.font-semibold")
    ).toHaveText("second.docx");
    await page.getByRole("button", { name: /inject eggs/i }).click();

    await expect(
      page.getByRole("button", { name: /download/i })
    ).toBeVisible({ timeout: 60_000 });
    expect(callCount).toBe(2);
  });
});
