/**
 * Options E2E: preserve styles, egg toggles, payloads sent.
 * TDD: tests define that options affect the flow correctly.
 */
import { test, expect } from "@playwright/test";
import path from "path";
import fs from "fs";
import { expandEngineConfigurationSection } from "../helpers/engine-section";

const fixturesDir = path.join(process.cwd(), "e2e", "fixtures");
const minimalDocxBuffer = fs.readFileSync(path.join(fixturesDir, "minimal.docx"));

test.describe("Options", () => {
  test("preserve styles toggle: harden succeeds when enabled", async ({
    page,
  }) => {
    await page.route("**/api/harden", (route) => {
      if (route.request().method() !== "POST") return route.continue();
      const body = JSON.stringify({
        bufferBase64: minimalDocxBuffer.toString("base64"),
        mimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        originalName: "minimal.docx",
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
    await fileInput.setInputFiles(path.join(fixturesDir, "minimal.docx"));
    await expect(page.getByText(/Armed CV:/i)).toBeVisible({ timeout: 15_000 });
    await expandEngineConfigurationSection(page);

    await expect(
      page.getByRole("checkbox", { name: /preserve styles/i })
    ).toBeVisible();
    await page.getByRole("checkbox", { name: /preserve styles/i }).check();

    await page.getByRole("button", { name: /harden/i }).click();
    await expect(
      page.getByRole("button", { name: /download/i })
    ).toBeVisible({ timeout: 60_000 });
  });

  test("egg toggle: unchecking an egg still allows harden", async ({
    page,
  }) => {
    await page.route("**/api/harden", (route) => {
      if (route.request().method() !== "POST") return route.continue();
      const body = JSON.stringify({
        bufferBase64: minimalDocxBuffer.toString("base64"),
        mimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        originalName: "minimal.docx",
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
    await fileInput.setInputFiles(path.join(fixturesDir, "minimal.docx"));
    await expect(page.getByText(/Armed CV:/i)).toBeVisible({ timeout: 15_000 });
    await expandEngineConfigurationSection(page);

    await page.getByRole("checkbox", { name: /Canary Wing/i }).uncheck();
    await page.getByRole("button", { name: /harden/i }).click();

    await expect(
      page.getByRole("button", { name: /download/i })
    ).toBeVisible({ timeout: 60_000 });
  });

  test("demo DOCX with preserve styles uses tokenized-copy path (log shows layout preserved)", async ({
    page,
  }) => {
    await page.route("**/api/harden", (route) => {
      if (route.request().method() !== "POST") return route.continue();
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          bufferBase64: minimalDocxBuffer.toString("base64"),
          mimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
          originalName: "demo-hardened.docx",
          scannerReport: {
            scan: { hasSuspiciousPatterns: false, matchedPatterns: [] },
            alerts: [],
          },
        }),
      });
    });

    await page.goto("/");

    await page
      .getByRole("button", { name: /use sample cv to test/i })
      .click();

    await page.getByRole("button", { name: /clean · docx/i }).click();
    await expect(page.getByText(/Armed CV:/i)).toBeVisible({ timeout: 15_000 });
    await expandEngineConfigurationSection(page);

    await page.getByRole("checkbox", { name: /preserve styles/i }).check();
    await page.getByRole("button", { name: /harden/i }).click();

    await expect(
      page.getByRole("button", { name: /download/i })
    ).toBeVisible({ timeout: 60_000 });

    await expect(
      page.getByText(/tokenized copy.*layout preserved/i)
    ).toBeVisible();
  });
});
