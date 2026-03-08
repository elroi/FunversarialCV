/**
 * DOCX canary injection: hyperlink, optional linked image, optional metadata.
 * Used only by CanaryWing when embedding options are beyond plain hidden text.
 */

import JSZip from "jszip";

const DOCUMENT_XML_PATH = "word/document.xml";
const RELS_PATH = "word/_rels/document.xml.rels";
const CONTENT_TYPES_PATH = "[Content_Types].xml";
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
 * Build OOXML for a paragraph containing a hyperlink run.
 * When visible is true: normal size (9pt), blue link color, underline (social-engineering / "verify" link).
 * When visible is false: tiny white text (hidden).
 * Run text is either displayText or the URL.
 */
function buildHyperlinkParagraphXml(
  rId: string,
  url: string,
  displayText?: string,
  visible?: boolean
): string {
  const text = displayText != null && displayText.trim() !== "" ? displayText.trim() : url;
  const escaped = escapeXml(text);
  const relNs = "http://schemas.openxmlformats.org/officeDocument/2006/relationships";
  if (visible) {
    // Visible link: 9pt (w:sz 18), blue (0563C1), underline — for footer or end-of-body "verify" link
    return `<w:p><w:hyperlink r:id="${escapeXml(rId)}" xmlns:r="${relNs}"><w:r><w:rPr><w:sz w:val="18"/><w:color w:val="0563C1"/><w:u w:val="single"/></w:rPr><w:t xml:space="preserve">${escaped}</w:t></w:r></w:hyperlink></w:p>`;
  }
  return `<w:p><w:hyperlink r:id="${escapeXml(rId)}" xmlns:r="${relNs}"><w:r><w:rPr><w:sz w:val="2"/><w:color w:val="FFFFFF"/></w:rPr><w:t xml:space="preserve">${escaped}</w:t></w:r></w:hyperlink></w:p>`;
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

/** Register a part in [Content_Types].xml so Word can open the file. Required when adding footer (or other new parts). */
async function ensureContentType(
  zip: JSZip,
  partName: string,
  contentType: string
): Promise<void> {
  const contentTypesFile = zip.file(CONTENT_TYPES_PATH);
  if (!contentTypesFile) return;
  let xml = await contentTypesFile.async("string");
  if (xml.includes(partName)) return;
  const override = `<Override PartName="${partName}" ContentType="${contentType}"/>`;
  xml = xml.replace(/\s*<\/Types\s*>/i, `  ${override}\n</Types>`);
  zip.file(CONTENT_TYPES_PATH, xml);
}

export interface InjectCanaryDocxOptions {
  linkStyle: "hidden" | "clickable" | "clickable-with-text";
  displayText?: string;
  /** When true, link is visible (9pt, blue, underline) for social-engineering / footer. Default false = tiny white. */
  visible?: boolean;
  /** When "footer", place the link in document footer (OOXML footer part). Default "end" = end of body. */
  placement?: "end" | "footer";
}

/**
 * Injects canary into DOCX: when linkStyle is clickable or clickable-with-text,
 * adds a hyperlink paragraph (in body or in footer) and the required relationship(s).
 * Caller should use injectHiddenParagraphIntoDocx for linkStyle "hidden".
 */
export async function injectCanaryIntoDocx(
  buffer: Buffer,
  canaryUrl: string,
  options: InjectCanaryDocxOptions
): Promise<Buffer> {
  const { linkStyle, displayText, visible = false, placement = "end" } = options;
  if (linkStyle === "hidden") {
    throw new Error("injectCanaryIntoDocx is for clickable link; use injectHiddenParagraphIntoDocx for hidden.");
  }

  const zip = await JSZip.loadAsync(buffer);
  const docFile = zip.file(DOCUMENT_XML_PATH);
  if (!docFile) {
    throw new Error("Invalid DOCX: missing word/document.xml");
  }
  let docXml = await docFile.async("string");

  const relEscaped = escapeXml(canaryUrl);

  if (placement === "footer") {
    const sectPrMatch = docXml.match(/<w:sectPr[^>]*>[\s\S]*?<\/w:sectPr>/g);
    const lastSectPr = sectPrMatch ? sectPrMatch[sectPrMatch.length - 1] : null;
    const hasExistingFooter = lastSectPr != null && lastSectPr.includes("footerReference");

    // Always place link at end of body when "footer" is requested. Creating a real OOXML footer
    // (footer1.xml + footerReference) causes "Word experienced an error trying to open the file"
    // in many Word versions; end-of-body ensures the file opens and the canary link is still present.
    const useEndOfBody = true;

    if (useEndOfBody || hasExistingFooter) {
      // Place the link at end of body so Word can open the file.
      let relsXml = await getOrCreateRelsXml(zip);
      const rId = getNextRId(relsXml);
      const newRel = `<Relationship Id="${rId}" Type="${HYPERLINK_REL_TYPE}" Target="${relEscaped}" TargetMode="External"/>`;
      relsXml = relsXml.replace("</Relationships>", `  ${newRel}\n</Relationships>`);
      zip.file(RELS_PATH, relsXml);
      const hyperlinkP = buildHyperlinkParagraphXml(rId, canaryUrl, displayText, visible);
      const bodyClose = "</w:body>";
      const closeIdx = docXml.indexOf(bodyClose);
      if (closeIdx === -1) throw new Error("Invalid DOCX: word/document.xml has no closing w:body");
      docXml = docXml.slice(0, closeIdx) + hyperlinkP + docXml.slice(closeIdx);
      zip.file(DOCUMENT_XML_PATH, docXml);
    } else {
      // No existing footer: create footer1.xml and link it from sectPr.
      const FOOTER_REL_TYPE = "http://schemas.openxmlformats.org/officeDocument/2006/relationships/footer";
    let relsXml = await getOrCreateRelsXml(zip);
    const footerRId = getNextRId(relsXml);
    relsXml = relsXml.replace("</Relationships>", `  <Relationship Id="${footerRId}" Type="${FOOTER_REL_TYPE}" Target="footer1.xml"/>\n</Relationships>`);
    zip.file(RELS_PATH, relsXml);

    const hyperlinkRId = "rId1";
    const footerRelsPath = "word/_rels/footer1.xml.rels";
    const footerRelsXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<Relationships xmlns="${RELS_NS}">  <Relationship Id="${hyperlinkRId}" Type="${HYPERLINK_REL_TYPE}" Target="${relEscaped}" TargetMode="External"/>\n</Relationships>`;
    zip.file(footerRelsPath, footerRelsXml);

    const hyperlinkP = buildHyperlinkParagraphXml(hyperlinkRId, canaryUrl, displayText, visible);
    const wNs = "http://schemas.openxmlformats.org/wordprocessingml/2006/main";
    const footerXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<w:ftr xmlns:w="${wNs}">${hyperlinkP}</w:ftr>`;
    zip.file("word/footer1.xml", footerXml);

    await ensureContentType(
      zip,
      "/word/footer1.xml",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.footer+xml"
    );

    const footerRefXml = `<w:footerReference w:type="default" r:id="${footerRId}" xmlns:r="${RELS_NS}"/>`;
    if (lastSectPr) {
      const newSectPr = lastSectPr.replace("</w:sectPr>", `${footerRefXml}</w:sectPr>`);
      docXml = docXml.replace(lastSectPr, newSectPr);
    } else {
      const pgSz = "<w:pgSz w:w=\"12240\" w:h=\"15840\"/>";
      const pgMar = "<w:pgMar w:top=\"1440\" w:right=\"1440\" w:bottom=\"1440\" w:left=\"1440\" w:header=\"720\" w:footer=\"720\" w:gutter=\"0\"/>";
      const newSectPr = `<w:sectPr>${pgSz}${pgMar}${footerRefXml}</w:sectPr>`;
      const bodyClose = "</w:body>";
      const closeIdx = docXml.indexOf(bodyClose);
      if (closeIdx === -1) throw new Error("Invalid DOCX: word/document.xml has no closing w:body");
      docXml = docXml.slice(0, closeIdx) + newSectPr + docXml.slice(closeIdx);
    }
    zip.file(DOCUMENT_XML_PATH, docXml);
    }
  } else {
    let relsXml = await getOrCreateRelsXml(zip);
    const rId = getNextRId(relsXml);
    const newRel = `<Relationship Id="${rId}" Type="${HYPERLINK_REL_TYPE}" Target="${relEscaped}" TargetMode="External"/>`;
    relsXml = relsXml.replace("</Relationships>", `  ${newRel}\n</Relationships>`);
    zip.file(RELS_PATH, relsXml);

    const hyperlinkP = buildHyperlinkParagraphXml(rId, canaryUrl, displayText, visible);
    const bodyClose = "</w:body>";
    const closeIdx = docXml.indexOf(bodyClose);
    if (closeIdx === -1) {
      throw new Error("Invalid DOCX: word/document.xml has no closing w:body");
    }
    docXml = docXml.slice(0, closeIdx) + hyperlinkP + docXml.slice(closeIdx);
    zip.file(DOCUMENT_XML_PATH, docXml);
  }

  const out = await zip.generateAsync({
    type: "nodebuffer",
    compression: "DEFLATE",
    compressionOptions: { level: 6 },
  });
  return Buffer.from(out);
}
