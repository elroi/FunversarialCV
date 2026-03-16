/**
 * E2E: PDF with PII sent to server for processing (client dehydration failed or skipped).
 * Uses ?e2eServerPdf=1 to force the server-PDF confirmation dialog without relying on pdfjs failure.
 */
import { test, expect } from "@playwright/test";
import path from "path";

const fixturesDir = path.join(process.cwd(), "e2e", "fixtures");

test.describe("Server PDF with PII flow", () => {
  test("dialog appears with expected copy when e2eServerPdf=1 and PDF + eggs", async ({
    page,
  }) => {
    await page.goto("/?e2eServerPdf=1");

    const fileInput = page.getByTestId("dropzone-input");
    await fileInput.setInputFiles(path.join(fixturesDir, "minimal.pdf"));

    await expect(page.getByText(/Armed CV:/i)).toBeVisible();
    await page.getByRole("button", { name: /harden/i }).click();

    const dialog = page.getByRole("dialog");
    await expect(
      page.getByRole("heading", { name: /Server-side processing required/i })
    ).toBeVisible({ timeout: 10_000 });
    await expect(
      dialog.getByText(/can only be processed by the server/i)
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: /Continue \(use server\)/i })
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: /Uncheck eggs and continue/i })
    ).toBeVisible();
    await expect(page.getByRole("button", { name: /Cancel/i })).toBeVisible();
  });

  test("Continue (use server): request succeeds and Download appears", async ({
    page,
  }) => {
    await page.route("**/api/harden", (route) => {
      if (route.request().method() !== "POST") return route.continue();
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          bufferBase64: Buffer.from("%PDF-1.4\n%\n").toString("base64"),
          mimeType: "application/pdf",
          originalName: "minimal.pdf",
          scannerReport: {
            scan: { hasSuspiciousPatterns: false, matchedPatterns: [] },
            alerts: [],
          },
        }),
      });
    });

    await page.goto("/?e2eServerPdf=1");
    const fileInput = page.getByTestId("dropzone-input");
    await fileInput.setInputFiles(path.join(fixturesDir, "minimal.pdf"));

    await page.getByRole("button", { name: /harden/i }).click();
    await expect(
      page.getByRole("heading", { name: /Server-side processing required/i })
    ).toBeVisible({ timeout: 10_000 });

    await page.getByRole("button", { name: /Continue \(use server\)/i }).click();

    await expect(
      page.getByRole("button", { name: /download/i })
    ).toBeVisible({ timeout: 30_000 });
  });

  test("Uncheck eggs and continue: request has empty eggIds and Download appears", async ({
    page,
  }) => {
    let capturedPostData: string | null = null;
    await page.route("**/api/harden", async (route) => {
      if (route.request().method() !== "POST") return route.continue();
      const postData = route.request().postData();
      const buf = route.request().postDataBuffer();
      capturedPostData = postData ?? (buf ? buf.toString("utf8") : null);
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          bufferBase64: Buffer.from("%PDF-1.4\n%\n").toString("base64"),
          mimeType: "application/pdf",
          originalName: "minimal.pdf",
          scannerReport: {
            scan: { hasSuspiciousPatterns: false, matchedPatterns: [] },
            alerts: [],
          },
        }),
      });
    });

    await page.goto("/?e2eServerPdf=1");
    const fileInput = page.getByTestId("dropzone-input");
    await fileInput.setInputFiles(path.join(fixturesDir, "minimal.pdf"));

    await page.getByRole("button", { name: /harden/i }).click();
    await expect(
      page.getByRole("heading", { name: /Server-side processing required/i })
    ).toBeVisible({ timeout: 10_000 });

    await page
      .getByRole("button", { name: /Uncheck eggs and continue/i })
      .click();

    await expect(
      page.getByRole("button", { name: /download/i })
    ).toBeVisible({ timeout: 30_000 });

    expect(capturedPostData).toBeTruthy();
    expect(capturedPostData).toContain("eggIds");
    expect(capturedPostData).toContain("[]");
  });

  test("Cancel: dialog closes and no harden request", async ({ page }) => {
    let hardenCallCount = 0;
    await page.route("**/api/harden", (route) => {
      if (route.request().method() === "POST") hardenCallCount++;
      return route.continue();
    });

    await page.goto("/?e2eServerPdf=1");
    const fileInput = page.getByTestId("dropzone-input");
    await fileInput.setInputFiles(path.join(fixturesDir, "minimal.pdf"));

    await page.getByRole("button", { name: /harden/i }).click();
    await expect(
      page.getByRole("heading", { name: /Server-side processing required/i })
    ).toBeVisible({ timeout: 10_000 });

    await page.getByRole("button", { name: /Cancel/i }).click();

    await expect(
      page.getByRole("heading", { name: /Server-side processing required/i })
    ).not.toBeVisible();
    await expect(page.getByRole("button", { name: /download/i })).toHaveCount(
      0
    );
    expect(hardenCallCount).toBe(0);
  });
});
