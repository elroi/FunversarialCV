/**
 * State reset E2E: after success, clear/change file resets state; change file and harden again works.
 * TDD: tests define that clear and change-file flows reset UI and allow another harden.
 */
import { test, expect } from "@playwright/test";
import path from "path";

const fixturesDir = path.join(process.cwd(), "e2e", "fixtures");
const minimalPdfBuffer = Buffer.from("%PDF-1.4\n%\n");

function mockHardenSuccess(
  page: import("@playwright/test").Page,
  originalName: string = "minimal.pdf"
) {
  page.route("**/api/harden", (route) => {
    if (route.request().method() !== "POST") return route.continue();
    return route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        bufferBase64: minimalPdfBuffer.toString("base64"),
        mimeType: "application/pdf",
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

    const fileInput = page.getByTestId("dropzone-input");
    await fileInput.setInputFiles({
      name: "minimal.pdf",
      mimeType: "application/pdf",
      buffer: minimalPdfBuffer,
    });

    await expect(page.getByText(/Armed CV:/i)).toBeVisible();
    await page.getByRole("button", { name: /harden/i }).click();

    await expect(
      page.getByRole("button", { name: /download/i })
    ).toBeVisible({ timeout: 30_000 });

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
    let callCount = 0;
    page.route("**/api/harden", (route) => {
      if (route.request().method() !== "POST") return route.continue();
      callCount++;
      const name = callCount === 1 ? "first.pdf" : "second.pdf";
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          bufferBase64: minimalPdfBuffer.toString("base64"),
          mimeType: "application/pdf",
          originalName: name,
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
      name: "first.pdf",
      mimeType: "application/pdf",
      buffer: minimalPdfBuffer,
    });

    await expect(page.getByText(/Armed CV:/i)).toBeVisible();
    await expect(page.getByText(/first\.pdf/i)).toBeVisible();
    await page.getByRole("button", { name: /harden/i }).click();

    await expect(
      page.getByRole("button", { name: /download/i })
    ).toBeVisible({ timeout: 30_000 });

    await fileInput.setInputFiles({
      name: "second.pdf",
      mimeType: "application/pdf",
      buffer: minimalPdfBuffer,
    });

    await expect(page.getByText(/Armed CV:/i)).toBeVisible();
    await expect(page.getByText(/second\.pdf/i)).toBeVisible();
    await page.getByRole("button", { name: /harden/i }).click();

    await expect(
      page.getByRole("button", { name: /download/i })
    ).toBeVisible({ timeout: 30_000 });
    expect(callCount).toBe(2);
  });
});
