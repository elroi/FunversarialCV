import type { Page } from "@playwright/test";

const engineSectionToggle = (page: Page) =>
  page.getByRole("button", {
    name: /engine configuration: show or hide|how it runs: show or hide/i,
  });

/**
 * Engine / “How it runs” is collapsed by default. The armed-CV row and Harden live inside it.
 * Idempotent: if already expanded, does not click (a second click would collapse).
 */
export async function expandEngineConfigurationSection(page: Page): Promise<void> {
  const btn = engineSectionToggle(page);
  if ((await btn.getAttribute("aria-expanded")) !== "true") {
    await btn.click();
  }
}
