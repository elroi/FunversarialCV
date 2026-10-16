import { securityCopy } from "../copy/security";
import { hrCopy } from "../copy/hr";
import {
  parseValidationLabProtocol,
  splitValidationLabProtocolHeadline,
} from "./validationLabProtocol";

describe("splitValidationLabProtocolHeadline", () => {
  it("splits title, em-dash subtitle, and multi-line description", () => {
    const block = `External comparative evaluation
— Manual steps to run the same JD in another LLM.
First para of context. On BASE-01, expect mismatch.
Second para if any.`;
    const split = splitValidationLabProtocolHeadline(block);
    expect(split.title).toBe("External comparative evaluation");
    expect(split.subtitle).toBe("Manual steps to run the same JD in another LLM.");
    expect(split.description).toContain("First para of context");
    expect(split.description).toContain("Second para if any.");
  });
});

describe("parseValidationLabProtocol", () => {
  it("joins continuation lines with newlines so steps can render as multiple lines", () => {
    const parsed = parseValidationLabProtocol(
      "Test headline\n\n(1) First sentence.\nSecond sentence.\n(2) Only line."
    );
    expect(parsed).not.toBeNull();
    expect(parsed!.title).toBe("Test headline");
    expect(parsed!.subtitle).toBeNull();
    expect(parsed!.description).toBeNull();
    expect(parsed!.steps[0]).toBe("First sentence.\nSecond sentence.");
    expect(parsed!.steps[1]).toBe("Only line.");
  });

  it("parses security external comparative evaluation copy into headline and four steps", () => {
    const parsed = parseValidationLabProtocol(
      securityCopy.validationLabManualMirrorProtocol
    );
    expect(parsed).not.toBeNull();
    expect(parsed!.headline).toMatch(/External comparative evaluation/i);
    expect(parsed!.title).toMatch(/^External comparative evaluation$/i);
    expect(parsed!.subtitle).toMatch(/not a reliable test/i);
    expect(parsed!.steps).toHaveLength(4);
    expect(parsed!.steps[0]).toMatch(/Upload or sample CV[\s\S]*#console-cv-upload/);
    expect(parsed!.steps[1]).toMatch(
      /#console-armed-cv|#console-inject-eggs|#console-download-armed-docx/
    );
    expect(parsed!.steps[2]).toMatch(/#validation-lab-harness|Ingestion lab/i);
    expect(parsed!.steps[3]).toMatch(/BASE-00/i);
    expect(parsed!.steps[3]).toMatch(/BASE-01/i);
    expect(parsed!.steps[3]).toMatch(/see the note/i);
  });

  it("parses HR validation copy into headline and four steps", () => {
    const parsed = parseValidationLabProtocol(hrCopy.validationLabManualMirrorProtocol);
    expect(parsed).not.toBeNull();
    expect(parsed!.headline).toMatch(/External comparative evaluation/i);
    expect(parsed!.title).toMatch(/^External comparative evaluation$/i);
    expect(parsed!.subtitle).toMatch(/not a reliable test/i);
    expect(parsed!.steps).toHaveLength(4);
    expect(parsed!.steps[0]).toMatch(/upload or use the sample CV|console-cv-upload/i);
    expect(parsed!.steps[1]).toMatch(/Add signals|console-download-armed-docx/i);
    expect(parsed!.steps[2]).toMatch(/What the file says|validation-lab-harness/i);
    expect(parsed!.steps[3]).toMatch(/BASE-00/i);
    expect(parsed!.steps[3]).toMatch(/BASE-01/i);
  });
});
