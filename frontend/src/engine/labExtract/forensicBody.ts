/**
 * Forensic-style DOCX body: concatenate w:t text from word/document.xml only.
 * Pedagogical “what XML parsers see” — not a full Word layout model.
 */
import JSZip from "jszip";
import { decodeXmlEntities } from "./xmlEntities";

export async function extractForensicWtConcatFromDocx(buffer: Buffer): Promise<{
  text: string;
  warnings: string[];
}> {
  const warnings: string[] = [];
  try {
    const zip = await JSZip.loadAsync(buffer);
    const file = zip.file("word/document.xml");
    if (!file) {
      warnings.push("Missing word/document.xml in package.");
      return { text: "", warnings };
    }
    const docXml = await file.async("string");
    const texts: string[] = [];
    const re = /<w:t(?:\s[^>]*)?>([^<]*)<\/w:t>/g;
    let m: RegExpExecArray | null;
    while ((m = re.exec(docXml)) !== null) {
      texts.push(decodeXmlEntities(m[1] ?? ""));
    }
    return { text: texts.join(""), warnings };
  } catch {
    warnings.push("Failed to read DOCX package as ZIP.");
    return { text: "", warnings };
  }
}
