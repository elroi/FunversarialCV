import { expect, type Page } from "@playwright/test";

/**
 * Home defaults to HR; E2E specs assert security strings (Armed CV, Harden, sample CV row, PII badge).
 * Call after `page.goto("/")` (or `"/?…"`) before assertions or uploads.
 */
export async function ensureSecurityAudienceForE2e(page: Page): Promise<void> {
  const securityBtn = page.getByRole("button", { name: /^For security pros$/i });
  if ((await securityBtn.getAttribute("aria-pressed")) !== "true") {
    await securityBtn.click();
  }
  await expect(
    page.getByText(/PII · client vault \(tokenized outbound\)/i)
  ).toBeVisible({ timeout: 15_000 });
}
