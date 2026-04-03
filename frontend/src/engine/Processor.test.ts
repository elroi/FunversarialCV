/**
 * Processor integration tests: pipeline uses Scanner and returns ScannerReport.
 */

import { process } from "./Processor";
import { createDocumentWithText, MIME_DOCX, MIME_PDF } from "./documentExtract";
import { DUALITY_ALERT_MESSAGE } from "../lib/Scanner";
import { invisibleHand, DEFAULT_INVISIBLE_HAND_TRAP } from "../eggs/InvisibleHand";
import { canaryWing } from "../eggs/CanaryWing";
import { MACHINE_METADATA_DECOYS } from "./divergenceProfile";
import { metadataShadow } from "../eggs/MetadataShadow";
import { incidentMailto } from "../eggs/IncidentMailto";
import { extractText } from "./documentExtract";
import JSZip from "jszip";

jest.mock("./documentExtract", () => {
  const actual = jest.requireActual<typeof import("./documentExtract")>("./documentExtract");
  return {
    ...actual,
    extractText: jest.fn((buffer: Buffer, mimeType: string) => actual.extractText(buffer, mimeType)),
  };
});

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

  it("round-trips address through full pipeline: dehydrate → eggs → rehydrate", async () => {
    const textWithAddress = "John Doe. Address: 123 Main St. Experienced engineer.";
    const buffer = await createDocumentWithText(textWithAddress, MIME_DOCX);
    const result = await process({
      buffer,
      mimeType: MIME_DOCX,
      eggs: [invisibleHand],
      preserveStyles: false,
    });
    const extracted = await extractText(result.buffer, MIME_DOCX);
    expect(extracted).toContain("123 Main St");
    expect(extracted).not.toMatch(/\{\{PII_ADDR_\d+\}\}/);
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
      expect(extracted).toContain(DEFAULT_INVISIBLE_HAND_TRAP);
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
      expect(extracted).toContain(DEFAULT_INVISIBLE_HAND_TRAP);
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
      expect(extracted).toContain(DEFAULT_INVISIBLE_HAND_TRAP);
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
      expect(extracted).toContain(DEFAULT_INVISIBLE_HAND_TRAP);
      expect(extracted).toMatch(/\/api\/canary\//);
    }, 15000);

    it("when preserveStyles is true and only add-only eggs: PDF with extractText throwing still applies eggs and returns", async () => {
      const buffer = await createDocumentWithText("Resume content", MIME_PDF);
      (extractText as jest.Mock).mockRejectedValueOnce(new Error("Invalid PDF"));

      const result = await process({
        buffer,
        mimeType: MIME_PDF,
        eggs: [invisibleHand],
        preserveStyles: true,
      });

      expect(result.buffer).toBeDefined();
      expect(result.buffer.length).toBeGreaterThan(buffer.length);
      expect(result.scannerReport).toBeDefined();
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

  describe("divergence profiles (machine vs balanced)", () => {
    it("machine profile increases parser-visible trap text vs balanced (invisible-hand)", async () => {
      const buffer = await createDocumentWithText("Senior engineer. TypeScript.", MIME_DOCX);
      const balancedResult = await process({
        buffer,
        mimeType: MIME_DOCX,
        eggs: [invisibleHand],
        preserveStyles: false,
        divergenceProfile: "balanced",
      });
      const machineResult = await process({
        buffer,
        mimeType: MIME_DOCX,
        eggs: [invisibleHand],
        preserveStyles: false,
        divergenceProfile: "machine",
      });
      const balText = await extractText(balancedResult.buffer, MIME_DOCX);
      const machText = await extractText(machineResult.buffer, MIME_DOCX);
      expect(machText.length).toBeGreaterThan(balText.length);
      expect(machText).toContain(DEFAULT_INVISIBLE_HAND_TRAP);
      expect(machText).toContain("Secondary system note");
    }, 15000);

    it("machine profile adds metadata decoys when metadata-shadow runs", async () => {
      const buffer = await createDocumentWithText("Role: Engineer", MIME_DOCX);
      const result = await process({
        buffer,
        mimeType: MIME_DOCX,
        eggs: [metadataShadow],
        preserveStyles: true,
        divergenceProfile: "machine",
        payloads: {},
      });
      const zip = await JSZip.loadAsync(result.buffer);
      const customXml = await zip.file("docProps/custom.xml")?.async("string");
      expect(customXml).toBeDefined();
      for (const key of Object.keys(MACHINE_METADATA_DECOYS)) {
        expect(customXml).toContain(key);
      }
    }, 15000);

    it("visible-diff guardrail: paragraph delta machine vs balanced stays bounded (canary + invisible)", async () => {
      const buffer = await createDocumentWithText("Line one\nLine two", MIME_DOCX);
      const canaryPayload = JSON.stringify({ token: "profile-guard-token-1" });
      const eggs = [invisibleHand, canaryWing];
      const balancedResult = await process({
        buffer,
        mimeType: MIME_DOCX,
        eggs,
        preserveStyles: true,
        divergenceProfile: "balanced",
        payloads: { "canary-wing": canaryPayload },
      });
      const machineResult = await process({
        buffer,
        mimeType: MIME_DOCX,
        eggs,
        preserveStyles: true,
        divergenceProfile: "machine",
        payloads: { "canary-wing": canaryPayload },
      });
      const balP = await countDocxParagraphs(balancedResult.buffer);
      const machP = await countDocxParagraphs(machineResult.buffer);
      expect(Math.abs(machP - balP)).toBeLessThanOrEqual(4);
    }, 15000);
  });
});
