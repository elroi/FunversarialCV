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
import { toWinAnsiSafe } from "../lib/pdfWinAnsi";
import {
  hasStandardFields,
  isExtendedShape,
  MAX_CUSTOM_KEYS,
  MAX_VALUE_LENGTH,
  parseMetadataShadowPayload,
  STANDARD_FIELD_KEYS,
  type MetadataStandardFields,
} from "./metadataShadowPayload";

export type { MetadataStandardFields, ParsedMetadataShadow } from "./metadataShadowPayload";
export { parseMetadataShadowPayload } from "./metadataShadowPayload";

const KEY_PATTERN = /^[a-zA-Z0-9_]+$/;

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

function validateCustomMap(obj: Record<string, unknown>): boolean {
  const entries = Object.entries(obj);
  if (entries.length > MAX_CUSTOM_KEYS) return false;
  for (const [k, v] of entries) {
    if (!KEY_PATTERN.test(k)) return false;
    if (typeof v !== "string") return false;
    if (v.length > MAX_VALUE_LENGTH) return false;
    if (containsPii(v)) return false;
  }
  return true;
}

function validateStandardObject(obj: Record<string, unknown>): boolean {
  for (const [k, v] of Object.entries(obj)) {
    if (!STANDARD_FIELD_KEYS.includes(k as (typeof STANDARD_FIELD_KEYS)[number])) {
      return false;
    }
    if (typeof v !== "string") return false;
    if (v.length > MAX_VALUE_LENGTH) return false;
    if (containsPii(v)) return false;
  }
  return true;
}

export const metadataShadow: IEgg = {
  id: "metadata-shadow",
  name: "The Metadata Shadow",
  description:
    "OWASP LLM02: Embeds custom key-value pairs in file properties (e.g. Ranking: Top_1%) to test insecure output handling in downstream systems.",
  owaspMapping: OwaspMapping.LLM02_Insecure_Output,

  manualCheckAndValidation:
    "Quick check (Word / DOCX): File → Info → Properties → Advanced Properties → Custom for your custom keys; same path → Summary for Title, Subject, Author, Tags (keywords) when you set standard fields. Quick check (PDF): File → Properties → Keywords for custom Key: Value tokens. Standard Title/Subject/Author/Keywords apply to DOCX only in this release; PDF uses custom properties as Keywords only. Validation: Run the transform with a known payload, then inspect document properties and assert values match.",

  validatePayload(payload: string): boolean {
    const trimmed = payload.trim();
    if (!trimmed) return true;
    try {
      const parsed = JSON.parse(trimmed) as Record<string, unknown>;
      if (typeof parsed !== "object" || parsed === null) return false;
      if (!isExtendedShape(parsed)) {
        return validateCustomMap(parsed as Record<string, unknown>);
      }
      for (const k of Object.keys(parsed)) {
        if (k !== "custom" && k !== "standard") return false;
      }
      const customRaw = parsed.custom;
      if (customRaw !== undefined) {
        if (
          customRaw === null ||
          typeof customRaw !== "object" ||
          Array.isArray(customRaw)
        ) {
          return false;
        }
        if (!validateCustomMap(customRaw as Record<string, unknown>)) {
          return false;
        }
      }
      const st = parsed.standard;
      if (st === undefined) return true;
      if (st === null || typeof st !== "object" || Array.isArray(st)) {
        return false;
      }
      return validateStandardObject(st as Record<string, unknown>);
    } catch {
      return false;
    }
  },

  async transform(buffer: Buffer, payload: string): Promise<Buffer> {
    const { custom, standard } = parseMetadataShadowPayload(payload);
    const customKeys = Object.keys(custom);
    const applyCore = hasStandardFields(standard);

    if (customKeys.length === 0 && !applyCore) return buffer;

    if (isPdfBuffer(buffer)) {
      // TECH DEBT: Also map `standard` (title, subject, author, keywords) via pdf-lib and merge
      // with custom-derived keywords; optionally preserve existing PDF keywords from getKeywords().
      if (customKeys.length === 0) return buffer;
      const doc = await PDFDocument.load(new Uint8Array(buffer), {
        ignoreEncryption: true,
      });
      const keywords = Object.entries(custom).map(([k, v]) =>
        `${toWinAnsiSafe(k)}: ${toWinAnsiSafe(v)}`
      );
      doc.setKeywords(keywords);
      const bytes = await doc.save();
      return Buffer.from(bytes);
    }

    if (isDocxBuffer(buffer)) {
      const zip = await JSZip.loadAsync(buffer);
      if (customKeys.length > 0) {
        let mergedProps: Record<string, string> = { ...custom };
        const customFile = zip.file("docProps/custom.xml");
        if (customFile) {
          try {
            const existingXml = await customFile.async("string");
            const existing = parseCustomXml(existingXml);
            mergedProps = { ...existing, ...custom };
          } catch {
            // Corrupt or unexpected custom.xml; use only new props.
          }
        }
        const customXml = buildCustomXml(mergedProps);
        zip.file("docProps/custom.xml", customXml);
        await ensureContentType(
          zip,
          "/docProps/custom.xml",
          "application/vnd.openxmlformats-officedocument.custom-properties+xml"
        );
        await ensureCustomPropertiesRelationship(zip);
      }
      if (applyCore) {
        const coreFile = zip.file("docProps/core.xml");
        const existingCore = coreFile
          ? await coreFile.async("string")
          : undefined;
        const coreXml = mergeCorePropertiesXml(existingCore, standard);
        zip.file("docProps/core.xml", coreXml);
        await ensureContentType(
          zip,
          "/docProps/core.xml",
          "application/vnd.openxmlformats-package.core-properties+xml"
        );
        await ensureCoreMetadataRelationship(zip);
      }
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

const DEFAULT_CORE_PROPERTIES_XML = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:dcterms="http://purl.org/dc/terms/" xmlns:dcmitype="http://purl.org/dc/dcmitype/" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">
</cp:coreProperties>`;

/** Insert or replace a single element inside cp:coreProperties (dc:* / cp:*). */
function setOrReplaceCoreXmlElement(
  xml: string,
  fullTag: string,
  innerText: string
): string {
  const escapedInner = escapeXml(innerText);
  const tagEsc = fullTag.replace(/:/g, "\\:");
  const re = new RegExp(
    `<${tagEsc}(?:\\s[^>]*)?>[\\s\\S]*?<\\/${tagEsc}>`,
    "i"
  );
  const fresh = `<${fullTag}>${escapedInner}</${fullTag}>`;
  if (re.test(xml)) {
    return xml.replace(re, fresh);
  }
  return xml.replace(/<\/cp:coreProperties>/i, `  ${fresh}</cp:coreProperties>`);
}

/**
 * Merges standard metadata into docProps/core.xml. Maps author → dc:creator per OOXML.
 */
function mergeCorePropertiesXml(
  existingXml: string | undefined,
  standard: MetadataStandardFields
): string {
  let xml =
    existingXml && existingXml.trim().length > 0
      ? existingXml
      : DEFAULT_CORE_PROPERTIES_XML;

  if (!xml.includes("xmlns:dc=")) {
    xml = xml.replace(
      /<cp:coreProperties([^>]*)>/i,
      `<cp:coreProperties$1 xmlns:dc="http://purl.org/dc/elements/1.1/">`
    );
  }

  const fields: { field: keyof MetadataStandardFields; tag: string }[] = [
    { field: "title", tag: "dc:title" },
    { field: "subject", tag: "dc:subject" },
    { field: "author", tag: "dc:creator" },
    { field: "keywords", tag: "cp:keywords" },
  ];
  for (const { field, tag } of fields) {
    const val = standard[field];
    if (val === undefined || val === "") continue;
    xml = setOrReplaceCoreXmlElement(xml, tag, val);
  }
  return xml;
}

const CONTENT_TYPES_PATH = "[Content_Types].xml";

/** OOXML package relationship so hosts load docProps/custom.xml (Custom tab in Word). */
const CUSTOM_PROPERTIES_REL_TYPE =
  "http://schemas.openxmlformats.org/officeDocument/2006/relationships/custom-properties";

/** Package relationship for docProps/core.xml (Title, Subject, Author, Tags). */
const CORE_METADATA_REL_TYPE =
  "http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties";

async function ensureCustomPropertiesRelationship(zip: JSZip): Promise<void> {
  const relsPath = "_rels/.rels";
  const relsFile = zip.file(relsPath);
  if (!relsFile) return;
  let xml = await relsFile.async("string");
  if (xml.includes(CUSTOM_PROPERTIES_REL_TYPE)) return;
  const nextId = nextPackageRelationshipId(xml);
  const rel = `<Relationship Id="${nextId}" Type="${CUSTOM_PROPERTIES_REL_TYPE}" Target="docProps/custom.xml"/>`;
  xml = xml.replace("</Relationships>", `  ${rel}\n</Relationships>`);
  zip.file(relsPath, xml);
}

async function ensureCoreMetadataRelationship(zip: JSZip): Promise<void> {
  const relsPath = "_rels/.rels";
  const relsFile = zip.file(relsPath);
  if (!relsFile) return;
  let xml = await relsFile.async("string");
  if (xml.includes(CORE_METADATA_REL_TYPE)) return;
  const nextId = nextPackageRelationshipId(xml);
  const rel = `<Relationship Id="${nextId}" Type="${CORE_METADATA_REL_TYPE}" Target="docProps/core.xml"/>`;
  xml = xml.replace("</Relationships>", `  ${rel}\n</Relationships>`);
  zip.file(relsPath, xml);
}

function nextPackageRelationshipId(relsXml: string): string {
  const matches = relsXml.matchAll(/\bId="(rId\d+)"/gi);
  let max = 0;
  for (const m of matches) {
    const n = parseInt(m[1].replace(/^rId/i, ""), 10);
    if (!Number.isNaN(n) && n > max) max = n;
  }
  return `rId${max + 1}`;
}

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
