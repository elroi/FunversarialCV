import { expect, type Page } from "@playwright/test";

const engineSectionToggle = (page: Page) =>
  page.getByRole("button", {
    name: /engine configuration: show or hide|how it runs: show or hide/i,
  });

/** Must match `SectionFold` `contentId` on the home page (engine block). */
const engineConfigBody = (page: Page) =>
  page.locator("#engine-config-section-content");

/** Security: "> Armed CV:" · HR: "CV loaded:" — scoped so we never match stray nodes. */
function armedCvInEngineSection(page: Page) {
  return engineConfigBody(page).getByText(/>\s*Armed CV:|CV loaded:/i);
}

/**
 * Ensures Engine / How it runs is expanded so Armed CV and Harden are visible.
 *
 * The UI auto-opens this fold when a CV is armed (`expandRevision`). A single
 * unconditional click when `aria-expanded` is already `true` would toggle it
 * **closed**, so we only click when `aria-expanded` is explicitly `false`.
 *
 * We assert on `#engine-config-section-content` plus the armed line inside it
 * (not page-wide `getByText`), so a passing helper always matches what specs
 * wait on next.
 */
export async function expandEngineConfigurationSection(page: Page): Promise<void> {
  const btn = engineSectionToggle(page);
  const body = engineConfigBody(page);
  const armed = armedCvInEngineSection(page);
  await btn.waitFor({ state: "visible" });

  await expect(async () => {
    if (!(await body.isVisible())) {
      const expanded = await btn.getAttribute("aria-expanded");
      if (expanded === "false") {
        await btn.click();
        await expect(btn).toHaveAttribute("aria-expanded", "true", {
          timeout: 5_000,
        });
      }
    }
    await expect(body).toBeVisible();
    await expect(armed).toBeVisible();
  }).toPass({ timeout: 20_000 });
}
