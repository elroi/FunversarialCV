/**
 * E2E: DOCX-only — PDF is rejected at client; server-PDF dialog is no longer reachable.
 * Replaced former "Server PDF with PII" flow; v1 supports DOCX only.
 */
import { test, expect } from "@playwright/test";
import { ensureSecurityAudienceForE2e } from "../helpers/security-audience";
import { securityUiRx } from "../helpers/security-ui";

test.describe("PDF rejected (DOCX-only)", () => {
  test("uploading PDF shows DOCX-only message and server-PDF dialog never appears", async ({
    page,
  }) => {
    await page.goto("/?e2eServerPdf=1");
    await ensureSecurityAudienceForE2e(page);

    const fileInput = page.getByTestId("dropzone-input");
    await fileInput.setInputFiles({
      name: "resume.pdf",
      mimeType: "application/pdf",
      buffer: Buffer.from("%PDF-1.4\n%\n"),
    });

    await expect(
      page.locator("#dropzone-error")
    ).toBeVisible({ timeout: 10_000 });
    await expect(page.getByText(securityUiRx.armedCvLabel)).not.toBeVisible();
    await expect(
      page.getByRole("heading", { name: /Server-side processing required/i })
    ).not.toBeVisible();
  });
});
