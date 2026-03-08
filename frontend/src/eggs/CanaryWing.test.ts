/**
 * TDD tests for CanaryWing egg (OWASP LLM10: Model Theft & Exfiltration).
 * Run with: npm test
 */

import { canaryWing } from "./CanaryWing";
import {
  extractText,
  createDocumentWithText,
  MIME_PDF,
  MIME_DOCX,
} from "../engine/documentExtract";
import { PDFDocument } from "pdf-lib";
import { PII_REGEX } from "../lib/vault";
import JSZip from "jszip";

describe("CanaryWing", () => {
  describe("metadata", () => {
    it("exposes id canary-wing", () => {
      expect(canaryWing.id).toBe("canary-wing");
    });
    it("maps to OWASP LLM10 Model Theft & Exfiltration", () => {
      expect(canaryWing.owaspMapping).toContain("LLM10");
      expect(canaryWing.owaspMapping).toContain("Model Theft");
    });
    it("has name and description", () => {
      expect(canaryWing.name).toBeTruthy();
      expect(canaryWing.description).toBeTruthy();
    });
    it("has non-empty manualCheckAndValidation with manual check and validation instructions", () => {
      expect(canaryWing.manualCheckAndValidation).toBeTruthy();
      expect(canaryWing.manualCheckAndValidation.length).toBeGreaterThan(20);
    });
  });

  describe("validatePayload", () => {
    it("returns true for empty string (use default canary)", () => {
      expect(canaryWing.validatePayload("")).toBe(true);
    });

    it("returns true for valid JSON with baseUrl", () => {
      const payload = JSON.stringify({
        baseUrl: "https://canary.example.com/c",
      });
      expect(canaryWing.validatePayload(payload)).toBe(true);
    });

    it("returns true for valid JSON with baseUrl and token", () => {
      const payload = JSON.stringify({
        baseUrl: "https://canary.example.com/c",
        token: "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
      });
      expect(canaryWing.validatePayload(payload)).toBe(true);
    });

    it("returns true for valid JSON with url only (CanaryTokens-style full URL)", () => {
      const payload = JSON.stringify({
        url: "https://canarytokens.com/feedback/abc/xyz123",
      });
      expect(canaryWing.validatePayload(payload)).toBe(true);
    });

    it("returns true when both url and baseUrl/token present (url wins in transform)", () => {
      const payload = JSON.stringify({
        url: "https://canarytokens.com/feedback/full/token",
        baseUrl: "https://other.com/c",
        token: "ignored",
      });
      expect(canaryWing.validatePayload(payload)).toBe(true);
    });

    it("returns false when url has non-http(s) scheme", () => {
      expect(
        canaryWing.validatePayload(
          JSON.stringify({ url: "ftp://files.example.com/canary" })
        )
      ).toBe(false);
    });

    it("returns false when url contains PII or script", () => {
      expect(
        canaryWing.validatePayload(
          JSON.stringify({ url: "https://user@evil.com/path" })
        )
      ).toBe(false);
      expect(
        canaryWing.validatePayload(
          JSON.stringify({ url: "https://evil.com/<script>" })
        )
      ).toBe(false);
    });

    it("returns false for invalid URL", () => {
      expect(
        canaryWing.validatePayload(JSON.stringify({ baseUrl: "not-a-url" }))
      ).toBe(false);
      expect(
        canaryWing.validatePayload(JSON.stringify({ baseUrl: "ftp://x.com" }))
      ).toBe(false);
    });

    it("returns false when baseUrl contains PII-like email", () => {
      expect(
        canaryWing.validatePayload(
          JSON.stringify({ baseUrl: "https://user@evil.com/c" })
        )
      ).toBe(false);
    });

    it("returns false when token contains invalid chars", () => {
      expect(
        canaryWing.validatePayload(
          JSON.stringify({
            baseUrl: "https://canary.example.com/c",
            token: "bad<script>token",
          })
        )
      ).toBe(false);
    });

    it("returns false when payload exceeds max length", () => {
      const long = "a".repeat(2049);
      expect(canaryWing.validatePayload(long)).toBe(false);
    });

    it("returns true when payload is at most 1024 chars", () => {
      const payload = JSON.stringify({
        baseUrl: "https://example.com/c",
        token: "a".repeat(128),
      });
      expect(payload.length).toBeLessThanOrEqual(1024);
      expect(canaryWing.validatePayload(payload)).toBe(true);
    });

    it("returns true when payload is at most 2048 chars", () => {
      const payload = JSON.stringify({
        baseUrl: "https://example.com/c",
        docxDisplayText: "x".repeat(100),
        metadataKey: "K".repeat(64),
      });
      expect(payload.length).toBeLessThanOrEqual(2048);
      expect(canaryWing.validatePayload(payload)).toBe(true);
    });

    it("returns false for malformed JSON when non-empty", () => {
      expect(canaryWing.validatePayload("{ invalid }")).toBe(false);
    });

    it("returns false when baseUrl contains < or >", () => {
      expect(
        canaryWing.validatePayload(
          JSON.stringify({ baseUrl: "https://evil.com/<path>" })
        )
      ).toBe(false);
    });

    describe("extended embedding options", () => {
      it("returns true for docxLinkStyle clickable", () => {
        expect(
          canaryWing.validatePayload(
            JSON.stringify({ docxLinkStyle: "clickable" })
          )
        ).toBe(true);
      });
      it("returns true for docxLinkStyle hidden or clickable-with-text", () => {
        expect(canaryWing.validatePayload(JSON.stringify({ docxLinkStyle: "hidden" }))).toBe(true);
        expect(
          canaryWing.validatePayload(
            JSON.stringify({ docxLinkStyle: "clickable-with-text" })
          )
        ).toBe(true);
      });
      it("returns true for docxDisplayText with safe chars up to 100", () => {
        const payload = JSON.stringify({
          docxDisplayText: "Verify document integrity",
        });
        expect(canaryWing.validatePayload(payload)).toBe(true);
        expect(
          canaryWing.validatePayload(
            JSON.stringify({ docxDisplayText: "A".repeat(100) })
          )
        ).toBe(true);
      });
      it("returns false when docxDisplayText exceeds 100 chars", () => {
        expect(
          canaryWing.validatePayload(
            JSON.stringify({ docxDisplayText: "A".repeat(101) })
          )
        ).toBe(false);
      });
      it("returns false when docxDisplayText contains PII", () => {
        expect(
          canaryWing.validatePayload(
            JSON.stringify({ docxDisplayText: "Contact me at test@example.com" })
          )
        ).toBe(false);
      });
      it("returns false when docxDisplayText contains < or >", () => {
        expect(
          canaryWing.validatePayload(
            JSON.stringify({ docxDisplayText: "Click <here>" })
          )
        ).toBe(false);
      });
      it("returns true for metadataKey matching allowlist (letters, numbers, underscore, max 64)", () => {
        expect(
          canaryWing.validatePayload(
            JSON.stringify({ addToMetadata: true, metadataKey: "VerificationURL" })
          )
        ).toBe(true);
        expect(
          canaryWing.validatePayload(
            JSON.stringify({ metadataKey: "A1b2_custom_key" })
          )
        ).toBe(true);
        expect(
          canaryWing.validatePayload(
            JSON.stringify({ metadataKey: "K".repeat(64) })
          )
        ).toBe(true);
      });
      it("returns false when metadataKey exceeds 64 chars", () => {
        expect(
          canaryWing.validatePayload(
            JSON.stringify({ metadataKey: "K".repeat(65) })
          )
        ).toBe(false);
      });
      it("returns false when metadataKey has invalid chars", () => {
        expect(
          canaryWing.validatePayload(
            JSON.stringify({ metadataKey: "has-dash" })
          )
        ).toBe(false);
        expect(
          canaryWing.validatePayload(
            JSON.stringify({ metadataKey: "has space" })
          )
        ).toBe(false);
      });
      it("returns true for payload at most 2048 chars with extended options", () => {
        const payload = JSON.stringify({
          baseUrl: "https://example.com/c",
          docxLinkStyle: "clickable-with-text",
          docxDisplayText: "Verify integrity",
          addToMetadata: true,
          metadataKey: "VerificationURL",
        });
        expect(payload.length).toBeLessThanOrEqual(2048);
        expect(canaryWing.validatePayload(payload)).toBe(true);
      });

      it("returns true for independent embedding booleans (docxHiddenText, docxClickableLink, pdfHiddenText, pdfClickableLink)", () => {
        expect(
          canaryWing.validatePayload(
            JSON.stringify({ docxHiddenText: true, docxClickableLink: true })
          )
        ).toBe(true);
        expect(
          canaryWing.validatePayload(
            JSON.stringify({ pdfHiddenText: true, pdfClickableLink: true })
          )
        ).toBe(true);
      });

      it("returns true for docxClickableVisible and docxPlacement end|footer", () => {
        expect(
          canaryWing.validatePayload(
            JSON.stringify({ docxClickableVisible: true, docxPlacement: "end" })
          )
        ).toBe(true);
        expect(
          canaryWing.validatePayload(
            JSON.stringify({ docxPlacement: "footer" })
          )
        ).toBe(true);
      });
      it("returns false when docxPlacement is not end or footer", () => {
        expect(
          canaryWing.validatePayload(
            JSON.stringify({ docxPlacement: "header" })
          )
        ).toBe(false);
      });
    });
  });

  describe("transform", () => {
    it("embeds canary URL with default base in PDF when payload empty", async () => {
      const minimalPdf = await createDocumentWithText("Resume content", MIME_PDF);
      const result = await canaryWing.transform(minimalPdf, "");
      const doc = await PDFDocument.load(new Uint8Array(result));
      expect(doc.getPageCount()).toBeGreaterThanOrEqual(1);
      expect(result.length).toBeGreaterThan(minimalPdf.length);
      // PDF streams are compressed; canary URL is embedded as 0.5pt white text
      // (content assertion via extractText skipped in Node - pdf-parse worker limitation)
    });

    it("embeds canary URL into DOCX when payload empty", async () => {
      const minimalDocx = await createDocumentWithText("Resume content\nLine two", MIME_DOCX);
      const result = await canaryWing.transform(minimalDocx, "");
      const extracted = await extractText(Buffer.from(result), MIME_DOCX);
      expect(extracted).toMatch(/\/api\/canary\//);
      expect(extracted).toMatch(
        /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i
      );
    });

    it("uses custom baseUrl and token from payload for DOCX", async () => {
      const text = "Dehydrated content";
      const buf = await createDocumentWithText(text, MIME_DOCX);
      const payload = JSON.stringify({
        baseUrl: "https://canary.example.com/c",
        token: "my-custom-token-123",
      });
      const result = await canaryWing.transform(buf, payload);
      const extracted = await extractText(Buffer.from(result), MIME_DOCX);
      expect(extracted).toContain("https://canary.example.com/c/my-custom-token-123");
    });

    it("uses custom baseUrl and generated UUID when token omitted in payload for DOCX", async () => {
      const buf = await createDocumentWithText("Content", MIME_DOCX);
      const payload = JSON.stringify({ baseUrl: "https://track.example.com/h" });
      const result = await canaryWing.transform(buf, payload);
      const extracted = await extractText(Buffer.from(result), MIME_DOCX);
      expect(extracted).toContain("https://track.example.com/h/");
      expect(extracted).toMatch(
        /https:\/\/track\.example\.com\/h\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i
      );
    });

    it("throws on unknown buffer format", async () => {
      const unknown = Buffer.from([0x00, 0x01, 0x02]);
      await expect(canaryWing.transform(unknown, "")).rejects.toThrow(
        /unsupported|unknown/i
      );
    });

    it("vault alignment: embedded URL does not contain PII tokens", async () => {
      const text = "Contact: {{PII_EMAIL_0}} and {{PII_PHONE_0}}";
      const buf = await createDocumentWithText(text, MIME_DOCX);
      const payload = JSON.stringify({
        baseUrl: "https://canary.example.com/c",
        token: "safe-token",
      });
      const result = await canaryWing.transform(buf, payload);
      const extracted = await extractText(Buffer.from(result), MIME_DOCX);
      const canaryUrl = "https://canary.example.com/c/safe-token";
      expect(extracted).toContain(canaryUrl);
      expect(canaryUrl).not.toMatch(PII_REGEX.EMAIL);
      expect(canaryUrl).not.toMatch(PII_REGEX.PHONE);
      expect(canaryUrl).not.toContain("{{PII_");
    });

    it("embeds exact url when payload has url only (CanaryTokens-style)", async () => {
      const buf = await createDocumentWithText("Content", MIME_DOCX);
      const fullUrl = "https://canarytokens.com/feedback/abc/xyz123";
      const payload = JSON.stringify({ url: fullUrl });
      const result = await canaryWing.transform(buf, payload);
      const extracted = await extractText(Buffer.from(result), MIME_DOCX);
      expect(extracted).toContain(fullUrl);
      expect(extracted).not.toContain("/xyz123/"); // no extra token appended
    });

    it("url takes precedence over baseUrl and token", async () => {
      const buf = await createDocumentWithText("Content", MIME_DOCX);
      const fullUrl = "https://canarytokens.com/feedback/only/this";
      const payload = JSON.stringify({
        url: fullUrl,
        baseUrl: "https://other.com/c",
        token: "ignored-token",
      });
      const result = await canaryWing.transform(buf, payload);
      const extracted = await extractText(Buffer.from(result), MIME_DOCX);
      expect(extracted).toContain(fullUrl);
      expect(extracted).not.toContain("ignored-token");
      expect(extracted).not.toContain("other.com");
    });

    describe("DOCX clickable link (docxLinkStyle)", () => {
      it("when docxLinkStyle is clickable, output contains w:hyperlink and relationship with Target URL", async () => {
        const buf = await createDocumentWithText("Resume", MIME_DOCX);
        const canaryUrl = "https://canary.example.com/c/click-me";
        const payload = JSON.stringify({
          url: canaryUrl,
          docxLinkStyle: "clickable",
        });
        const result = await canaryWing.transform(buf, payload);
        const zip = await JSZip.loadAsync(result);
        const docXml = await zip.file("word/document.xml")!.async("string");
        expect(docXml).toContain("w:hyperlink");
        expect(docXml).toMatch(/r:id="[^"]+"/);
        const relsFile = zip.file("word/_rels/document.xml.rels");
        expect(relsFile).toBeTruthy();
        const relsXml = await relsFile!.async("string");
        expect(relsXml).toContain('Target="https://canary.example.com/c/click-me?v=docx-clickable"');
        expect(relsXml).toMatch(/TargetMode="External"/);
        const extracted = await extractText(Buffer.from(result), MIME_DOCX);
        expect(extracted).toContain(canaryUrl);
      });

      it("when docxLinkStyle is clickable-with-text, display text appears in document", async () => {
        const buf = await createDocumentWithText("Resume", MIME_DOCX);
        const payload = JSON.stringify({
          url: "https://canary.example.com/c/tok",
          docxLinkStyle: "clickable-with-text",
          docxDisplayText: "Verify document integrity",
        });
        const result = await canaryWing.transform(buf, payload);
        const extracted = await extractText(Buffer.from(result), MIME_DOCX);
        expect(extracted).toContain("Verify document integrity");
        const zip = await JSZip.loadAsync(result);
        const docXml = await zip.file("word/document.xml")!.async("string");
        expect(docXml).toContain("w:hyperlink");
        expect(docXml).toContain("Verify document integrity");
        const relsXml = await zip.file("word/_rels/document.xml.rels")!.async("string");
        expect(relsXml).toContain('Target="https://canary.example.com/c/tok?v=docx-clickable"');
      });

      it("when docxLinkStyle is hidden or omitted, no hyperlink in DOCX (backward compat)", async () => {
        const buf = await createDocumentWithText("Resume", MIME_DOCX);
        const payload = JSON.stringify({ url: "https://canary.example.com/c/hidden" });
        const result = await canaryWing.transform(buf, payload);
        const zip = await JSZip.loadAsync(result);
        const docXml = await zip.file("word/document.xml")!.async("string");
        expect(docXml).not.toContain("w:hyperlink");
        const extracted = await extractText(Buffer.from(result), MIME_DOCX);
        expect(extracted).toContain("https://canary.example.com/c/hidden");
      });

      it("when both docxHiddenText and docxClickableLink are true, output has both hidden paragraph and hyperlink", async () => {
        const buf = await createDocumentWithText("Resume", MIME_DOCX);
        const canaryUrl = "https://canary.example.com/c/both";
        const payload = JSON.stringify({
          url: canaryUrl,
          docxHiddenText: true,
          docxClickableLink: true,
        });
        const result = await canaryWing.transform(buf, payload);
        const zip = await JSZip.loadAsync(result);
        const docXml = await zip.file("word/document.xml")!.async("string");
        expect(docXml).toContain("w:hyperlink");
        const relsXml = await zip.file("word/_rels/document.xml.rels")!.async("string");
        expect(relsXml).toContain('Target="https://canary.example.com/c/both?v=docx-clickable"');
        const extracted = await extractText(Buffer.from(result), MIME_DOCX);
        expect(extracted).toContain(canaryUrl);
      });

      it("when both docxHiddenText and docxClickableLink with baseUrl+token, output contains two distinct variant URLs (docx-hidden and docx-clickable)", async () => {
        const buf = await createDocumentWithText("Resume", MIME_DOCX);
        const payload = JSON.stringify({
          baseUrl: "https://canary.example.com/api/canary",
          token: "uuid-550e8400",
          docxHiddenText: true,
          docxClickableLink: true,
        });
        const result = await canaryWing.transform(buf, payload);
        const extracted = await extractText(Buffer.from(result), MIME_DOCX);
        expect(extracted).toContain("https://canary.example.com/api/canary/uuid-550e8400/docx-hidden");
        expect(extracted).toContain("https://canary.example.com/api/canary/uuid-550e8400/docx-clickable");
        const zip = await JSZip.loadAsync(result);
        const relsXml = await zip.file("word/_rels/document.xml.rels")!.async("string");
        expect(relsXml).toContain("/uuid-550e8400/docx-clickable");
      });

      it("when config.url is set and both DOCX embeddings on, URLs use v= variant query param", async () => {
        const buf = await createDocumentWithText("Resume", MIME_DOCX);
        const fullUrl = "https://canarytokens.com/feedback/abc/xyz";
        const payload = JSON.stringify({
          url: fullUrl,
          docxHiddenText: true,
          docxClickableLink: true,
        });
        const result = await canaryWing.transform(buf, payload);
        const extracted = await extractText(Buffer.from(result), MIME_DOCX);
        expect(extracted).toMatch(/v=docx-hidden/);
        expect(extracted).toMatch(/v=docx-clickable/);
        const zip = await JSZip.loadAsync(result);
        const relsXml = await zip.file("word/_rels/document.xml.rels")!.async("string");
        expect(relsXml).toMatch(/v=docx-clickable/);
      });

      it("when docxClickableVisible is true, DOCX hyperlink has visible styling (9pt, blue)", async () => {
        const buf = await createDocumentWithText("Resume", MIME_DOCX);
        const payload = JSON.stringify({
          url: "https://canary.example.com/c/visible",
          docxClickableLink: true,
          docxClickableVisible: true,
        });
        const result = await canaryWing.transform(buf, payload);
        const zip = await JSZip.loadAsync(result);
        const docXml = await zip.file("word/document.xml")!.async("string");
        expect(docXml).toContain("w:sz w:val=\"18\"");
        expect(docXml).toContain("w:color w:val=\"0563C1\"");
      });

      it("when docxPlacement is footer, link is at end of document (compatibility: no OOXML footer part)", async () => {
        const buf = await createDocumentWithText("Resume", MIME_DOCX);
        const payload = JSON.stringify({
          url: "https://canary.example.com/c/foot",
          docxClickableLink: true,
          docxPlacement: "footer",
          docxDisplayText: "Verify document",
        });
        const result = await canaryWing.transform(buf, payload);
        const extracted = await extractText(Buffer.from(result), MIME_DOCX);
        expect(extracted).toContain("Verify document");
        const zip = await JSZip.loadAsync(result);
        expect(zip.file("word/footer1.xml")).toBeFalsy();
      });
    });

    describe("PDF clickable link (pdfLinkStyle)", () => {
      it("when pdfLinkStyle is clickable, PDF has Link annotation with URI", async () => {
        const minimalPdf = await createDocumentWithText("Resume", MIME_PDF);
        const payload = JSON.stringify({
          url: "https://canary.example.com/c/pdf-link",
          pdfLinkStyle: "clickable",
        });
        const result = await canaryWing.transform(minimalPdf, payload);
        const doc = await PDFDocument.load(new Uint8Array(result));
        expect(doc.getPageCount()).toBeGreaterThanOrEqual(1);
        const page = doc.getPage(0);
        const leaf = page as unknown as { node: { Annots?: () => { size: () => number; get: (i: number) => unknown } } };
        const annots = leaf.node.Annots?.();
        expect(annots).toBeDefined();
        expect(annots!.size()).toBeGreaterThanOrEqual(1);
      });

      it("when pdfLinkStyle is hidden or omitted, no Annots or empty Annots (backward compat)", async () => {
        const minimalPdf = await createDocumentWithText("Resume", MIME_PDF);
        const result = await canaryWing.transform(minimalPdf, "");
        const doc = await PDFDocument.load(new Uint8Array(result));
        const page = doc.getPage(0);
        const leaf = page as unknown as { node: { Annots?: () => { size: () => number } } };
        const annots = leaf.node.Annots?.();
        if (annots) {
          expect(annots.size()).toBe(0);
        }
      });

      it("when both pdfHiddenText and pdfClickableLink with baseUrl+token, PDF has link annotation and larger size (both variants embedded)", async () => {
        const minimalPdf = await createDocumentWithText("Resume", MIME_PDF);
        const payload = JSON.stringify({
          baseUrl: "https://canary.example.com/api/canary",
          token: "uuid-pdf-both",
          pdfHiddenText: true,
          pdfClickableLink: true,
        });
        const result = await canaryWing.transform(minimalPdf, payload);
        const doc = await PDFDocument.load(new Uint8Array(result));
        const page = doc.getPage(0);
        const leaf = page as unknown as { node: { Annots?: () => { size: () => number } } };
        const annots = leaf.node.Annots?.();
        expect(annots).toBeDefined();
        expect(annots!.size()).toBeGreaterThanOrEqual(1);
        const noLinkPdf = await canaryWing.transform(minimalPdf, JSON.stringify({
          baseUrl: "https://canary.example.com/api/canary",
          token: "uuid-pdf-both",
          pdfHiddenText: true,
          pdfClickableLink: false,
        }));
        expect(result.length).toBeGreaterThan(noLinkPdf.length);
      });
    });
  });
});
