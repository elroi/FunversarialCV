/**
 * Read OOXML package metadata (core + optional custom properties).
 * Low-level string parsing only — no macro execution.
 */
import JSZip from "jszip";
import { decodeXmlEntities } from "./xmlEntities";

export interface MetadataEntry {
  namespace: "core" | "custom" | "app";
  key: string;
  value: string;
}

function pushMatch(
  xml: string,
  re: RegExp,
  ns: MetadataEntry["namespace"],
  key: string,
  out: MetadataEntry[]
): void {
  re.lastIndex = 0;
  const m = re.exec(xml);
  if (m?.[1] !== undefined && m[1].trim() !== "") {
    out.push({ namespace: ns, key, value: decodeXmlEntities(m[1].trim()) });
  }
}

export async function extractPackageMetadataFromDocx(buffer: Buffer): Promise<{
  entries: MetadataEntry[];
  warnings: string[];
}> {
  const warnings: string[] = [];
  const entries: MetadataEntry[] = [];
  try {
    const zip = await JSZip.loadAsync(buffer);
    const coreFile = zip.file("docProps/core.xml");
    if (coreFile) {
      const coreXml = await coreFile.async("string");
      pushMatch(coreXml, /<dc:title[^>]*>([^<]*)<\/dc:title>/i, "core", "title", entries);
      pushMatch(coreXml, /<dc:subject[^>]*>([^<]*)<\/dc:subject>/i, "core", "subject", entries);
      pushMatch(coreXml, /<dc:creator[^>]*>([^<]*)<\/dc:creator>/i, "core", "creator", entries);
      pushMatch(coreXml, /<cp:keywords[^>]*>([^<]*)<\/cp:keywords>/i, "core", "keywords", entries);
    } else {
      warnings.push("No docProps/core.xml (metadata may be empty).");
    }

    const customFile = zip.file("docProps/custom.xml");
    if (customFile) {
      const customXml = await customFile.async("string");
      const propRe =
        /<property[^>]+name="([^"]+)"[^>]*>(?:\s|\S)*?<vt:lpwstr>([^<]*)<\/vt:lpwstr>/gi;
      let pm: RegExpExecArray | null;
      while ((pm = propRe.exec(customXml)) !== null) {
        const name = pm[1]?.trim();
        const val = pm[2]?.trim() ?? "";
        if (name) {
          entries.push({
            namespace: "custom",
            key: name,
            value: decodeXmlEntities(val),
          });
        }
      }
    }

    const appFile = zip.file("docProps/app.xml");
    if (appFile) {
      const appXml = await appFile.async("string");
      pushMatch(
        appXml,
        /<Application[^>]*>([^<]*)<\/Application>/i,
        "app",
        "Application",
        entries
      );
    }
  } catch {
    warnings.push("Failed to read DOCX metadata from package.");
  }
  return { entries, warnings };
}
