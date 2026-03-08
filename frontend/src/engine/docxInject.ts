/**
 * DOCX in-place injection: add a hidden paragraph without rebuilding the document.
 * Used by add-only eggs (InvisibleHand, CanaryWing) to preserve original styles.
 */

import JSZip from "jszip";

const DOCUMENT_XML_PATH = "word/document.xml";

/** Escape text for use inside XML element content. */
function escapeXml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

/**
 * Builds OOXML for a single paragraph containing one run with tiny white text.
 * w:sz is in half-points (2 = 1pt); w:color val="FFFFFF" for invisible-on-white.
 */
function buildHiddenParagraphXml(text: string): string {
  const escaped = escapeXml(text);
  return `<w:p><w:r><w:rPr><w:sz w:val="2"/><w:color w:val="FFFFFF"/></w:rPr><w:t xml:space="preserve">${escaped}</w:t></w:r></w:p>`;
}

/**
 * Injects a hidden paragraph (1pt white text) at the end of the document body.
 * Preserves all existing content and styling; does not push or modify visible text.
 */
export async function injectHiddenParagraphIntoDocx(
  buffer: Buffer,
  text: string
): Promise<Buffer> {
  const zip = await JSZip.loadAsync(buffer);
  const docFile = zip.file(DOCUMENT_XML_PATH);
  if (!docFile) {
    throw new Error("Invalid DOCX: missing word/document.xml");
  }
  let xml = await docFile.async("string");

  const hiddenP = buildHiddenParagraphXml(text);
  const bodyClose = "</w:body>";
  const closeIdx = xml.indexOf(bodyClose);
  if (closeIdx === -1) {
    throw new Error("Invalid DOCX: word/document.xml has no closing w:body");
  }
  xml = xml.slice(0, closeIdx) + hiddenP + xml.slice(closeIdx);

  zip.file(DOCUMENT_XML_PATH, xml);

  const out = await zip.generateAsync({
    type: "nodebuffer",
    compression: "DEFLATE",
    compressionOptions: { level: 6 },
  });
  return Buffer.from(out);
}
