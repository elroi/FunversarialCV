import type { Page } from "@playwright/test";

/** Engine / “How it runs” is collapsed by default; call after CV is armed and before Harden. */
export async function expandEngineConfigurationSection(page: Page): Promise<void> {
  await page
    .getByRole("button", {
      name: /engine configuration: show or hide|how it runs: show or hide/i,
    })
    .click();
}
