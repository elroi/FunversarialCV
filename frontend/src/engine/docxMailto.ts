import JSZip from "jszip";

const DOCUMENT_XML_PATH = "word/document.xml";
const RELS_PATH = "word/_rels/document.xml.rels";
const HYPERLINK_REL_TYPE =
  "http://schemas.openxmlformats.org/officeDocument/2006/relationships/hyperlink";
const RELS_NS = "http://schemas.openxmlformats.org/package/2006/relationships";

function escapeXml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

/**
 * Parse existing Relationship Ids from document.xml.rels and return a new unique rId.
 * Ids are typically rId1, rId2, ... but may be non-contiguous; we pick next numeric.
 */
function getNextRId(relsXml: string): string {
  const idMatches = relsXml.matchAll(/Id=["'](rId\d+)["']/g);
  let maxN = 0;
  for (const m of idMatches) {
    const n = parseInt(m[1].replace("rId", ""), 10);
    if (!Number.isNaN(n) && n > maxN) maxN = n;
  }
  return `rId${maxN + 1}`;
}

async function getOrCreateRelsXml(zip: JSZip): Promise<string> {
  const relsFile = zip.file(RELS_PATH);
  if (relsFile) {
    return relsFile.async("string");
  }
  return Promise.resolve(
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<Relationships xmlns="${RELS_NS}"></Relationships>`
  );
}

async function ensureHyperlinkRelationship(
  zip: JSZip,
  mailtoUrl: string
): Promise<{ relId: string; relsXml: string }> {
  const relEscaped = escapeXml(mailtoUrl);
  let relsXml = await getOrCreateRelsXml(zip);
  const relId = getNextRId(relsXml);
  const newRel = `<Relationship Id="${relId}" Type="${HYPERLINK_REL_TYPE}" Target="${relEscaped}" TargetMode="External"/>`;
  relsXml = relsXml.replace(
    "</Relationships>",
    `  ${newRel}\n</Relationships>`
  );
  return { relId, relsXml };
}

/**
 * Build OOXML for a single visible mailto hyperlink paragraph
 * with a simple label (e.g. "Report incident").
 */
function buildMailtoParagraphXml(relId: string, label: string): string {
  const escapedLabel = escapeXml(label);
  const relNs =
    "http://schemas.openxmlformats.org/officeDocument/2006/relationships";
  // 11pt-ish visible link (blue + underline).
  return `<w:p><w:hyperlink r:id="${escapeXml(
    relId
  )}" xmlns:r="${relNs}"><w:r><w:rPr><w:color w:val="0563C1"/><w:u w:val="single"/></w:rPr><w:t xml:space="preserve">${escapedLabel}</w:t></w:r></w:hyperlink></w:p>`;
}

/**
 * Apply a style-preserving mailto hyperlink by appending a small hyperlink
 * paragraph at the end of the document body. This leaves all existing
 * content and styling untouched.
 *
 * - Only operates on word/document.xml and word/_rels/document.xml.rels.
 * - Does not modify styles.xml, numbering.xml, or section/page definitions.
 */
export async function applyStylePreservingMailto(
  buffer: Buffer,
  mailtoUrl: string,
  label: string
): Promise<Buffer> {
  const zip = await JSZip.loadAsync(buffer);
  const docFile = zip.file(DOCUMENT_XML_PATH);
  if (!docFile) {
    throw new Error("Invalid DOCX: missing word/document.xml");
  }
  let docXml = await docFile.async("string");

  const { relId, relsXml } = await ensureHyperlinkRelationship(zip, mailtoUrl);
  zip.file(RELS_PATH, relsXml);

  const mailtoP = buildMailtoParagraphXml(relId, label);
  const bodyClose = "</w:body>";
  const closeIdx = docXml.indexOf(bodyClose);
  if (closeIdx === -1) {
    throw new Error("Invalid DOCX: word/document.xml has no closing w:body");
  }
  docXml = docXml.slice(0, closeIdx) + mailtoP + docXml.slice(closeIdx);
  zip.file(DOCUMENT_XML_PATH, docXml);

  const out = await zip.generateAsync({
    type: "nodebuffer",
    compression: "DEFLATE",
    compressionOptions: { level: 6 },
  });
  return Buffer.from(out);
}

