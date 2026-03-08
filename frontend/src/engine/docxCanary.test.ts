/**
 * TDD tests for injectCanaryIntoDocx (Canary Wing DOCX hyperlink).
 */

import { injectCanaryIntoDocx } from "./docxCanary";
import { createDocumentWithText, extractText, MIME_DOCX } from "./documentExtract";
import JSZip from "jszip";

describe("injectCanaryIntoDocx", () => {
  it("injects hyperlink paragraph and relationship; URL is in rels Target", async () => {
    const buffer = await createDocumentWithText("Body", MIME_DOCX);
    const result = await injectCanaryIntoDocx(buffer, "https://canary.example.com/c/xyz", {
      linkStyle: "clickable",
    });
    const zip = await JSZip.loadAsync(result);
    const docXml = await zip.file("word/document.xml")!.async("string");
    expect(docXml).toContain("w:hyperlink");
    const relsXml = await zip.file("word/_rels/document.xml.rels")!.async("string");
    expect(relsXml).toContain('Target="https://canary.example.com/c/xyz"');
    expect(relsXml).toContain('TargetMode="External"');
    const extracted = await extractText(Buffer.from(result), MIME_DOCX);
    expect(extracted).toContain("https://canary.example.com/c/xyz");
  });

  it("uses display text when linkStyle is clickable-with-text", async () => {
    const buffer = await createDocumentWithText("Body", MIME_DOCX);
    const result = await injectCanaryIntoDocx(buffer, "https://example.com/v", {
      linkStyle: "clickable-with-text",
      displayText: "Verify here",
    });
    const extracted = await extractText(Buffer.from(result), MIME_DOCX);
    expect(extracted).toContain("Verify here");
    const zip = await JSZip.loadAsync(result);
    const relsXml = await zip.file("word/_rels/document.xml.rels")!.async("string");
    expect(relsXml).toContain('Target="https://example.com/v"');
  });

  it("picks non-colliding rId when document already has relationships", async () => {
    const buffer = await createDocumentWithText("Body", MIME_DOCX);
    const zip = await JSZip.loadAsync(buffer);
    const relsPath = "word/_rels/document.xml.rels";
    const existingRels = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>
  <Relationship Id="rId5" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/theme" Target="theme/theme1.xml"/>
</Relationships>`;
    zip.file(relsPath, existingRels);
    const modifiedBuffer = Buffer.from(await zip.generateAsync({ type: "nodebuffer", compression: "DEFLATE", compressionOptions: { level: 6 } }));
    const result = await injectCanaryIntoDocx(modifiedBuffer, "https://canary.example.com/c/new", {
      linkStyle: "clickable",
    });
    const resultZip = await JSZip.loadAsync(result);
    const relsXml = await resultZip.file(relsPath)!.async("string");
    expect(relsXml).toContain("rId1");
    expect(relsXml).toContain("rId5");
    expect(relsXml).toContain("rId6");
    expect(relsXml).toContain('Target="https://canary.example.com/c/new"');
    const docXml = await resultZip.file("word/document.xml")!.async("string");
    expect(docXml).toMatch(/r:id="rId6"/);
  });
});
