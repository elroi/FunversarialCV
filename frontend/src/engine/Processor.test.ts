/**
 * Processor integration tests: pipeline uses Scanner for duality check.
 */

import { process } from "./Processor";
import { createDocumentWithText, MIME_PDF, MIME_DOCX } from "./documentExtract";

describe("Processor", () => {
  it("returns scan result from Scanner when DOCX contains canary URL", async () => {
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
  }, 15000);

  it("returns clean scan result when DOCX has no suspicious content", async () => {
    const cleanText = "Experienced engineer. Python, TypeScript.";
    const buffer = await createDocumentWithText(cleanText, MIME_DOCX);
    const result = await process({
      buffer,
      mimeType: MIME_DOCX,
      eggs: [],
    });
    expect(result.dualityCheck.hasSuspiciousPatterns).toBe(false);
    expect(result.dualityCheck.matchedPatterns).toEqual([]);
  }, 15000);
});
