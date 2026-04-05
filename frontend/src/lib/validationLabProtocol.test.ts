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

  it("parses security external comparative evaluation copy into headline and ten steps", () => {
    const parsed = parseValidationLabProtocol(
      securityCopy.validationLabManualMirrorProtocol
    );
    expect(parsed).not.toBeNull();
    expect(parsed!.headline).toMatch(/External comparative evaluation/i);
    expect(parsed!.title).toMatch(/^External comparative evaluation$/i);
    expect(parsed!.subtitle).toMatch(/Proof on this page first/i);
    expect(parsed!.description).toMatch(/Invisible Hand|Inject Eggs/i);
    expect(parsed!.steps).toHaveLength(10);
    expect(parsed!.steps.some((s) => /BASE-00/i.test(s))).toBe(true);
    expect(parsed!.steps.some((s) => /BASE-01/i.test(s))).toBe(true);
    expect(parsed!.steps[0]).toMatch(/Upload or sample CV.*#console-cv-upload/s);
    expect(parsed!.steps[1]).toMatch(
      /#console-armed-cv|#console-inject-eggs|#console-download-armed-docx/s
    );
    expect(parsed!.steps[2]).toMatch(/Sample job description/i);
    expect(parsed!.steps[3]).toMatch(/#validation-lab-harness|Ingestion lab/i);
    expect(parsed!.steps[4]).toMatch(/lab completion|pinned template/i);
    expect(parsed!.steps[5]).toMatch(/Open two browser tabs[\s\S]*Claude/i);
    expect(parsed!.steps[6]).toMatch(/BASE-00/i);
    expect(parsed!.steps[7]).toMatch(/sample job description/i);
    expect(parsed!.steps[8]).toMatch(/BASE-01/i);
    expect(parsed!.steps[9]).toMatch(
      /armed CV|step \(2\)|Pick a test prompt|\(A\).*Check for hidden/is
    );
  });

  it("parses HR validation copy into headline and ten steps", () => {
    const parsed = parseValidationLabProtocol(hrCopy.validationLabManualMirrorProtocol);
    expect(parsed).not.toBeNull();
    expect(parsed!.headline).toMatch(/External comparative evaluation/i);
    expect(parsed!.title).toMatch(/^External comparative evaluation$/i);
    expect(parsed!.subtitle).toMatch(/Proof on this page first/i);
    expect(parsed!.description).toMatch(/Add signals|LLM01/i);
    expect(parsed!.steps).toHaveLength(10);
    expect(parsed!.steps.some((s) => /BASE-00/i.test(s))).toBe(true);
    expect(parsed!.steps.some((s) => /BASE-01/i.test(s))).toBe(true);
    expect(parsed!.steps[0]).toMatch(/Upload or sample CV|console-cv-upload/i);
    expect(parsed!.steps[1]).toMatch(/Add signals|console-download-armed-docx/i);
    expect(parsed!.steps[3]).toMatch(/What the file says|validation-lab-harness/i);
    expect(parsed!.steps[5]).toMatch(/Open two browser tabs[\s\S]*Claude/i);
    expect(parsed!.steps[6]).toMatch(/BASE-00/i);
    expect(parsed!.steps[9]).toMatch(/signaled CV|Pick a test prompt|\(A\).*Check for hidden/is);
  });
});
