import { getCopy } from "./index";
import { securityCopy } from "./security";
import { hrCopy } from "./hr";

describe("copy", () => {
  describe("getCopy", () => {
    it("returns security copy for audience security", () => {
      const copy = getCopy("security");
      expect(copy.tagline).toBe(securityCopy.tagline);
      expect(copy.experimentFlowCollapsibleTitle).toBe("How to run a fair test");
      expect(securityCopy.piiModeBadge).toMatch(/PII · client vault/i);
      expect(securityCopy.introLead).toMatch(/educational adversarial simulation/i);
      expect(securityCopy.introLead).toMatch(/hands-on professional exploration/i);
      expect(securityCopy.introDetail).toMatch(/OWASP-aligned/i);
    });

    it("returns HR copy for audience hr", () => {
      const copy = getCopy("hr");
      expect(copy.tagline).toBe(hrCopy.tagline);
      expect(copy.privacyDetailsSummary).toBe("How we protect your contact details");
      expect(hrCopy.introLead).toMatch(/compare before-and-after results/i);
      expect(hrCopy.introDetail).toBe("");
      expect(hrCopy.piiModeBadge).toMatch(/Private processing: no CV storage/i);
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

    it("engineConfigTitle is set for both audiences", () => {
      expect(getCopy("security").engineConfigTitle).toBe("Engine Configuration");
      expect(getCopy("hr").engineConfigTitle).toBe("How it runs");
    });

    it("engine config intros differ by audience and state", () => {
      const sec = getCopy("security");
      const hr = getCopy("hr");
      expect(sec.engineConfigIntroNoCv).toMatch(/eggs to run/i);
      expect(sec.engineConfigIntroCvReady).toMatch(/Expand each egg/i);
      expect(hr.engineConfigIntroNoCv).toMatch(/signals to add/i);
      expect(hr.engineConfigIntroCvReady).toMatch(/Add signals/i);
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
