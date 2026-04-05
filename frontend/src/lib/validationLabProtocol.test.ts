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
    expect(parsed!.subtitle).toMatch(/In-app ingestion lab first/i);
    expect(parsed!.description).toMatch(/Ingestion lab panel|LLM01/i);
    expect(parsed!.description).toMatch(/BASE-00.*BASE-01/s);
    expect(parsed!.steps).toHaveLength(10);
    expect(parsed!.steps[0]).toMatch(/Ingestion lab below[\s\S]*docx_hyperlinks/is);
    expect(parsed!.steps[1]).toMatch(/Compare extractors/i);
    expect(parsed!.steps[2]).toMatch(/lab completion/i);
    expect(parsed!.steps[3]).toMatch(/Open two browser tabs[\s\S]*Claude/i);
    expect(parsed!.steps[4]).toMatch(/BASE-00/i);
    expect(parsed!.steps[5]).toMatch(/sample job description/i);
    expect(parsed!.steps[6]).toMatch(/BASE-01/i);
    expect(parsed!.steps[7]).toMatch(
      /load the sample CV or upload your own[\s\S]*generated sample Word file[\s\S]*baseline/is
    );
    expect(parsed!.steps[8]).toMatch(/one tab:[\s\S]*baseline CV[\s\S]*BASE-01/is);
    expect(parsed!.steps[9]).toMatch(
      /Inject Eggs[\s\S]*armed build[\s\S]*Pick a test prompt|\(A\).*Check for hidden/is
    );
  });

  it("parses HR validation copy into headline and ten steps", () => {
    const parsed = parseValidationLabProtocol(hrCopy.validationLabManualMirrorProtocol);
    expect(parsed).not.toBeNull();
    expect(parsed!.headline).toMatch(/External comparative evaluation/i);
    expect(parsed!.title).toMatch(/^External comparative evaluation$/i);
    expect(parsed!.subtitle).toMatch(/on-page reader tools/i);
    expect(parsed!.description).toMatch(/What the file says|LLM01/i);
    expect(parsed!.description).toMatch(/BASE-00.*BASE-01/s);
    expect(parsed!.steps).toHaveLength(10);
    expect(parsed!.steps[0]).toMatch(/What the file says below/i);
    expect(parsed!.steps[1]).toMatch(/Compare two views/i);
    expect(parsed!.steps[2]).toMatch(/optional AI summary/i);
    expect(parsed!.steps[3]).toMatch(/Open two browser tabs[\s\S]*Claude/i);
    expect(parsed!.steps[4]).toMatch(/BASE-00/i);
    expect(parsed!.steps[5]).toMatch(/sample job description/i);
    expect(parsed!.steps[6]).toMatch(/BASE-01/i);
    expect(parsed!.steps[7]).toMatch(
      /load the sample CV or upload your own[\s\S]*generated sample Word file[\s\S]*baseline/is
    );
    expect(parsed!.steps[8]).toMatch(/one tab:[\s\S]*baseline CV[\s\S]*BASE-01/is);
    expect(parsed!.steps[9]).toMatch(
      /Add signals[\s\S]*signaled build[\s\S]*Pick a test prompt|\(A\).*Check for hidden/is
    );
  });
});
