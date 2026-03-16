/**
 * Unit tests for replacePiiWithTokensInCopy (DOCX in-place token replacement).
 * TDD: preserves layout by replacing PII with tokens inside word/document.xml.
 */

import {
  replacePiiWithTokensInCopy,
  rehydrateDocxBufferInPlace,
} from "./clientTokenReplaceInCopy";
import type { PiiMap } from "./clientVaultTypes";
import JSZip from "jszip";
import { MIME_DOCX, MIME_PDF } from "./clientDocumentExtract";
import { buildUncompressedDemoCvPdf } from "./demoCvBuilders";

/** Build a minimal DOCX buffer containing the given body text in word/document.xml. */
async function createMinimalDocxBuffer(bodyText: string): Promise<ArrayBuffer> {
  const zip = new JSZip();
  // Minimal OOXML document with one paragraph. Text in <w:t>.
  const documentXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:body>
    <w:p><w:r><w:t xml:space="preserve">${escapeXml(bodyText)}</w:t></w:r></w:p>
  </w:body>
</w:document>`;
  zip.file("word/document.xml", documentXml);
  zip.file("[Content_Types].xml", minimalContentTypes);
  zip.file("_rels/.rels", minimalRels);
  zip.file("docProps/app.xml", minimalApp);
  zip.file("docProps/core.xml", minimalCore);
  const arrayBuffer = await zip.generateAsync({
    type: "arraybuffer",
    compression: "DEFLATE",
    compressionOptions: { level: 6 },
  });
  return arrayBuffer;
}

function escapeXml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

const minimalContentTypes = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
</Types>`;

const minimalRels = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
</Relationships>`;

const minimalApp = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Properties xmlns="http://schemas.openxmlformats.org/officeDocument/2006/extended-properties"></Properties>`;

const minimalCore = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties"></cp:coreProperties>`;

describe("replacePiiWithTokensInCopy", () => {
  it("for PDF with empty piiMap, returns copy unchanged (no PII to replace)", async () => {
    const pdfBytes = new Uint8Array([0x25, 0x50, 0x44, 0x46, 0x2d, 0x31, 0x2e, 0x34]);
    const pdfFile = {
      name: "doc.pdf",
      type: MIME_PDF,
      arrayBuffer: () => Promise.resolve(pdfBytes.buffer.slice(0, pdfBytes.length)),
    } as File;
    const piiMap: PiiMap = { byToken: {} };
    const result = await replacePiiWithTokensInCopy(pdfFile, piiMap);
    expect(result).not.toBeNull();
    expect(result!.file.name).toBe("doc.pdf");
    expect(result!.file.type).toBe(MIME_PDF);
    expect(new Uint8Array(result!.buffer)).toEqual(pdfBytes);
  });

  it("for PDF when PII appears as literal bytes, replaces in-place and preserves layout", async () => {
    const encoder = new TextEncoder();
    const email = "user@example.com";
    const token = "{{PII_EMAIL_0}}";
    const pdfWithPii = encoder.encode(
      "%PDF-1.4\n%\n(fake stream) Contact: " + email + " for info.\n%%EOF"
    );
    const pdfFile = {
      name: "cv.pdf",
      type: MIME_PDF,
      arrayBuffer: () => Promise.resolve(pdfWithPii.buffer.slice(0, pdfWithPii.length)),
    } as File;
    const piiMap: PiiMap = {
      byToken: {
        [token]: { token, type: "EMAIL", value: email },
      },
    };
    const result = await replacePiiWithTokensInCopy(pdfFile, piiMap);
    expect(result).not.toBeNull();
    const outText = new TextDecoder().decode(result!.buffer);
    expect(outText).toContain(token);
    expect(outText).not.toContain(email);
    expect(outText).toContain("%PDF-1.4");
  });

  it("for PDF when PII not found in buffer (e.g. compressed), returns null so caller rebuilds", async () => {
    const pdfBytes = new Uint8Array([
      0x25, 0x50, 0x44, 0x46, 0x2d, 0x31, 0x2e, 0x34, 0x0a, 0x25, 0x0a,
    ]);
    const pdfFile = {
      name: "minimal.pdf",
      type: MIME_PDF,
      arrayBuffer: () => Promise.resolve(pdfBytes.buffer.slice(0, pdfBytes.length)),
    } as File;
    const piiMap: PiiMap = {
      byToken: {
        "{{PII_EMAIL_0}}": {
          token: "{{PII_EMAIL_0}}",
          type: "EMAIL",
          value: "user@example.com",
        },
      },
    };
    const result = await replacePiiWithTokensInCopy(pdfFile, piiMap);
    expect(result).toBeNull();
  });

  it("for uncompressed demo PDF with demo PII map, returns tokenized copy (preserve-styles path)", async () => {
    const buffer = buildUncompressedDemoCvPdf("clean");
    const pdfFile = {
      name: "demo.pdf",
      type: MIME_PDF,
      arrayBuffer: () =>
        Promise.resolve(buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength)),
    } as File;
    const email = "alex.mercer@example-secure.test";
    const piiMap: PiiMap = {
      byToken: {
        "{{PII_EMAIL_0}}": {
          token: "{{PII_EMAIL_0}}",
          type: "EMAIL",
          value: email,
        },
      },
    };
    const result = await replacePiiWithTokensInCopy(pdfFile, piiMap);
    expect(result).not.toBeNull();
    const outText = new TextDecoder().decode(result!.buffer);
    expect(outText).toContain("{{PII_EMAIL_0}}");
    expect(outText).not.toContain(email);
    expect(result!.file.name).toBe("demo.pdf");
  });

  it("for DOCX, replaces PII values with tokens in word/document.xml", async () => {
    const bodyText = "Contact me at user@example.com for more info.";
    const buf = await createMinimalDocxBuffer(bodyText);
    const file = {
      name: "cv.docx",
      type: MIME_DOCX,
      arrayBuffer: () => Promise.resolve(buf),
    } as File;
    const piiMap: PiiMap = {
      byToken: {
        "{{PII_EMAIL_0}}": {
          token: "{{PII_EMAIL_0}}",
          type: "EMAIL",
          value: "user@example.com",
        },
      },
    };
    const result = await replacePiiWithTokensInCopy(file, piiMap);
    expect(result).not.toBeNull();
    const { file: outFile, buffer: outBuffer } = result!;
    expect(outFile.name).toBe("cv.docx");
    expect(outFile.type).toBe(MIME_DOCX);

    const outZip = await JSZip.loadAsync(outBuffer);
    const docXml = await outZip.file("word/document.xml")!.async("string");
    expect(docXml).toContain("{{PII_EMAIL_0}}");
    expect(docXml).not.toContain("user@example.com");
  });

  it("for DOCX, preserves document structure (same ZIP entries and layout)", async () => {
    const bodyText = "Email: user@example.com";
    const buf = await createMinimalDocxBuffer(bodyText);
    const file = {
      name: "resume.docx",
      type: MIME_DOCX,
      arrayBuffer: () => Promise.resolve(buf),
    } as File;
    const piiMap: PiiMap = {
      byToken: {
        "{{PII_EMAIL_0}}": {
          token: "{{PII_EMAIL_0}}",
          type: "EMAIL",
          value: "user@example.com",
        },
      },
    };
    const result = await replacePiiWithTokensInCopy(file, piiMap);
    expect(result).not.toBeNull();
    const outZip = await JSZip.loadAsync(result!.buffer);
    expect(outZip.file("word/document.xml")).toBeDefined();
    const docXml = await outZip.file("word/document.xml")!.async("string");
    expect(docXml).toContain("<w:body>");
    expect(docXml).toContain("{{PII_EMAIL_0}}");
  });

  it("for DOCX with multiple PII, replaces all and returns tokenized copy", async () => {
    const bodyText =
      "Email user@example.com or call (555) 123-4567. Address: 123 Main St, City.";
    const buf = await createMinimalDocxBuffer(bodyText);
    const file = {
      name: "cv.docx",
      type: MIME_DOCX,
      arrayBuffer: () => Promise.resolve(buf),
    } as File;
    const piiMap: PiiMap = {
      byToken: {
        "{{PII_EMAIL_0}}": {
          token: "{{PII_EMAIL_0}}",
          type: "EMAIL",
          value: "user@example.com",
        },
        "{{PII_PHONE_0}}": {
          token: "{{PII_PHONE_0}}",
          type: "PHONE",
          value: "(555) 123-4567",
        },
        "{{PII_ADDR_0}}": {
          token: "{{PII_ADDR_0}}",
          type: "ADDRESS",
          value: "123 Main St, City.",
        },
      },
    };
    const result = await replacePiiWithTokensInCopy(file, piiMap);
    expect(result).not.toBeNull();
    const docXml = await (
      await JSZip.loadAsync(result!.buffer)
    )
      .file("word/document.xml")!
      .async("string");
    expect(docXml).toContain("{{PII_EMAIL_0}}");
    expect(docXml).toContain("{{PII_PHONE_0}}");
    expect(docXml).toContain("{{PII_ADDR_0}}");
    expect(docXml).not.toContain("user@example.com");
    expect(docXml).not.toContain("(555) 123-4567");
    expect(docXml).not.toContain("123 Main St, City.");
  });

  it("for DOCX with empty piiMap, returns copy unchanged except same bytes as modified (no-op replacements)", async () => {
    const bodyText = "No PII here.";
    const buf = await createMinimalDocxBuffer(bodyText);
    const file = {
      name: "cv.docx",
      type: MIME_DOCX,
      arrayBuffer: () => Promise.resolve(buf),
    } as File;
    const piiMap: PiiMap = { byToken: {} };
    const result = await replacePiiWithTokensInCopy(file, piiMap);
    expect(result).not.toBeNull();
    const docXml = await (
      await JSZip.loadAsync(result!.buffer)
    )
      .file("word/document.xml")!
      .async("string");
    expect(docXml).toContain("No PII here.");
  });

  it("for DOCX, returned file is a real File so FormData sends correct filename (avoids server 'File content does not match extension')", async () => {
    const bodyText = "Contact: user@example.com";
    const buf = await createMinimalDocxBuffer(bodyText);
    const originalName =
      "FunversarialCV Demo – Senior Security Architect (clean).docx";
    const file = {
      name: originalName,
      type: MIME_DOCX,
      arrayBuffer: () => Promise.resolve(buf),
    } as File;
    const piiMap: PiiMap = {
      byToken: {
        "{{PII_EMAIL_0}}": {
          token: "{{PII_EMAIL_0}}",
          type: "EMAIL",
          value: "user@example.com",
        },
      },
    };
    const result = await replacePiiWithTokensInCopy(file, piiMap);
    expect(result).not.toBeNull();
    const { file: outFile } = result!;
    expect(outFile.name).toBe(originalName);
    expect(outFile.name.toLowerCase().endsWith(".docx")).toBe(true);
    expect(outFile).toBeInstanceOf(File);
  });

  it("for DOCX, returned file name matches input file name so server extension check passes", async () => {
    const bodyText = "Hello";
    const buf = await createMinimalDocxBuffer(bodyText);
    const file = {
      name: "My CV.docx",
      type: MIME_DOCX,
      arrayBuffer: () => Promise.resolve(buf),
    } as File;
    const result = await replacePiiWithTokensInCopy(file, { byToken: {} });
    expect(result).not.toBeNull();
    expect(result!.file.name).toBe("My CV.docx");
  });
});

describe("rehydrateDocxBufferInPlace", () => {
  it("replaces tokens with PII in word/document.xml and preserves ZIP structure", async () => {
    const bodyText = "Contact: {{PII_EMAIL_0}}";
    const buf = await createMinimalDocxBuffer(bodyText);
    const piiMap: PiiMap = {
      byToken: {
        "{{PII_EMAIL_0}}": {
          token: "{{PII_EMAIL_0}}",
          type: "EMAIL",
          value: "user@example.com",
        },
      },
    };
    const rehydrated = await rehydrateDocxBufferInPlace(buf, piiMap);
    const zip = await JSZip.loadAsync(rehydrated);
    const docXml = await zip.file("word/document.xml")!.async("string");
    expect(docXml).toContain("user@example.com");
    expect(docXml).not.toContain("{{PII_EMAIL_0}}");
    expect(zip.file("word/document.xml")).toBeDefined();
  });

  it("preserves document layout (same XML structure, only text content changed)", async () => {
    const bodyText = "Email {{PII_EMAIL_0}} and {{PII_PHONE_0}}";
    const buf = await createMinimalDocxBuffer(bodyText);
    const piiMap: PiiMap = {
      byToken: {
        "{{PII_EMAIL_0}}": {
          token: "{{PII_EMAIL_0}}",
          type: "EMAIL",
          value: "alice@example.com",
        },
        "{{PII_PHONE_0}}": {
          token: "{{PII_PHONE_0}}",
          type: "PHONE",
          value: "(555) 111-2222",
        },
      },
    };
    const rehydrated = await rehydrateDocxBufferInPlace(buf, piiMap);
    const zip = await JSZip.loadAsync(rehydrated);
    const docXml = await zip.file("word/document.xml")!.async("string");
    expect(docXml).toContain("<w:body>");
    expect(docXml).toContain("alice@example.com");
    expect(docXml).toContain("(555) 111-2222");
    expect(docXml).not.toMatch(/\{\{PII_/);
  });

  it("rehydrates tokens in word/_rels/document.xml.rels (e.g. mailto link targets)", async () => {
    const zip = new JSZip();
    zip.file(
      "word/document.xml",
      `<?xml version="1.0"?><w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body><w:p><w:r><w:t>Contact {{PII_EMAIL_0}}</w:t></w:r></w:p></w:body></w:document>`
    );
    zip.file(
      "word/_rels/document.xml.rels",
      `<?xml version="1.0"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/hyperlink" Target="mailto:{{PII_EMAIL_0}}?subject=Test"/></Relationships>`
    );
    zip.file("[Content_Types].xml", minimalContentTypes);
    zip.file("_rels/.rels", minimalRels);
    zip.file("docProps/app.xml", minimalApp);
    zip.file("docProps/core.xml", minimalCore);
    const buf = await zip.generateAsync({
      type: "arraybuffer",
      compression: "DEFLATE",
      compressionOptions: { level: 6 },
    });
    const piiMap: PiiMap = {
      byToken: {
        "{{PII_EMAIL_0}}": {
          token: "{{PII_EMAIL_0}}",
          type: "EMAIL",
          value: "user@example.com",
        },
      },
    };
    const rehydrated = await rehydrateDocxBufferInPlace(buf, piiMap);
    const outZip = await JSZip.loadAsync(rehydrated);
    const relsXml = await outZip.file("word/_rels/document.xml.rels")!.async("string");
    expect(relsXml).toContain("mailto:user@example.com?subject=Test");
    expect(relsXml).not.toContain("{{PII_EMAIL_0}}");
  });
});
