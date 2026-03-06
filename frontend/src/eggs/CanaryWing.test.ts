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
      const long = "a".repeat(1025);
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
  });
});
