/**
 * MetadataShadow egg: OWASP LLM02-aligned custom document metadata.
 * Embeds key-value pairs in file properties (e.g. Ranking: Top_1%) to test
 * insecure output handling in downstream parsers.
 */

import { PDFDocument } from "pdf-lib";
import JSZip from "jszip";
import type { IEgg } from "../types/egg";
import { OwaspMapping } from "../types/egg";
import { MIME_PDF, MIME_DOCX } from "../engine/documentExtract";
import { containsPii } from "../lib/vault";

const KEY_PATTERN = /^[a-zA-Z0-9_]+$/;
const MAX_VALUE_LENGTH = 200;
const MAX_KEYS = 20;

function isPdfBuffer(buffer: Buffer): boolean {
  return (
    buffer.length >= 4 &&
    buffer[0] === 0x25 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x44 &&
    buffer[3] === 0x46
  );
}

function isDocxBuffer(buffer: Buffer): boolean {
  return buffer.length >= 2 && buffer[0] === 0x50 && buffer[1] === 0x4b;
}

function parsePayload(payload: string): Record<string, string> {
  const trimmed = payload.trim();
  if (!trimmed) return {};
  try {
    const parsed = JSON.parse(trimmed) as Record<string, unknown>;
    if (typeof parsed !== "object" || parsed === null) return {};
    const out: Record<string, string> = {};
    for (const [k, v] of Object.entries(parsed)) {
      if (typeof v === "string" && KEY_PATTERN.test(k)) out[k] = v;
    }
    return out;
  } catch {
    return {};
  }
}

export const metadataShadow: IEgg = {
  id: "metadata-shadow",
  name: "The Metadata Shadow",
  description:
    "OWASP LLM02: Embeds custom key-value pairs in file properties (e.g. Ranking: Top_1%) to test insecure output handling in downstream systems.",
  owaspMapping: OwaspMapping.LLM02_Insecure_Output,

  manualCheckAndValidation:
    "Quick check: Open File → Properties (PDF) or File → Info → Properties → Advanced Properties → Custom (Word) and look for your custom key (e.g. Ranking) and value. Manual check: In a PDF open File → Properties → Keywords (or your viewer's metadata panel). In Word open File → Info → Properties → Advanced Properties → Custom and check for your key-value. Validation: Run the transform with a known key-value payload, then read the document properties and assert the keys and values match.",

  validatePayload(payload: string): boolean {
    const trimmed = payload.trim();
    if (!trimmed) return true;
    try {
      const parsed = JSON.parse(trimmed) as Record<string, unknown>;
      if (typeof parsed !== "object" || parsed === null) return false;
      const entries = Object.entries(parsed);
      if (entries.length > MAX_KEYS) return false;
      for (const [k, v] of entries) {
        if (!KEY_PATTERN.test(k)) return false;
        if (typeof v !== "string") return false;
        if (v.length > MAX_VALUE_LENGTH) return false;
        if (containsPii(v)) return false;
      }
      return true;
    } catch {
      return false;
    }
  },

  async transform(buffer: Buffer, payload: string): Promise<Buffer> {
    const props = parsePayload(payload);
    if (Object.keys(props).length === 0) return buffer;

    if (isPdfBuffer(buffer)) {
      const doc = await PDFDocument.load(new Uint8Array(buffer), {
        ignoreEncryption: true,
      });
      const keywords = Object.entries(props).map(
        ([k, v]) => `${k}: ${v}`
      );
      doc.setKeywords(keywords);
      const bytes = await doc.save();
      return Buffer.from(bytes);
    }

    if (isDocxBuffer(buffer)) {
      const zip = await JSZip.loadAsync(buffer);
      let mergedProps: Record<string, string> = { ...props };
      const customFile = zip.file("docProps/custom.xml");
      if (customFile) {
        try {
          const existingXml = await customFile.async("string");
          const existing = parseCustomXml(existingXml);
          mergedProps = { ...existing, ...props };
        } catch {
          // Corrupt or unexpected custom.xml; use only new props.
        }
      }
      const customXml = buildCustomXml(mergedProps);
      zip.file("docProps/custom.xml", customXml);
      await ensureContentType(zip, "/docProps/custom.xml", "application/vnd.openxmlformats-officedocument.custom-properties+xml");
      const out = await zip.generateAsync({
        type: "nodebuffer",
        compression: "DEFLATE",
        compressionOptions: { level: 6 },
      });
      return Buffer.from(out);
    }

    return buffer;
  },
};

const CUSTOM_XML_NS =
  'http://schemas.openxmlformats.org/officeDocument/2006/custom-properties';
const VT_NS =
  'http://schemas.openxmlformats.org/officeDocument/2006/docPropsVTypes';

/**
 * Parses existing docProps/custom.xml and returns name -> value (unescaped).
 * Returns {} if missing or invalid so caller can merge with new props.
 */
function parseCustomXml(xml: string): Record<string, string> {
  const out: Record<string, string> = {};
  const propertyRegex = /<property\s[^>]*\bname\s*=\s*["']([^"']+)["'][^>]*>[\s\S]*?<vt:lpwstr>([\s\S]*?)<\/vt:lpwstr>/gi;
  let m: RegExpExecArray | null;
  while ((m = propertyRegex.exec(xml)) !== null) {
    const name = m[1];
    const raw = m[2];
    if (KEY_PATTERN.test(name)) {
      out[name] = unescapeXml(raw);
    }
  }
  return out;
}

function unescapeXml(s: string): string {
  return s
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'");
}

function buildCustomXml(props: Record<string, string>): string {
  const fmtid =
    "{D5CDD505-2E9C-101B-9397-08002B2CF9AE}";
  const entries = Object.entries(props);
  const propertyNodes = entries
    .map(([name, value], i) => {
      const pid = i + 2;
      const escaped = escapeXml(value);
      return `  <property fmtid="${fmtid}" pid="${pid}" name="${escapeXml(name)}"><vt:lpwstr>${escaped}</vt:lpwstr></property>`;
    })
    .join("\n");
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Properties xmlns="${CUSTOM_XML_NS}" xmlns:vt="${VT_NS}">
${propertyNodes}
</Properties>`;
}

function escapeXml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

const CONTENT_TYPES_PATH = "[Content_Types].xml";

async function ensureContentType(
  zip: JSZip,
  partName: string,
  contentType: string
): Promise<void> {
  const contentTypesFile = zip.file(CONTENT_TYPES_PATH);
  if (!contentTypesFile) return;
  let xml = await contentTypesFile.async("string");
  const override = `<Override PartName="${partName}" ContentType="${contentType}"/>`;
  if (xml.includes(partName)) return;
  xml = xml.replace(
    "</Types>",
    `  ${override}\n</Types>`
  );
  zip.file(CONTENT_TYPES_PATH, xml);
}
