/**
 * TDD tests for applyStylePreservingMailto (Incident Mailto DOCX helper).
 */

import { applyStylePreservingMailto } from "./docxMailto";
import { createDocumentWithText, extractText, MIME_DOCX } from "./documentExtract";
import JSZip from "jszip";

describe("applyStylePreservingMailto", () => {
  it("appends a visible mailto hyperlink paragraph without altering existing content", async () => {
    const text = "Intro\nEmail: {{PII_EMAIL_0}}\nFooter";
    const buffer = await createDocumentWithText(text, MIME_DOCX);

    const result = await applyStylePreservingMailto(
      buffer,
      "mailto:test@example.com?subject=Test",
      "Report incident"
    );

    const zip = await JSZip.loadAsync(result);
    const docXml = await zip.file("word/document.xml")!.async("string");
    const relsXml = await zip
      .file("word/_rels/document.xml.rels")!
      .async("string");

    expect(docXml).toContain("w:hyperlink");
    expect(docXml).toContain("Report incident");
    expect(relsXml).toContain("mailto:test@example.com?subject=Test");

    const extracted = await extractText(Buffer.from(result), MIME_DOCX);
    expect(extracted).toContain("Intro");
    expect(extracted).toContain("Email:");
    expect(extracted).toContain("{{PII_EMAIL_0}}");
    // Visible text contains label; mailto lives in relationships.
    expect(relsXml).toContain("mailto:test@example.com?subject=Test");
  });

  it("produces a DOCX that can be re-extracted", async () => {
    const text = "Only content";
    const buffer = await createDocumentWithText(text, MIME_DOCX);
    const result = await applyStylePreservingMailto(
      buffer,
      "mailto:test@example.com",
      "Report"
    );
    const extracted = await extractText(Buffer.from(result), MIME_DOCX);
    expect(extracted).toContain("Only content");
    const zip = await JSZip.loadAsync(result);
    const relsXml = await zip
      .file("word/_rels/document.xml.rels")!
      .async("string");
    expect(relsXml).toContain("mailto:test@example.com");
  });

  it("works with single-line content matching IncidentMailto test", async () => {
    const text = "Email: elroi.luria@gmail.com";
    const buffer = await createDocumentWithText(text, MIME_DOCX);
    const result = await applyStylePreservingMailto(
      Buffer.from(buffer),
      "mailto:incident@example.com",
      "Report incident"
    );
    const zip = await JSZip.loadAsync(result);
    const docXml = await zip.file("word/document.xml")!.async("string");
    const relsXml = await zip.file("word/_rels/document.xml.rels")!.async("string");
    expect(docXml).toContain("w:hyperlink");
    expect(relsXml).toContain("mailto:incident@example.com");
  });
});

