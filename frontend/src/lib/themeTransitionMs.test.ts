import { getThemeTransitionMs } from "./themeTransitionMs";

describe("getThemeTransitionMs", () => {
  afterEach(() => {
    document.documentElement.style.removeProperty("--theme-transition-duration");
  });

  it("parses seconds and milliseconds", () => {
    document.documentElement.style.setProperty("--theme-transition-duration", "2.5s");
    expect(getThemeTransitionMs()).toBe(2500);
    document.documentElement.style.setProperty("--theme-transition-duration", "120ms");
    expect(getThemeTransitionMs()).toBe(120);
  });

  it("falls back when empty", () => {
    document.documentElement.style.removeProperty("--theme-transition-duration");
    expect(getThemeTransitionMs()).toBe(1500);
  });
});
