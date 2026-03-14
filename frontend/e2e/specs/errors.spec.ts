/**
 * Error paths E2E: 400/500 handling, retry, safe messages.
 * TDD: tests define expected error UX and retry behavior.
 */
import { test, expect } from "@playwright/test";

test.describe("Errors", () => {
  test("500: shows generic message and Retry button", async ({ page }) => {
    await page.goto("/");

    await page.route("**/api/harden", (route) => {
      if (route.request().method() === "POST") {
        return route.fulfill({
          status: 500,
          contentType: "application/json",
          body: JSON.stringify({ error: "Processing failed. Please try again." }),
        });
      }
      return route.continue();
    });

    const fileInput = page.getByTestId("dropzone-input");
    await fileInput.setInputFiles({
      name: "test.pdf",
      mimeType: "application/pdf",
      buffer: Buffer.from("%PDF-1.4\n%\n"),
    });

    await expect(page.getByText(/Armed CV:/i)).toBeVisible();
    await page.getByRole("button", { name: /harden/i }).click();

    await expect(page.getByText(/Alert:/i)).toBeVisible({ timeout: 10_000 });
    await expect(page.getByRole("button", { name: /retry/i })).toBeVisible();
  });

  test("retry after 500 calls /api/harden again", async ({ page }) => {
    let callCount = 0;
    await page.route("**/api/harden", (route) => {
      if (route.request().method() !== "POST") return route.continue();
      callCount++;
      if (callCount === 1) {
        return route.fulfill({
          status: 500,
          contentType: "application/json",
          body: JSON.stringify({ error: "Processing failed. Please try again." }),
        });
      }
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          bufferBase64: Buffer.from("%PDF-1.4\n%\n").toString("base64"),
          mimeType: "application/pdf",
          originalName: "test.pdf",
          scannerReport: {
            scan: { hasSuspiciousPatterns: false, matchedPatterns: [] },
            alerts: [],
          },
        }),
      });
    });

    await page.goto("/");
    const fileInput = page.getByTestId("dropzone-input");
    await fileInput.setInputFiles({
      name: "test.pdf",
      mimeType: "application/pdf",
      buffer: Buffer.from("%PDF-1.4\n%\n"),
    });

    await page.getByRole("button", { name: /harden/i }).click();
    await expect(page.getByRole("button", { name: /retry/i })).toBeVisible({
      timeout: 10_000,
    });
    await page.getByRole("button", { name: /retry/i }).click();

    await expect(
      page.getByRole("button", { name: /download/i })
    ).toBeVisible({ timeout: 15_000 });
    expect(callCount).toBe(2);
  });

  test("400: shows error message and no Download button", async ({
    page,
  }) => {
    await page.goto("/");

    await page.route("**/api/harden", (route) => {
      if (route.request().method() === "POST") {
        return route.fulfill({
          status: 400,
          contentType: "application/json",
          body: JSON.stringify({
            error:
              "Unsupported or invalid document: file must be a valid PDF or DOCX.",
          }),
        });
      }
      return route.continue();
    });

    const fileInput = page.getByTestId("dropzone-input");
    await fileInput.setInputFiles({
      name: "test.pdf",
      mimeType: "application/pdf",
      buffer: Buffer.from("%PDF-1.4\n%\n"),
    });

    await expect(page.getByText(/Armed CV:/i)).toBeVisible();
    await page.getByRole("button", { name: /harden/i }).click();

    await expect(page.getByText(/Alert:/i)).toBeVisible({ timeout: 10_000 });
    // Success block is not rendered on error
    await expect(page.getByText(/Hardened CV ready/i)).toHaveCount(0);
  });
});
