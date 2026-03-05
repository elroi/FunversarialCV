/**
 * TDD tests for IncidentMailto egg.
 * Run with: npm test
 */

import { incidentMailto } from "./IncidentMailto";
import {
  extractText,
  createDocumentWithText,
  MIME_PDF,
  MIME_DOCX,
} from "../engine/documentExtract";
import { DEFAULT_INCIDENT_MAILTO_TEMPLATE_ID } from "./templates";

describe("IncidentMailto", () => {
  describe("metadata", () => {
    it("exposes id incident-mailto", () => {
      expect(incidentMailto.id).toBe("incident-mailto");
    });
    it("maps to OWASP LLM02 Insecure Output", () => {
      expect(incidentMailto.owaspMapping).toContain("LLM02");
      expect(incidentMailto.owaspMapping).toContain("Insecure Output");
    });
    it("has name and description", () => {
      expect(incidentMailto.name).toBeTruthy();
      expect(incidentMailto.description).toBeTruthy();
    });
  });

  describe("validatePayload", () => {
    it("returns true for empty string (use defaults)", () => {
      expect(incidentMailto.validatePayload("")).toBe(true);
    });

    it("returns true for valid JSON with emailConfig and templateConfig", () => {
      const payload = JSON.stringify({
        emailConfig: { mode: "wrap-visible-email", targetTokenIndex: 0 },
        templateConfig: {
          templateId: DEFAULT_INCIDENT_MAILTO_TEMPLATE_ID,
          subjectTemplate: "Test subject",
          bodyTemplate: "Test body",
        },
      });
      expect(incidentMailto.validatePayload(payload)).toBe(true);
    });

    it("returns true for valid JSON with only templateConfig", () => {
      expect(
        incidentMailto.validatePayload(
          JSON.stringify({ templateConfig: { subjectTemplate: "Hi" } })
        )
      ).toBe(true);
    });

    it("returns false for malformed JSON", () => {
      expect(incidentMailto.validatePayload("{ invalid }")).toBe(false);
      expect(incidentMailto.validatePayload("not json")).toBe(false);
    });

    it("returns false when template subject or body contains < or >", () => {
      expect(
        incidentMailto.validatePayload(
          JSON.stringify({
            templateConfig: { subjectTemplate: "Bad <script> here" },
          })
        )
      ).toBe(false);
      expect(
        incidentMailto.validatePayload(
          JSON.stringify({
            templateConfig: { bodyTemplate: "Close > bracket" },
          })
        )
      ).toBe(false);
    });

    it("returns false when subject or body exceeds max length", () => {
      const long = "a".repeat(501);
      expect(
        incidentMailto.validatePayload(
          JSON.stringify({ templateConfig: { subjectTemplate: long } })
        )
      ).toBe(false);
      expect(
        incidentMailto.validatePayload(
          JSON.stringify({ templateConfig: { bodyTemplate: long } })
        )
      ).toBe(false);
    });

    it("returns true when subject and body at max length", () => {
      const ok = "a".repeat(500);
      expect(
        incidentMailto.validatePayload(
          JSON.stringify({
            templateConfig: { subjectTemplate: ok, bodyTemplate: "short" },
          })
        )
      ).toBe(true);
    });

    it("returns false when cc contains invalid email", () => {
      expect(
        incidentMailto.validatePayload(
          JSON.stringify({
            emailConfig: { cc: ["not-an-email"] },
          })
        )
      ).toBe(false);
    });

    it("returns true when cc contains valid email", () => {
      expect(
        incidentMailto.validatePayload(
          JSON.stringify({
            emailConfig: { cc: ["security@example.com"] },
          })
        )
      ).toBe(true);
    });
  });

  describe("transform", () => {
    it.skip("wraps PII_EMAIL_0 in mailto link for PDF (pdf-parse needs worker in Node)", async () => {
      const text = "Contact: {{PII_EMAIL_0}} for more.";
      const buf = await createDocumentWithText(text, MIME_PDF);
      const result = await incidentMailto.transform(buf, "");
      const extracted = await extractText(Buffer.from(result), MIME_PDF);
      expect(extracted).toContain("mailto:");
      expect(extracted).toContain("{{PII_EMAIL_0}}");
      expect(extracted).toMatch(/\?subject=/);
    });

    it("wraps PII_EMAIL_0 in mailto link for DOCX", async () => {
      const text = "Email: {{PII_EMAIL_0}}";
      const buf = await createDocumentWithText(text, MIME_DOCX);
      const result = await incidentMailto.transform(buf, "");
      const extracted = await extractText(Buffer.from(result), MIME_DOCX);
      expect(extracted).toContain("mailto:");
      expect(extracted).toContain("{{PII_EMAIL_0}}");
    });

    it("leaves document unchanged when no email token present", async () => {
      const text = "No email here.";
      const buf = await createDocumentWithText(text, MIME_DOCX);
      const result = await incidentMailto.transform(buf, "");
      const extracted = await extractText(Buffer.from(result), MIME_DOCX);
      expect(extracted).toContain("No email here.");
      expect(extracted).not.toContain("mailto:");
    });

    it("uses custom subject from payload", async () => {
      const text = "{{PII_EMAIL_0}}";
      const buf = await createDocumentWithText(text, MIME_DOCX);
      const payload = JSON.stringify({
        templateConfig: {
          subjectTemplate: "CustomSubjectLine",
          bodyTemplate: "Body",
        },
      });
      const result = await incidentMailto.transform(buf, payload);
      const extracted = await extractText(Buffer.from(result), MIME_DOCX);
      expect(extracted).toContain("subject=");
      expect(extracted).toContain("CustomSubjectLine");
    });

    it("throws on unknown buffer format", async () => {
      const unknown = Buffer.from([0x00, 0x01, 0x02]);
      await expect(
        incidentMailto.transform(unknown, "")
      ).rejects.toThrow(/unsupported|unknown/i);
    });
  });
});
