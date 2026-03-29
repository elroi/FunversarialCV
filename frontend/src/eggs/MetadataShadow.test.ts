/**
 * TDD tests for MetadataShadow egg (OWASP LLM02: Insecure Output).
 */

import { metadataShadow } from "./MetadataShadow";
import { createDocumentWithText, MIME_PDF, MIME_DOCX } from "../engine/documentExtract";

describe("MetadataShadow", () => {
  describe("metadata", () => {
    it("exposes id metadata-shadow", () => {
      expect(metadataShadow.id).toBe("metadata-shadow");
    });
    it("maps to OWASP LLM02 Insecure Output", () => {
      expect(metadataShadow.owaspMapping).toContain("LLM02");
    });
    it("has name and description", () => {
      expect(metadataShadow.name).toBeTruthy();
      expect(metadataShadow.description).toBeTruthy();
    });
    it("has non-empty manualCheckAndValidation with manual check and validation instructions", () => {
      expect(metadataShadow.manualCheckAndValidation).toBeTruthy();
      expect(metadataShadow.manualCheckAndValidation.length).toBeGreaterThan(20);
    });
  });

  describe("validatePayload", () => {
    it("returns true for empty string (no metadata to set)", () => {
      expect(metadataShadow.validatePayload("")).toBe(true);
    });

    it("returns true for valid JSON with allowlisted keys", () => {
      expect(
        metadataShadow.validatePayload(JSON.stringify({ Ranking: "Top_1%" }))
      ).toBe(true);
      expect(
        metadataShadow.validatePayload(
          JSON.stringify({ Status: "Preferred", Score: "A" })
        )
      ).toBe(true);
      expect(
        metadataShadow.validatePayload(
          JSON.stringify({ custom_key: "value", Key2: "v2" })
        )
      ).toBe(true);
    });

    it("returns false for malformed JSON", () => {
      expect(metadataShadow.validatePayload("{ bad }")).toBe(false);
      expect(metadataShadow.validatePayload("not json")).toBe(false);
    });

    it("returns false for keys not in allowlist (alphanumeric + underscore only)", () => {
      expect(
        metadataShadow.validatePayload(
          JSON.stringify({ "bad-key": "v" })
        )
      ).toBe(false);
      expect(
        metadataShadow.validatePayload(
          JSON.stringify({ "key with space": "v" })
        )
      ).toBe(false);
    });

    it("returns false when value contains PII (email)", () => {
      expect(
        metadataShadow.validatePayload(
          JSON.stringify({ Note: "Contact me@example.com" })
        )
      ).toBe(false);
    });

    it("returns false when value exceeds max length", () => {
      const long = "a".repeat(201);
      expect(
        metadataShadow.validatePayload(
          JSON.stringify({ Ranking: long })
        )
      ).toBe(false);
    });
  });

  describe("transform", () => {
    it("sets PDF keywords metadata when payload has key-value", async () => {
      const buf = await createDocumentWithText("Resume", MIME_PDF);
      const payload = JSON.stringify({ Ranking: "Top_1%" });
      const result = await metadataShadow.transform(buf, payload);
      expect(result).toBeInstanceOf(Buffer);
      expect(result.length).toBeGreaterThan(0);
      const { PDFDocument } = await import("pdf-lib");
      const doc = await PDFDocument.load(new Uint8Array(result));
      const kw = doc.getKeywords();
      expect(kw).toBeDefined();
      const kwStr = Array.isArray(kw) ? (kw as string[]).join(" ") : String(kw ?? "");
      expect(kwStr).toContain("Ranking");
      expect(kwStr).toContain("Top_1%");
    }, 10000);

    it("sets DOCX custom property when payload has key-value", async () => {
      const buf = await createDocumentWithText("Resume", MIME_DOCX);
      const payload = JSON.stringify({ Ranking: "Top_1%" });
      const result = await metadataShadow.transform(buf, payload);
      expect(result).toBeInstanceOf(Buffer);
      expect(result[0]).toBe(0x50);
      expect(result[1]).toBe(0x4b);
      const JSZip = (await import("jszip")).default;
      const zip = await JSZip.loadAsync(result);
      const customFile = zip.file("docProps/custom.xml");
      expect(customFile).toBeTruthy();
      const xml = await customFile!.async("string");
      expect(xml).toContain("Ranking");
      expect(xml).toContain("Top_1%");
      const rels = await zip.file("_rels/.rels")!.async("string");
      expect(rels).toContain("custom-properties");
      expect(rels).toContain("docProps/custom.xml");
    }, 10000);

    it("leaves buffer unchanged when payload is empty", async () => {
      const buf = await createDocumentWithText("Resume", MIME_DOCX);
      const result = await metadataShadow.transform(buf, "");
      expect(result.equals(buf)).toBe(true);
    });

    it("leaves buffer unchanged when payload is empty JSON object", async () => {
      const buf = await createDocumentWithText("Resume", MIME_DOCX);
      const result = await metadataShadow.transform(buf, "{}");
      expect(result.equals(buf)).toBe(true);
    });
  });
});
