/**
 * Unit tests for PDF WinAnsi / stream-safe string helpers.
 */
import { toWinAnsiSafe, toPdfStreamSafe } from "./pdfWinAnsi";

describe("pdfWinAnsi", () => {
  describe("toWinAnsiSafe", () => {
    it("returns empty string for non-string input", () => {
      expect(toWinAnsiSafe(null as unknown as string)).toBe("");
      expect(toWinAnsiSafe(undefined as unknown as string)).toBe("");
    });
    it("leaves printable ASCII and Latin-1 supplement unchanged", () => {
      expect(toWinAnsiSafe("Hello World")).toBe("Hello World");
      expect(toWinAnsiSafe("Ranking: Top_1%")).toBe("Ranking: Top_1%");
    });
    it("replaces U+0080 (and C1 controls) with space", () => {
      const s = "a\u0080b";
      expect(toWinAnsiSafe(s)).toBe("a b");
    });
    it("replaces newline and other controls with space", () => {
      expect(toWinAnsiSafe("a\nb")).toBe("a b");
      expect(toWinAnsiSafe("a\tb")).toBe("a b");
    });
    it("replaces code points U+0100 and above with space", () => {
      expect(toWinAnsiSafe("a\u0100b")).toBe("a b");
    });
  });

  describe("toPdfStreamSafe", () => {
    it("returns empty string for non-string input", () => {
      expect(toPdfStreamSafe(null as unknown as string)).toBe("");
    });
    it("leaves printable ASCII unchanged", () => {
      expect(toPdfStreamSafe("Email: user@example.test")).toBe("Email: user@example.test");
    });
    it("replaces any non-ASCII with space", () => {
      expect(toPdfStreamSafe("café")).toBe("caf ");
      expect(toPdfStreamSafe("a\u0080b")).toBe("a b");
    });
  });
});
