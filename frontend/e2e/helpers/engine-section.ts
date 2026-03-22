import { expect, type Page } from "@playwright/test";

const engineSectionToggle = (page: Page) =>
  page.getByRole("button", {
    name: /engine configuration: show or hide|how it runs: show or hide/i,
  });

/** Security: "> Armed CV:" · HR: "CV loaded:" */
function armedCvLocator(page: Page) {
  return page.getByText(/>\s*Armed CV:|CV loaded:/i);
}

/**
 * Ensures Engine / How it runs is expanded so Armed CV and Harden are visible.
 *
 * The UI auto-opens this fold when a CV is armed (`expandRevision`). A single
 * unconditional click would toggle it **closed**, so we only click when
 * `aria-expanded` is explicitly `false`, and we use `toPass` to wait for paint
 * when the fold is already open.
 */
export async function expandEngineConfigurationSection(page: Page): Promise<void> {
  const btn = engineSectionToggle(page);
  const armed = armedCvLocator(page);
  await btn.waitFor({ state: "visible" });

  let didClickOpen = false;

  await expect(async () => {
    if (await armed.isVisible()) {
      return;
    }

    const expanded = await btn.getAttribute("aria-expanded");

    if (expanded === "true") {
      expect(await armed.isVisible()).toBe(true);
      return;
    }

    if (expanded === "false" && !didClickOpen) {
      await btn.click();
      didClickOpen = true;
    }

    expect(await armed.isVisible()).toBe(true);
  }).toPass({ timeout: 15_000 });
}
