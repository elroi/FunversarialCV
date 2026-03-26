import { securityCopy } from "../copy/security";
import { hrCopy } from "../copy/hr";
import { parseValidationLabProtocol } from "./validationLabProtocol";

describe("parseValidationLabProtocol", () => {
  it("parses security Manual Mirror copy into headline and four steps", () => {
    const parsed = parseValidationLabProtocol(
      securityCopy.validationLabManualMirrorProtocol
    );
    expect(parsed).not.toBeNull();
    expect(parsed!.headline).toMatch(/Manual Mirror Protocol/i);
    expect(parsed!.steps).toHaveLength(4);
    expect(parsed!.steps[0]).toMatch(/Inject Eggs/i);
    expect(parsed!.steps[3]).toMatch(/forensic proof-of-concept|proof-of-concept/i);
  });

  it("parses HR validation copy into headline and four steps", () => {
    const parsed = parseValidationLabProtocol(hrCopy.validationLabManualMirrorProtocol);
    expect(parsed).not.toBeNull();
    expect(parsed!.headline).toMatch(/How to test your CV/i);
    expect(parsed!.steps).toHaveLength(4);
    expect(parsed!.steps[0]).toMatch(/Add signals/i);
  });
});
