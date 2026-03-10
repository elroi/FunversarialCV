import JSZip from "jszip";
import { createDocumentWithText, MIME_DOCX } from "./documentExtract";
import { applyDocxIncidentMailtoAst, getFirstEmailFromDocxBody } from "./docxMailtoField";

const DOCUMENT_XML_PATH = "word/document.xml";
const RELS_PATH = "word/_rels/document.xml.rels";

describe("applyDocxIncidentMailtoAst", () => {
  it("updates existing mailto hyperlink relationship used by a field-code style hyperlink", async () => {
    const base = await createDocumentWithText("Body", MIME_DOCX);
    const zip = await JSZip.loadAsync(base);

    const wNs = "http://schemas.openxmlformats.org/wordprocessingml/2006/main";
    const docXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="${wNs}">
  <w:body>
    <w:p>
      <w:r>
        <w:instrText>HYPERLINK "mailto:original@example.com"</w:instrText>
      </w:r>
      <w:r>
        <w:rPr><w:rStyle w:val="Hyperlink"/></w:rPr>
        <w:t>original@example.com</w:t>
      </w:r>
    </w:p>
  </w:body>
</w:document>`;
    zip.file(DOCUMENT_XML_PATH, docXml);

    const relsXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId5" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/hyperlink" Target="mailto:original@example.com" TargetMode="External"/>
</Relationships>`;
    zip.file(RELS_PATH, relsXml);

    const buffer = Buffer.from(
      await zip.generateAsync({
        type: "nodebuffer",
        compression: "DEFLATE",
        compressionOptions: { level: 6 },
      })
    );

    const { buffer: out, applied } = await applyDocxIncidentMailtoAst(buffer, {
      mailtoUrl: "mailto:incident@example.com",
    });
    expect(applied).toBe(true);

    const outZip = await JSZip.loadAsync(out);
    const outDoc = await outZip.file(DOCUMENT_XML_PATH)!.async("string");
    const outRels = await outZip.file(RELS_PATH)!.async("string");

    expect(outRels).toContain(
      'Target="mailto:incident@example.com"'
    );
    expect(outRels).not.toContain("mailto:original@example.com");

    // Visible email text and styling preserved.
    expect(outDoc).toContain("<w:t>original@example.com</w:t>");
    expect(outDoc).toContain('<w:rStyle w:val="Hyperlink"/>');
  });

  it("wraps visible email text in a new w:hyperlink while preserving run styling", async () => {
    const base = await createDocumentWithText(
      "Email: user@example.com",
      MIME_DOCX
    );
    const { buffer, applied } = await applyDocxIncidentMailtoAst(base, {
      mailtoUrl: "mailto:incident@example.com",
      visibleEmail: "user@example.com",
    });
    expect(applied).toBe(true);

    const zip = await JSZip.loadAsync(buffer);
    const docXml = await zip.file(DOCUMENT_XML_PATH)!.async("string");
    const relsXml = await zip.file(RELS_PATH)!.async("string");

    expect(relsXml).toContain(
      'Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/hyperlink"'
    );
    expect(relsXml).toContain(
      'Target="mailto:incident@example.com"'
    );

    expect(docXml).toContain("<w:hyperlink");
    expect(docXml).toContain("user@example.com");
  });

  it("wraps visible email elroi.luria@gmail.com (same as IncidentMailto test)", async () => {
    const base = await createDocumentWithText(
      "Email: elroi.luria@gmail.com",
      MIME_DOCX
    );
    const { buffer, applied } = await applyDocxIncidentMailtoAst(base, {
      mailtoUrl: "mailto:incident@example.com",
      label: "Report incident",
      visibleEmail: "elroi.luria@gmail.com",
    });
    expect(applied).toBe(true);
    const zip = await JSZip.loadAsync(buffer);
    const docXml = await zip.file(DOCUMENT_XML_PATH)!.async("string");
    expect(docXml).toContain("<w:hyperlink");
    expect(docXml).toContain("elroi.luria@gmail.com");
  });

  it("replaces mailto field with single hyperlink when email is in field (display text + new canary link)", async () => {
    const base = await createDocumentWithText("Body", MIME_DOCX);
    const zip = await JSZip.loadAsync(base);
    const wNs = "http://schemas.openxmlformats.org/wordprocessingml/2006/main";
    const docXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="${wNs}">
  <w:body>
    <w:p>
      <w:r><w:t xml:space="preserve">Contact: </w:t></w:r>
      <w:r><w:fldChar w:fldCharType="begin"/></w:r>
      <w:r><w:instrText>HYPERLINK "mailto:user@example.com"</w:instrText></w:r>
      <w:r><w:fldChar w:fldCharType="separate"/></w:r>
      <w:r><w:rPr><w:rStyle w:val="Hyperlink"/></w:rPr><w:t>user@example.com</w:t></w:r>
      <w:r><w:fldChar w:fldCharType="end"/></w:r>
    </w:p>
  </w:body>
</w:document>`;
    zip.file(DOCUMENT_XML_PATH, docXml);
    const buffer = Buffer.from(
      await zip.generateAsync({
        type: "nodebuffer",
        compression: "DEFLATE",
        compressionOptions: { level: 6 },
      })
    );
    const { buffer: out, applied } = await applyDocxIncidentMailtoAst(buffer, {
      mailtoUrl: "mailto:incident@example.com",
      visibleEmail: "user@example.com",
    });
    expect(applied).toBe(true);
    const outZip = await JSZip.loadAsync(out);
    const outDoc = await outZip.file(DOCUMENT_XML_PATH)!.async("string");
    const outRels = await outZip.file(RELS_PATH)!.async("string");
    expect(outDoc).not.toContain('fldCharType="begin"');
    expect(outDoc).not.toContain("<w:instrText>");
    expect(outDoc).toContain("<w:hyperlink");
    expect(outDoc).toContain("user@example.com");
    expect(outDoc).toContain("w:rStyle");
    expect(outRels).toContain('Target="mailto:incident@example.com"');
  });

  it("is a no-op when no visible email can be matched", async () => {
    const base = await createDocumentWithText("No email here", MIME_DOCX);
    const originalZip = await JSZip.loadAsync(base);
    const originalDoc = await originalZip.file(DOCUMENT_XML_PATH)!.async("string");
    const originalRels =
      (await originalZip.file(RELS_PATH)?.async("string")) ?? null;

    const { buffer, applied } = await applyDocxIncidentMailtoAst(base, {
      mailtoUrl: "mailto:incident@example.com",
      visibleEmail: "user@example.com",
    });

    expect(applied).toBe(false);

    const zip = await JSZip.loadAsync(buffer);
    const docXml = await zip.file(DOCUMENT_XML_PATH)!.async("string");
    const relsXml =
      (await zip.file(RELS_PATH)?.async("string")) ?? null;

    expect(docXml).toBe(originalDoc);
    expect(relsXml).toBe(originalRels);
  });
});

describe("getFirstEmailFromDocxBody", () => {
  it("returns first email from document.xml when present", async () => {
    const buffer = await createDocumentWithText(
      "Contact me at john@example.com",
      MIME_DOCX
    );
    const email = await getFirstEmailFromDocxBody(buffer);
    expect(email).toBe("john@example.com");
  });

  it("returns null when document has no email", async () => {
    const buffer = await createDocumentWithText("No email here", MIME_DOCX);
    const email = await getFirstEmailFromDocxBody(buffer);
    expect(email).toBeNull();
  });
});
