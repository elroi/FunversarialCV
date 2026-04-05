/**
 * Lists external hyperlink targets from DOCX (relationships + document hyperlinks).
 * Tied to LLM02/LLM10 pedagogy: mailto and https surfaces differ from plain body text.
 */
import JSZip from "jszip";
import { decodeXmlEntities } from "./xmlEntities";

export type HyperlinkScheme = "mailto" | "https" | "http" | "other";

export interface DocxHyperlinkRow {
  target: string;
  scheme: HyperlinkScheme;
}

function schemeOf(target: string): HyperlinkScheme {
  const t = target.trim().toLowerCase();
  if (t.startsWith("mailto:")) return "mailto";
  if (t.startsWith("https:")) return "https";
  if (t.startsWith("http:")) return "http";
  return "other";
}

/** Unescape OOXML target (often percent-encoded). */
function normalizeTarget(raw: string): string {
  try {
    return decodeXmlEntities(decodeURIComponent(raw.replace(/\+/g, "%20")));
  } catch {
    return decodeXmlEntities(raw);
  }
}

export async function extractHyperlinksFromDocx(buffer: Buffer): Promise<{
  links: DocxHyperlinkRow[];
  warnings: string[];
}> {
  const warnings: string[] = [];
  const idToTarget = new Map<string, string>();
  try {
    const zip = await JSZip.loadAsync(buffer);
    const relsFile = zip.file("word/_rels/document.xml.rels");
    if (!relsFile) {
      warnings.push("Missing word/_rels/document.xml.rels; no hyperlink map.");
      return { links: [], warnings };
    }
    const relsXml = await relsFile.async("string");
    const HYPERLINK_TYPE =
      "http://schemas.openxmlformats.org/officeDocument/2006/relationships/hyperlink";
    const relChunks = relsXml.split(/<Relationship\s+/gi).slice(1);
    for (const chunk of relChunks) {
      if (!chunk.includes(HYPERLINK_TYPE)) continue;
      const idM = /\bId="([^"]+)"/i.exec(chunk);
      const targetM = /\bTarget="([^"]+)"/i.exec(chunk);
      const id = idM?.[1];
      const target = targetM?.[1];
      if (id && target) idToTarget.set(id, normalizeTarget(target));
    }

    const docFile = zip.file("word/document.xml");
    if (!docFile) {
      warnings.push("Missing word/document.xml.");
      return { links: [], warnings };
    }
    const docXml = await docFile.async("string");
    const usedIds = new Set<string>();
    const idRefRe = /<w:hyperlink[^>]+r:id="([^"]+)"/g;
    let im: RegExpExecArray | null;
    while ((im = idRefRe.exec(docXml)) !== null) {
      const rid = im[1];
      if (rid) usedIds.add(rid);
    }

    const seen = new Set<string>();
    const links: DocxHyperlinkRow[] = [];
    for (const rid of usedIds) {
      const target = idToTarget.get(rid);
      if (!target || seen.has(target)) continue;
      seen.add(target);
      links.push({ target, scheme: schemeOf(target) });
    }
    links.sort((a, b) => a.target.localeCompare(b.target));
    return { links, warnings };
  } catch {
    warnings.push("Failed to parse DOCX hyperlinks.");
    return { links: [], warnings };
  }
}
