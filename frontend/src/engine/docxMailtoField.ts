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

function updateExistingMailtoRelationship(
  relsXml: string,
  mailtoUrl: string
): { relsXml: string; updated: boolean } {
  const MAILTO_REL_RE = new RegExp(
    `(<Relationship[^>]+Type=["']${escapeXml(
      HYPERLINK_REL_TYPE
    )}["'][^>]+Target=["'])mailto:[^"']*(["'][^>]*>)`
  );
  if (!MAILTO_REL_RE.test(relsXml)) {
    return { relsXml, updated: false };
  }
  const relEscaped = escapeXml(mailtoUrl);
  const next = relsXml.replace(
    MAILTO_REL_RE,
    `$1${relEscaped}$2`
  );
  return { relsXml: next, updated: true };
}

function wrapVisibleEmailWithHyperlink(
  docXml: string,
  relId: string,
  visibleEmail: string
): { docXml: string; wrapped: boolean } {
  // Find an occurrence of the email that is inside <w:t> (visible text), not inside
  // <w:instrText> (e.g. HYPERLINK "mailto:..." field instruction), which would break fields.
  const textIdx = findEmailInVisibleRun(docXml, visibleEmail);
  if (textIdx === -1) return { docXml, wrapped: false };

  const tOpenIdx = docXml.lastIndexOf("<w:t", textIdx);
  if (tOpenIdx === -1) return { docXml, wrapped: false };
  const tCloseIdx = docXml.indexOf("</w:t>", textIdx);
  if (tCloseIdx === -1) return { docXml, wrapped: false };

  const rOpenIdx = findRunStartBefore(docXml, tOpenIdx);
  if (rOpenIdx === -1) return { docXml, wrapped: false };
  const rCloseIdx = docXml.indexOf("</w:r>", tCloseIdx);
  if (rCloseIdx === -1) return { docXml, wrapped: false };

  // Do not wrap runs that are inside a field (between fldChar begin and end); Word would break.
  const paraStart = docXml.lastIndexOf("</w:p>", rOpenIdx) + 1;
  const beforeRun = docXml.slice(paraStart, rOpenIdx);
  const hasFieldBegin = /fldCharType\s*=\s*["']begin["']/.test(beforeRun);
  const hasFieldEnd = /fldCharType\s*=\s*["']end["']/.test(beforeRun);
  if (hasFieldBegin && !hasFieldEnd) return { docXml, wrapped: false };

  const runEnd = rCloseIdx + "</w:r>".length;
  const runXml = docXml.slice(rOpenIdx, runEnd);

  const relNs =
    "http://schemas.openxmlformats.org/officeDocument/2006/relationships";
  const hyperlinkXml = `<w:hyperlink r:id="${escapeXml(
    relId
  )}" xmlns:r="${relNs}">${runXml}</w:hyperlink>`;

  const next =
    docXml.slice(0, rOpenIdx) + hyperlinkXml + docXml.slice(runEnd);
  return { docXml: next, wrapped: true };
}

/** Return start index of the <w:r> or <w:r ...> opening tag that contains the given position (not "<w:rP" etc.). */
function findRunStartBefore(docXml: string, pos: number): number {
  let idx = docXml.lastIndexOf("<w:r", pos);
  while (idx !== -1) {
    const after = docXml[idx + 4];
    if (after === ">" || after === " " || after === "\t" || after === "\n") return idx;
    idx = docXml.lastIndexOf("<w:r", idx - 1);
  }
  return -1;
}

/** Return start index of visibleEmail when it appears inside <w:t>, or -1. Skips instrText. */
function findEmailInVisibleRun(docXml: string, visibleEmail: string): number {
  let pos = 0;
  while (pos < docXml.length) {
    const idx = docXml.indexOf(visibleEmail, pos);
    if (idx === -1) return -1;
    const lastT = docXml.lastIndexOf("<w:t", idx);
    const lastInstr = docXml.lastIndexOf("<w:instrText", idx);
    if (lastT !== -1 && (lastInstr === -1 || lastT > lastInstr)) return idx;
    pos = idx + 1;
  }
  return -1;
}

function getRunBefore(docXml: string, beforePos: number): { start: number; end: number } | null {
  const endTag = docXml.lastIndexOf("</w:r>", beforePos - 1);
  if (endTag === -1) return null;
  const end = endTag + "</w:r>".length;
  const start = findRunStartBefore(docXml, endTag);
  if (start === -1 || start >= beforePos) return null;
  return { start, end };
}

/** Run boundaries after afterPos. Skips single-element tags like bookmarkEnd. */
function getRunAfter(docXml: string, afterPos: number): { start: number; end: number } | null {
  let pos = afterPos;
  while (pos < docXml.length) {
    const open = docXml.indexOf("<w:r", pos);
    if (open === -1) return null;
    const after = docXml[open + 4];
    if (after === ">" || after === " " || after === "\t" || after === "\n") {
      const close = docXml.indexOf("</w:r>", open);
      if (close === -1) return null;
      return { start: open, end: close + "</w:r>".length };
    }
    pos = open + 1;
  }
  return null;
}

/**
 * Find a HYPERLINK "mailto:..." field whose display text equals visibleEmail, remove the
 * entire field (and optional bookmark), and replace it with a single w:hyperlink run
 * preserving the display text and run properties. Returns replaced: true only when the
 * exact field structure is found and replaced.
 */
function replaceMailtoFieldWithHyperlink(
  docXml: string,
  relId: string,
  visibleEmail: string
): { docXml: string; replaced: boolean } {
  const textIdx = findEmailInVisibleRun(docXml, visibleEmail);
  if (textIdx === -1) return { docXml, replaced: false };

  const tOpenIdx = docXml.lastIndexOf("<w:t", textIdx);
  const tCloseIdx = docXml.indexOf("</w:t>", textIdx);
  const rOpenIdx = findRunStartBefore(docXml, tOpenIdx);
  const rCloseIdx = docXml.indexOf("</w:r>", tCloseIdx);
  if (tOpenIdx === -1 || tCloseIdx === -1 || rOpenIdx === -1 || rCloseIdx === -1) {
    return { docXml, replaced: false };
  }
  const displayRunEnd = rCloseIdx + "</w:r>".length;

  // Run immediately before the display run must be fldChar separate.
  const sepRun = getRunBefore(docXml, rOpenIdx);
  if (!sepRun) return { docXml, replaced: false };
  if (!/fldCharType\s*=\s*["']separate["']/.test(docXml.slice(sepRun.start, sepRun.end))) {
    return { docXml, replaced: false };
  }

  // Run before that must be instrText HYPERLINK "mailto:...
  const instrRun = getRunBefore(docXml, sepRun.start);
  if (!instrRun) return { docXml, replaced: false };
  if (!/<w:instrText[^>]*>[\s\S]*?HYPERLINK\s+"mailto:/.test(docXml.slice(instrRun.start, instrRun.end))) {
    return { docXml, replaced: false };
  }

  // Run before that must be fldChar begin.
  const beginRun = getRunBefore(docXml, instrRun.start);
  if (!beginRun) return { docXml, replaced: false };
  if (!/fldCharType\s*=\s*["']begin["']/.test(docXml.slice(beginRun.start, beginRun.end))) {
    return { docXml, replaced: false };
  }

  // Optional bookmarkStart immediately before begin run.
  let blockStart = beginRun.start;
  const beforeBegin = docXml.slice(0, beginRun.start);
  const lastClose = beforeBegin.lastIndexOf(">");
  const lastTagStart = beforeBegin.lastIndexOf("<w:", lastClose);
  if (lastTagStart !== -1) {
    const tag = docXml.slice(lastTagStart, lastClose + 1);
    if (/<w:bookmarkStart\s/.test(tag)) blockStart = lastTagStart;
  }

  // Run after display run: optional bookmarkEnd, then fldChar end.
  let pos = displayRunEnd;
  while (pos < docXml.length) {
    const next = docXml.indexOf("<w:", pos);
    if (next === -1) break;
    const tagEnd = docXml.indexOf(">", next) + 1;
    const tag = docXml.slice(next, tagEnd);
    if (/<w:bookmarkEnd\s/.test(tag)) {
      pos = tagEnd;
      continue;
    }
    if (/<w:r\s/.test(tag) || tag === "<w:r>") {
      const runEnd = docXml.indexOf("</w:r>", tagEnd);
      if (runEnd === -1) break;
      const runEndPos = runEnd + "</w:r>".length;
      if (!/fldCharType\s*=\s*["']end["']/.test(docXml.slice(next, runEndPos))) break;
      const blockEnd = runEndPos;

      // Inner content of display run: from after the opening <w:r...> to before </w:r>.
      // Find the ">" that closes the opening <w:r> tag (skip ">" inside attribute values).
      let runContentStart = -1;
      let inQuote: string | null = null;
      for (let i = rOpenIdx; i < docXml.length; i++) {
        const c = docXml[i];
        if (inQuote !== null) {
          if (c === inQuote) inQuote = null;
          continue;
        }
        if (c === '"' || c === "'") inQuote = c;
        else if (c === ">") {
          runContentStart = i + 1;
          break;
        }
      }
      if (runContentStart === -1) break;
      const innerContent = docXml.slice(runContentStart, rCloseIdx);

      const relNs =
        "http://schemas.openxmlformats.org/officeDocument/2006/relationships";
      const hyperlinkXml = `<w:hyperlink r:id="${escapeXml(
        relId
      )}" xmlns:r="${relNs}"><w:r>${innerContent}</w:r></w:hyperlink>`;

      const nextXml =
        docXml.slice(0, blockStart) + hyperlinkXml + docXml.slice(blockEnd);
      return { docXml: nextXml, replaced: true };
    }
    break;
  }
  return { docXml, replaced: false };
}

export interface ApplyDocxIncidentMailtoAstOptions {
  mailtoUrl: string;
  label?: string;
  visibleEmail?: string;
}

export async function applyDocxIncidentMailtoAst(
  buffer: Buffer,
  options: ApplyDocxIncidentMailtoAstOptions
): Promise<{ buffer: Buffer; applied: boolean }> {
  const { mailtoUrl, visibleEmail } = options;
  const zip = await JSZip.loadAsync(buffer);

  const docFile = zip.file(DOCUMENT_XML_PATH);
  if (!docFile) {
    return { buffer, applied: false };
  }
  let docXml = await docFile.async("string");

  let relsXml = await getOrCreateRelsXml(zip);

  // First, try to update an existing mailto hyperlink relationship.
  const updated = updateExistingMailtoRelationship(relsXml, mailtoUrl);
  if (updated.updated) {
    zip.file(RELS_PATH, updated.relsXml);
    const out = await zip.generateAsync({
      type: "nodebuffer",
      compression: "DEFLATE",
      compressionOptions: { level: 6 },
    });
    return { buffer: Buffer.from(out), applied: true };
  }

  // Otherwise, if we have a visible email candidate, try (1) replace mailto field with
  // a single hyperlink, or (2) wrap a plain run in a new hyperlink.
  if (visibleEmail) {
    const relResult = await ensureHyperlinkRelationship(zip, mailtoUrl);
    relsXml = relResult.relsXml;

    const replaced = replaceMailtoFieldWithHyperlink(
      docXml,
      relResult.relId,
      visibleEmail
    );
    if (replaced.replaced) {
      docXml = replaced.docXml;
      zip.file(RELS_PATH, relsXml);
      zip.file(DOCUMENT_XML_PATH, docXml);
      const out = await zip.generateAsync({
        type: "nodebuffer",
        compression: "DEFLATE",
        compressionOptions: { level: 6 },
      });
      return { buffer: Buffer.from(out), applied: true };
    }

    const wrapped = wrapVisibleEmailWithHyperlink(
      docXml,
      relResult.relId,
      visibleEmail
    );
    if (wrapped.wrapped) {
      docXml = wrapped.docXml;
      zip.file(RELS_PATH, relsXml);
      zip.file(DOCUMENT_XML_PATH, docXml);
      const out = await zip.generateAsync({
        type: "nodebuffer",
        compression: "DEFLATE",
        compressionOptions: { level: 6 },
      });
      return { buffer: Buffer.from(out), applied: true };
    }
  }

  return { buffer, applied: false };
}

