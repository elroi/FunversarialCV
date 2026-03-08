/**
 * DOCX canary injection: hyperlink, optional linked image, optional metadata.
 * Used only by CanaryWing when embedding options are beyond plain hidden text.
 */

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

/**
 * Build OOXML for a paragraph containing a hyperlink run (tiny white text).
 * Run text is either displayText or the URL.
 */
function buildHyperlinkParagraphXml(
  rId: string,
  url: string,
  displayText?: string
): string {
  const text = displayText != null && displayText.trim() !== "" ? displayText.trim() : url;
  const escaped = escapeXml(text);
  return `<w:p><w:hyperlink r:id="${escapeXml(rId)}" xmlns:r="${"http://schemas.openxmlformats.org/officeDocument/2006/relationships"}"><w:r><w:rPr><w:sz w:val="2"/><w:color w:val="FFFFFF"/></w:rPr><w:t xml:space="preserve">${escaped}</w:t></w:r></w:hyperlink></w:p>`;
}

function getOrCreateRelsXml(zip: JSZip): Promise<string> {
  const relsFile = zip.file(RELS_PATH);
  if (relsFile) {
    return relsFile.async("string");
  }
  return Promise.resolve(
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<Relationships xmlns="${RELS_NS}"></Relationships>`
  );
}

export interface InjectCanaryDocxOptions {
  linkStyle: "hidden" | "clickable" | "clickable-with-text";
  displayText?: string;
}

/**
 * Injects canary into DOCX: when linkStyle is clickable or clickable-with-text,
 * adds a hyperlink paragraph and the required relationship.
 * Caller should use injectHiddenParagraphIntoDocx for linkStyle "hidden".
 */
export async function injectCanaryIntoDocx(
  buffer: Buffer,
  canaryUrl: string,
  options: InjectCanaryDocxOptions
): Promise<Buffer> {
  const { linkStyle, displayText } = options;
  if (linkStyle === "hidden") {
    throw new Error("injectCanaryIntoDocx is for clickable link; use injectHiddenParagraphIntoDocx for hidden.");
  }

  const zip = await JSZip.loadAsync(buffer);
  const docFile = zip.file(DOCUMENT_XML_PATH);
  if (!docFile) {
    throw new Error("Invalid DOCX: missing word/document.xml");
  }
  let docXml = await docFile.async("string");

  let relsXml = await getOrCreateRelsXml(zip);
  const rId = getNextRId(relsXml);
  const relEscaped = escapeXml(canaryUrl);
  const newRel = `<Relationship Id="${rId}" Type="${HYPERLINK_REL_TYPE}" Target="${relEscaped}" TargetMode="External"/>`;
  relsXml = relsXml.replace("</Relationships>", `  ${newRel}\n</Relationships>`);
  zip.file(RELS_PATH, relsXml);

  const hyperlinkP = buildHyperlinkParagraphXml(rId, canaryUrl, displayText);
  const bodyClose = "</w:body>";
  const closeIdx = docXml.indexOf(bodyClose);
  if (closeIdx === -1) {
    throw new Error("Invalid DOCX: word/document.xml has no closing w:body");
  }
  docXml = docXml.slice(0, closeIdx) + hyperlinkP + docXml.slice(closeIdx);
  zip.file(DOCUMENT_XML_PATH, docXml);

  const out = await zip.generateAsync({
    type: "nodebuffer",
    compression: "DEFLATE",
    compressionOptions: { level: 6 },
  });
  return Buffer.from(out);
}
