/**
 * Error paths E2E: 400/500 handling, retry, safe messages, DOCX-only rejection.
 * TDD: tests define expected error UX and retry behavior.
 */
import { test, expect } from "@playwright/test";
import path from "path";
import fs from "fs";
import { expandEngineConfigurationSection } from "../helpers/engine-section";
import { ensureSecurityAudienceForE2e } from "../helpers/security-audience";

const fixturesDir = path.join(process.cwd(), "e2e", "fixtures");
const minimalDocxBuffer = fs.readFileSync(path.join(fixturesDir, "minimal.docx"));

test.describe("Errors", () => {
  test("500: shows generic message and Retry button", async ({ page }) => {
    await page.goto("/");
    await ensureSecurityAudienceForE2e(page);

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
    await fileInput.setInputFiles(path.join(fixturesDir, "minimal.docx"));

    await expect(page.getByText(/Armed CV:/i)).toBeVisible({ timeout: 15_000 });
    await expandEngineConfigurationSection(page);
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
          bufferBase64: minimalDocxBuffer.toString("base64"),
          mimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
          originalName: "test.docx",
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
    await expandEngineConfigurationSection(page);
    await page.getByRole("button", { name: /harden/i }).click();
    await expect(page.getByRole("button", { name: /retry/i })).toBeVisible({
      timeout: 10_000,
    });
    await page.getByRole("button", { name: /retry/i }).click();

    await expect(
      page.getByRole("button", { name: /download/i })
    ).toBeVisible({ timeout: 60_000 });
    expect(callCount).toBe(2);
  });

  test("400: shows error message and no Download button", async ({
    page,
  }) => {
    await page.goto("/");
    await ensureSecurityAudienceForE2e(page);

    await page.route("**/api/harden", (route) => {
      if (route.request().method() === "POST") {
        return route.fulfill({
          status: 400,
          contentType: "application/json",
          body: JSON.stringify({
            error:
              "Unsupported or invalid document: file must be a valid Word document (.docx).",
          }),
        });
      }
      return route.continue();
    });

    const fileInput = page.getByTestId("dropzone-input");
    await fileInput.setInputFiles(path.join(fixturesDir, "minimal.docx"));

    await expect(page.getByText(/Armed CV:/i)).toBeVisible({ timeout: 15_000 });
    await expandEngineConfigurationSection(page);
    await page.getByRole("button", { name: /harden/i }).click();

    await expect(page.getByText(/Alert:/i)).toBeVisible({ timeout: 10_000 });
    await expect(page.getByText(/Hardened CV ready/i)).toHaveCount(0);
  });

  test("uploading PDF shows DOCX-only error and no Armed CV", async ({
    page,
  }) => {
    await page.goto("/");
    await ensureSecurityAudienceForE2e(page);

    const fileInput = page.getByTestId("dropzone-input");
    await fileInput.setInputFiles({
      name: "resume.pdf",
      mimeType: "application/pdf",
      buffer: Buffer.from("%PDF-1.4\n%\n"),
    });

    // DropZone rejects .pdf by extension ("Only Word documents..."); if extension were .docx, magic-byte path would show "looks like a PDF"
    await expect(
      page.getByText(/looks like a PDF|support.*\.docx.*only|only.*word documents.*\.docx.*allowed/i)
    ).toBeVisible({ timeout: 10_000 });
    await expect(page.getByText(/Armed CV:/i)).not.toBeVisible();
  });
});
