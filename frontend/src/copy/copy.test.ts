import { getCopy } from "./index";
import { securityCopy } from "./security";
import { hrCopy } from "./hr";

describe("copy", () => {
  describe("getCopy", () => {
    it("returns security copy for audience security", () => {
      const copy = getCopy("security");
      expect(copy.tagline).toBe(securityCopy.tagline);
      expect(copy.engineOnline).toBe("Engine Online");
    });

    it("returns HR copy for audience hr", () => {
      const copy = getCopy("hr");
      expect(copy.tagline).toBe(hrCopy.tagline);
      expect(copy.engineOnline).toBe("Ready");
    });
  });

  describe("audience-specific wording", () => {
    it("security tagline mentions adversarial/LLM", () => {
      expect(securityCopy.tagline).toMatch(/adversarial|LLM/i);
    });

    it("HR tagline is plain English and does not lead with adversarial", () => {
      expect(hrCopy.tagline).not.toMatch(/^.*adversarial/i);
      expect(hrCopy.tagline.length).toBeGreaterThan(0);
    });

    it("HR copy uses Ready instead of Engine Online for engine badge", () => {
      expect(hrCopy.engineOnline).toBe("Ready");
      expect(securityCopy.engineOnline).toBe("Engine Online");
    });
  });
});
