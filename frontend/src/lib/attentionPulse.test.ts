import {
  ATTENTION_PULSE_CLASS,
  prefersReducedMotion,
  restartAttentionPulse,
} from "./attentionPulse";

describe("attentionPulse", () => {
  const originalMatchMedia = window.matchMedia;

  afterEach(() => {
    window.matchMedia = originalMatchMedia;
  });

  it("exports the CSS class name used by globals.css", () => {
    expect(ATTENTION_PULSE_CLASS).toBe("attention-pulse");
  });

  describe("prefersReducedMotion", () => {
    it("returns false when matchMedia is missing", () => {
      // @ts-expect-error test SSR-ish environment
      delete window.matchMedia;
      expect(prefersReducedMotion()).toBe(false);
    });

    it("returns true when (prefers-reduced-motion: reduce) matches", () => {
      window.matchMedia = jest.fn().mockImplementation((query: string) => ({
        matches: query === "(prefers-reduced-motion: reduce)",
        media: query,
        addEventListener: jest.fn(),
        removeEventListener: jest.fn(),
        addListener: jest.fn(),
        removeListener: jest.fn(),
        dispatchEvent: jest.fn(),
        onchange: null,
      }));
      expect(prefersReducedMotion()).toBe(true);
    });

    it("returns false when reduce motion does not match", () => {
      window.matchMedia = jest.fn().mockReturnValue({
        matches: false,
        media: "",
        addEventListener: jest.fn(),
        removeEventListener: jest.fn(),
        addListener: jest.fn(),
        removeListener: jest.fn(),
        dispatchEvent: jest.fn(),
        onchange: null,
      });
      expect(prefersReducedMotion()).toBe(false);
    });
  });

  describe("restartAttentionPulse", () => {
    it("no-ops on null element", () => {
      restartAttentionPulse(null);
      expect(true).toBe(true);
    });

    it("no-ops when reduced motion is preferred", () => {
      window.matchMedia = jest.fn().mockReturnValue({
        matches: true,
        media: "(prefers-reduced-motion: reduce)",
        addEventListener: jest.fn(),
        removeEventListener: jest.fn(),
        addListener: jest.fn(),
        removeListener: jest.fn(),
        dispatchEvent: jest.fn(),
        onchange: null,
      });
      const el = document.createElement("button");
      el.classList.add(ATTENTION_PULSE_CLASS);
      restartAttentionPulse(el);
      expect(el.classList.contains(ATTENTION_PULSE_CLASS)).toBe(true);
    });

    it("removes class, forces reflow, then adds class", () => {
      window.matchMedia = jest.fn().mockReturnValue({
        matches: false,
        media: "",
        addEventListener: jest.fn(),
        removeEventListener: jest.fn(),
        addListener: jest.fn(),
        removeListener: jest.fn(),
        dispatchEvent: jest.fn(),
        onchange: null,
      });
      const el = document.createElement("button");
      el.classList.add(ATTENTION_PULSE_CLASS);
      const spy = jest.spyOn(el, "offsetWidth", "get").mockReturnValue(100);
      restartAttentionPulse(el);
      expect(spy).toHaveBeenCalled();
      expect(el.classList.contains(ATTENTION_PULSE_CLASS)).toBe(true);
      spy.mockRestore();
    });
  });
});
