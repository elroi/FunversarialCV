/**
 * Layout tests: viewport export for mobile (explicit device-width, viewport-fit=cover).
 */
import { viewport } from "./viewport";

describe("Root layout viewport", () => {
  it("uses device-width, initialScale 1, and viewport-fit cover for notched devices", () => {
    expect(viewport).toBeDefined();
    expect(viewport.width).toBe("device-width");
    expect(viewport.initialScale).toBe(1);
    expect(viewport.viewportFit).toBe("cover");
  });
});
