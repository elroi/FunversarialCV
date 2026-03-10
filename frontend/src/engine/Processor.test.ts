/**
 * Processor integration tests: pipeline uses Scanner and returns ScannerReport.
 */

import { process } from "./Processor";
import { createDocumentWithText, MIME_DOCX, MIME_PDF } from "./documentExtract";
import { DUALITY_ALERT_MESSAGE } from "../lib/Scanner";
import { invisibleHand } from "../eggs/InvisibleHand";
import { canaryWing } from "../eggs/CanaryWing";
import { metadataShadow } from "../eggs/MetadataShadow";
import { incidentMailto } from "../eggs/IncidentMailto";
import { extractText } from "./documentExtract";
import JSZip from "jszip";

function countDocxParagraphs(buffer: Buffer): Promise<number> {
  return JSZip.loadAsync(buffer).then((zip) => {
    const f = zip.file("word/document.xml");
    if (!f) return 0;
    return f.async("string").then((xml) => {
      const matches = xml.match(/<w:p\b/g);
      return matches ? matches.length : 0;
    });
  });
}

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

  describe("preserveStyles feature flag (add-only path)", () => {
    it("when preserveStyles is true and only add-only eggs: uses original buffer, preserves DOCX paragraph count", async () => {
      const buffer = await createDocumentWithText("Line one\nLine two\nLine three", MIME_DOCX);
      const inputParagraphCount = await countDocxParagraphs(buffer);
      expect(inputParagraphCount).toBe(3);

      const result = await process({
        buffer,
        mimeType: MIME_DOCX,
        eggs: [invisibleHand],
        preserveStyles: true,
      });

      const outputParagraphCount = await countDocxParagraphs(result.buffer);
      expect(outputParagraphCount).toBe(inputParagraphCount + 1);
      const extracted = await extractText(result.buffer, MIME_DOCX);
      expect(extracted).toContain("Line one");
      expect(extracted).toContain("Line two");
      expect(extracted).toContain("Line three");
      expect(extracted).toContain("System Note");
    }, 15000);

    it.skip("when preserveStyles is true and only add-only eggs: PDF preserves page count (skipped: extractText uses pdf-parse which fails in Jest)", async () => {
      const buffer = await createDocumentWithText("Resume content", MIME_PDF);
      const result = await process({
        buffer,
        mimeType: MIME_PDF,
        eggs: [canaryWing],
        preserveStyles: true,
      });
      const { PDFDocument } = await import("pdf-lib");
      const doc = await PDFDocument.load(new Uint8Array(result.buffer));
      expect(doc.getPageCount()).toBe(1);
      expect(result.buffer.length).toBeGreaterThan(buffer.length);
    }, 15000);

    it("when preserveStyles is false: uses rebuild path (no paragraph count assertion)", async () => {
      const buffer = await createDocumentWithText("Line one\nLine two", MIME_DOCX);
      const result = await process({
        buffer,
        mimeType: MIME_DOCX,
        eggs: [invisibleHand],
        preserveStyles: false,
      });
      const extracted = await extractText(result.buffer, MIME_DOCX);
      expect(extracted).toContain("Line one");
      expect(extracted).toContain("System Note");
    }, 15000);

    it("when preserveStyles is true but incident-mailto is selected: uses rebuild path", async () => {
      const buffer = await createDocumentWithText("Contact me at john@example.com", MIME_DOCX);
      const result = await process({
        buffer,
        mimeType: MIME_DOCX,
        eggs: [invisibleHand, incidentMailto],
        preserveStyles: true,
      });
      const extracted = await extractText(result.buffer, MIME_DOCX);
      expect(extracted).toContain("Contact me at john@example.com");
      expect(extracted).toContain("System Note");
      // mailto: appears in rels (AST/append path) or in body text (rebuild path if style-preserving path fails)
      const zip = await JSZip.loadAsync(result.buffer);
      const relsXml = await zip.file("word/_rels/document.xml.rels")?.async("string") ?? "";
      const mailtoInRels = relsXml.includes("mailto:");
      const mailtoInBody = extracted.includes("mailto:");
      expect(mailtoInRels || mailtoInBody).toBe(true);
    }, 15000);

    it("when preserveStyles is true and eggs are empty: returns buffer unchanged", async () => {
      const buffer = await createDocumentWithText("Only content", MIME_DOCX);
      const result = await process({
        buffer,
        mimeType: MIME_DOCX,
        eggs: [],
        preserveStyles: true,
      });
      expect(result.buffer.equals(buffer)).toBe(true);
    }, 15000);

    it("when preserveStyles is true and multiple add-only eggs: injects all", async () => {
      const buffer = await createDocumentWithText("Intro\nBody", MIME_DOCX);
      const inputParagraphCount = await countDocxParagraphs(buffer);

      const result = await process({
        buffer,
        mimeType: MIME_DOCX,
        eggs: [invisibleHand, canaryWing, metadataShadow],
        payloads: { "metadata-shadow": JSON.stringify({ Ranking: "Top_1" }) },
        preserveStyles: true,
      });

      const outputParagraphCount = await countDocxParagraphs(result.buffer);
      expect(outputParagraphCount).toBe(inputParagraphCount + 2);
      const extracted = await extractText(result.buffer, MIME_DOCX);
      expect(extracted).toContain("Intro");
      expect(extracted).toContain("Body");
      expect(extracted).toContain("System Note");
      expect(extracted).toMatch(/\/api\/canary\//);
    }, 15000);

    it("when preserveStyles is false and canary runs: final DOCX has clickable hyperlink (re-injected after rehydration)", async () => {
      const buffer = await createDocumentWithText("Resume", MIME_DOCX);
      const result = await process({
        buffer,
        mimeType: MIME_DOCX,
        eggs: [canaryWing],
        preserveStyles: false,
      });
      const zip = await JSZip.loadAsync(result.buffer);
      const docXml = await zip.file("word/document.xml")?.async("string");
      const relsXml = await zip.file("word/_rels/document.xml.rels")?.async("string");
      expect(docXml).toContain("w:hyperlink");
      expect(relsXml).toMatch(/Target="https?:\/\/[^"]+\/api\/canary\/[a-f0-9-]+\/docx-hidden/);
      const extracted = await extractText(result.buffer, MIME_DOCX);
      expect(extracted).toMatch(/\/api\/canary\//);
    }, 15000);
  });
});
