/**
 * Oversize upload E2E: enforce 4 MB limit client-side and avoid calling /api/harden.
 * TDD: test defines expected UX for too-large files after Workstream 1 limit alignment.
 */

import { test, expect } from "@playwright/test";

test.describe("Oversize uploads", () => {
  test("rejects files over 4 MB with a clear error and does not call /api/harden", async ({
    page,
  }) => {
    let hardenCallCount = 0;
    await page.route("**/api/harden", (route) => {
      if (route.request().method() === "POST") {
        hardenCallCount++;
      }
      return route.continue();
    });

    await page.goto("/");

    const fileInput = page.getByTestId("dropzone-input");
    const oversizeBuffer = Buffer.alloc(4 * 1024 * 1024 + 1024, 0x20); // just over 4 MB
    await fileInput.setInputFiles({
      name: "too-large.pdf",
      mimeType: "application/pdf",
      buffer: oversizeBuffer,
    });

    await expect(page.getByText(/file is too large/i)).toBeVisible();
    // Should not arm the CV or enable harden flow.
    await expect(page.getByText(/Armed CV:/i)).toHaveCount(0);
    expect(hardenCallCount).toBe(0);
  });
});

