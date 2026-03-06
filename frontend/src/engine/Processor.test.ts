/**
 * Processor integration tests: pipeline uses Scanner and returns ScannerReport.
 */

import { process } from "./Processor";
import { createDocumentWithText, MIME_DOCX } from "./documentExtract";
import { DUALITY_ALERT_MESSAGE } from "../lib/Scanner";

describe("Processor", () => {
  it("returns scannerReport with [DUALITY_ALERT] when DOCX contains canary URL", async () => {
    const textWithCanary = "Resume content. Contact: https://example.com/api/canary/abc-123.";
    const buffer = await createDocumentWithText(textWithCanary, MIME_DOCX);
    const result = await process({
      buffer,
      mimeType: MIME_DOCX,
      eggs: [],
    });
    expect(result.dualityCheck).toBeDefined();
    expect(result.dualityCheck.hasSuspiciousPatterns).toBe(true);
    expect(result.dualityCheck.matchedPatterns).toContain("existing_canary_url");
    expect(result.scannerReport).toBeDefined();
    expect(result.scannerReport.scan).toBe(result.dualityCheck);
    expect(result.scannerReport.alerts).toContain(DUALITY_ALERT_MESSAGE);
  }, 15000);

  it("returns scannerReport with no alerts when DOCX has no suspicious content", async () => {
    const cleanText = "Experienced engineer. Python, TypeScript.";
    const buffer = await createDocumentWithText(cleanText, MIME_DOCX);
    const result = await process({
      buffer,
      mimeType: MIME_DOCX,
      eggs: [],
    });
    expect(result.dualityCheck.hasSuspiciousPatterns).toBe(false);
    expect(result.dualityCheck.matchedPatterns).toEqual([]);
    expect(result.scannerReport.alerts).toEqual([]);
  }, 15000);
});
