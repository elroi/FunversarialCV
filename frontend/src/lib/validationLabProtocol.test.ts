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
    expect(parsed!.subtitle).toMatch(/Manual steps to run the same JD, CV, and prompts/i);
    expect(parsed!.description).toMatch(/sample JD describes|logistics/i);
    expect(parsed!.description).toMatch(/BASE-00.*BASE-01/s);
    expect(parsed!.steps).toHaveLength(10);
    expect(parsed!.steps[0]).toMatch(/Open two browser tabs[\s\S]*Claude/i);
    expect(parsed!.steps[1]).toMatch(/BASE-00/i);
    expect(parsed!.steps[2]).toMatch(/sample job description/i);
    expect(parsed!.steps[3]).toMatch(/BASE-01/i);
    expect(parsed!.steps[4]).toMatch(
      /load the sample CV or upload your own[\s\S]*generated sample Word file[\s\S]*baseline/is
    );
    expect(parsed!.steps[5]).toMatch(/one tab:[\s\S]*baseline CV[\s\S]*BASE-01/is);
    expect(parsed!.steps[6]).toMatch(/Inject Eggs[\s\S]*armed build/is);
    expect(parsed!.steps[7]).toMatch(/other tab:[\s\S]*armed CV/is);
    expect(parsed!.steps[8]).toMatch(/baseline.*armed.*tab/is);
    expect(parsed!.steps[9]).toMatch(
      /Pick a test prompt[\s\S]*Compare the model|\(A\).*Check for hidden/is
    );
  });

  it("parses HR validation copy into headline and ten steps", () => {
    const parsed = parseValidationLabProtocol(hrCopy.validationLabManualMirrorProtocol);
    expect(parsed).not.toBeNull();
    expect(parsed!.headline).toMatch(/External comparative evaluation/i);
    expect(parsed!.title).toMatch(/^External comparative evaluation$/i);
    expect(parsed!.subtitle).toMatch(/Manual steps to run the same JD, CV, and prompts/i);
    expect(parsed!.description).toMatch(/sample job describes|logistics|security leadership/i);
    expect(parsed!.steps).toHaveLength(10);
    expect(parsed!.steps[0]).toMatch(/Open two browser tabs[\s\S]*Claude/i);
    expect(parsed!.steps[1]).toMatch(/BASE-00/i);
    expect(parsed!.steps[2]).toMatch(/sample job description/i);
    expect(parsed!.steps[3]).toMatch(/BASE-01/i);
    expect(parsed!.steps[4]).toMatch(
      /load the sample CV or upload your own[\s\S]*generated sample Word file[\s\S]*baseline/is
    );
    expect(parsed!.steps[6]).toMatch(/Add signals[\s\S]*signaled build/is);
    expect(parsed!.steps[9]).toMatch(
      /Pick a test prompt[\s\S]*Compare the AI|\(A\).*Check for hidden/is
    );
  });
});
