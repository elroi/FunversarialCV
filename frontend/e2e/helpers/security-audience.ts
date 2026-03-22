import { expect, type Page } from "@playwright/test";
import { securityUiRx } from "./security-ui";

/**
 * Home defaults to HR; E2E specs assert security strings (Armed CV, Harden, sample CV row, PII badge).
 * Call after `page.goto("/")` (or `"/?…"`) before assertions or uploads.
 *
 * Waits for `AudienceProvider` hydration (`data-audience` on `<html>`) before clicking — otherwise
 * Playwright can click before React attaches handlers (especially under `next start`).
 *
 * Security copy used in assertions lives in `security-ui.ts` (derived from `src/copy/security.ts`).
 */
export async function ensureSecurityAudienceForE2e(page: Page): Promise<void> {
  await page.waitForFunction(
    () => document.documentElement.hasAttribute("data-audience"),
    { timeout: 30_000 }
  );

  const securityBtn = page.getByRole("button", {
    name: securityUiRx.audienceSecurityButton,
  });
  if ((await securityBtn.getAttribute("aria-pressed")) !== "true") {
    await securityBtn.click();
  }

  await expect(page.locator("html")).toHaveAttribute("data-audience", "security", {
    timeout: 15_000,
  });
  await expect(page.getByText(securityUiRx.piiModeBadge)).toBeVisible({
    timeout: 15_000,
  });
}
