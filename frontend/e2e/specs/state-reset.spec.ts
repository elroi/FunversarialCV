/**
 * State reset E2E: after success, clear/change file resets state; change file and harden again works.
 * TDD: tests define that clear and change-file flows reset UI and allow another harden.
 * DOCX-only: uses minimal.docx and mocks return DOCX.
 */
import { test, expect } from "@playwright/test";
import path from "path";
import fs from "fs";
import { expandEngineConfigurationSection } from "../helpers/engine-section";
import { ensureSecurityAudienceForE2e } from "../helpers/security-audience";

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

    await expect(page.getByText(/Armed CV:/i)).toBeVisible({ timeout: 15_000 });
    await expandEngineConfigurationSection(page);
    await page.getByRole("button", { name: /harden/i }).click();

    await expect(
      page.getByRole("button", { name: /download/i })
    ).toBeVisible({ timeout: 60_000 });

    const changeFileBtn = page.getByRole("button", { name: /change file/i });
    await changeFileBtn.scrollIntoViewIfNeeded();
    await changeFileBtn.click();

    await expect(page.getByText(/Drop your CV here/i)).toBeVisible();
    await expect(page.getByText(/Armed CV:/i)).toHaveCount(0);
    await expect(page.getByText(/Hardened CV ready/i)).toHaveCount(0);
  });

  test("after success, selecting another file shows new filename; harden again yields Download", async ({
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

    await expect(page.getByText(/Armed CV:/i)).toBeVisible({ timeout: 15_000 });
    await expect(page.getByText(/minimal\.docx/i)).toBeVisible();
    await expandEngineConfigurationSection(page);
    await page.getByRole("button", { name: /harden/i }).click();

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

    await expect(page.getByText(/Armed CV:/i)).toBeVisible({ timeout: 15_000 });
    await expect(page.getByText(/second\.docx/i)).toBeVisible();
    await expandEngineConfigurationSection(page);
    await page.getByRole("button", { name: /harden/i }).click();

    await expect(
      page.getByRole("button", { name: /download/i })
    ).toBeVisible({ timeout: 60_000 });
    expect(callCount).toBe(2);
  });
});
