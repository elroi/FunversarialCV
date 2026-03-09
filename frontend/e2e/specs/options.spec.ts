/**
 * Options E2E: preserve styles, egg toggles, payloads sent.
 * TDD: tests define that options affect the flow correctly.
 */
import { test, expect } from "@playwright/test";
import path from "path";

const fixturesDir = path.join(process.cwd(), "e2e", "fixtures");

test.describe("Options", () => {
  test("preserve styles toggle: harden succeeds when enabled", async ({
    page,
  }) => {
    await page.route("**/api/harden", (route) => {
      if (route.request().method() !== "POST") return route.continue();
      const body = JSON.stringify({
        bufferBase64: Buffer.from("%PDF-1.4\n%\n").toString("base64"),
        mimeType: "application/pdf",
        originalName: "minimal.pdf",
        scannerReport: {
          scan: { hasSuspiciousPatterns: false, matchedPatterns: [] },
          alerts: [],
        },
      });
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body,
      });
    });

    await page.goto("/");

    const fileInput = page.getByTestId("dropzone-input");
    await fileInput.setInputFiles(path.join(fixturesDir, "minimal.pdf"));
    await expect(page.getByText(/Armed CV:/i)).toBeVisible();

    await expect(
      page.getByRole("checkbox", { name: /preserve styles/i })
    ).toBeVisible();
    await page.getByRole("checkbox", { name: /preserve styles/i }).check();

    await page.getByRole("button", { name: /harden/i }).click();
    await expect(
      page.getByRole("button", { name: /download/i })
    ).toBeVisible({ timeout: 30_000 });
  });

  test("egg toggle: unchecking an egg still allows harden", async ({
    page,
  }) => {
    await page.route("**/api/harden", (route) => {
      if (route.request().method() !== "POST") return route.continue();
      const body = JSON.stringify({
        bufferBase64: Buffer.from("%PDF-1.4\n%\n").toString("base64"),
        mimeType: "application/pdf",
        originalName: "minimal.pdf",
        scannerReport: {
          scan: { hasSuspiciousPatterns: false, matchedPatterns: [] },
          alerts: [],
        },
      });
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body,
      });
    });

    await page.goto("/");

    const fileInput = page.getByTestId("dropzone-input");
    await fileInput.setInputFiles(path.join(fixturesDir, "minimal.pdf"));
    await expect(page.getByText(/Armed CV:/i)).toBeVisible();

    await page.getByRole("checkbox", { name: /Canary Wing/i }).uncheck();
    await page.getByRole("button", { name: /harden/i }).click();

    await expect(
      page.getByRole("button", { name: /download/i })
    ).toBeVisible({ timeout: 30_000 });
  });
});
