import { expect, type Page } from "@playwright/test";

/** Matches home `CollapsibleCard` for experiment flow (`experimentFlowCollapsibleTitle`). */
const fairTestToggle = (page: Page) =>
  page.getByRole("button", {
    name: /how to run a fair test/i,
  });

/** Must match `CollapsibleCard` `contentId` on the home page (fair-test steps). */
const fairTestBody = (page: Page) =>
  page.locator("#experiment-flow-card-content");

/**
 * Ensures the fair-test steps panel is expanded.
 *
 * The card uses `expandOnWide`: on viewports ≥ md it opens after mount. A blind
 * `click()` when `aria-expanded` is already `true` toggles the panel **closed**,
 * which hides markdown flow links (e.g. `a[href="#validation-lab"]`) and breaks E2E.
 */
export async function ensureFairTestPanelExpanded(page: Page): Promise<void> {
  const btn = fairTestToggle(page);
  const body = fairTestBody(page);
  await btn.waitFor({ state: "visible" });

  if ((await btn.getAttribute("aria-expanded")) === "false") {
    await btn.click();
  }
  await expect(btn).toHaveAttribute("aria-expanded", "true", { timeout: 5_000 });
  await expect(body).toBeVisible();
}
