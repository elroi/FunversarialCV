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

    it("engineConfigTitle is set for both audiences", () => {
      expect(getCopy("security").engineConfigTitle).toBe("Engine Configuration");
      expect(getCopy("hr").engineConfigTitle).toBe("How it runs");
    });

    it("positioningLine, flowSteps (length 6), philosophyLine, and experimentFlowLabel are set for both audiences", () => {
      const security = getCopy("security");
      const hr = getCopy("hr");
      expect(security.experimentFlowLabel).toBeDefined();
      expect(security.experimentFlowLabel.length).toBeGreaterThan(0);
      expect(security.positioningLine).toBeDefined();
      expect(security.positioningLine.length).toBeGreaterThan(0);
      expect(security.flowSteps).toHaveLength(6);
      expect(security.philosophyLine).toBeDefined();
      expect(security.philosophyLine.length).toBeGreaterThan(0);
      expect(hr.experimentFlowLabel).toBeDefined();
      expect(hr.experimentFlowLabel.length).toBeGreaterThan(0);
      expect(hr.positioningLine).toBeDefined();
      expect(hr.positioningLine.length).toBeGreaterThan(0);
      expect(hr.flowSteps).toHaveLength(6);
      expect(hr.philosophyLine).toBeDefined();
      expect(hr.philosophyLine.length).toBeGreaterThan(0);
    });
  });
});
