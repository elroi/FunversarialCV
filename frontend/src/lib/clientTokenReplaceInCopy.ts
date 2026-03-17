/**
 * In-place PII → token replacement in a copy of the original file.
 * Preserves document layout (DOCX: word/document.xml; PDF: raw buffer when PII found).
 * Server receives the tokenized copy; rehydration happens on the client after response.
 */

import JSZip from "jszip";
import { MIME_DOCX, MIME_PDF } from "./clientDocumentExtract";
import type { PiiMap } from "./clientVaultTypes";

const DOCUMENT_XML_PATH = "word/document.xml";
const DOCUMENT_RELS_PATH = "word/_rels/document.xml.rels";

export type TokenizedCopyResult = { file: File; buffer: ArrayBuffer };

function findBytes(haystack: Uint8Array, needle: Uint8Array): number {
  if (needle.length === 0 || needle.length > haystack.length) return -1;
  for (let i = 0; i <= haystack.length - needle.length; i++) {
    let match = true;
    for (let j = 0; j < needle.length; j++) {
      if (haystack[i + j] !== needle[j]) {
        match = false;
        break;
      }
    }
    if (match) return i;
  }
  return -1;
}

/** Normalize PII string for byte search (PDF may use nbsp, en-dash, etc.). */
function normalizeForPdfSearch(value: string): string {
  return value
    .replace(/\u00A0/g, " ")
    .replace(/\u2013/g, "-")
    .replace(/\u2014/g, "-")
    .replace(/\u2009/g, " ");
}

/** Candidate search strings: exact, NFC, trimmed, normalized, trimmed+normalized. */
function searchCandidates(value: string): string[] {
  const candidates: string[] = [value];
  const nfc = value.normalize("NFC");
  if (nfc !== value) candidates.push(nfc);
  const trimmed = value.trim();
  if (trimmed !== value) candidates.push(trimmed);
  const normalized = normalizeForPdfSearch(value);
  if (normalized !== value) candidates.push(normalized);
  const trimmedNorm = normalizeForPdfSearch(trimmed);
  if (trimmedNorm !== value && !candidates.includes(trimmedNorm)) candidates.push(trimmedNorm);
  return candidates;
}

/**
 * In-place PII → token replacement in a PDF buffer. Preserves layout when PII
 * appears as literal bytes (e.g. uncompressed streams). If token is longer than
 * value we cannot replace without shifting bytes, so we return null and caller rebuilds.
 * Tries multiple search candidates (exact, NFC, trimmed, normalized) so extraction/PDF encoding mismatches still match.
 */
function replacePiiWithTokensInPdfBuffer(
  buffer: ArrayBuffer,
  piiMap: PiiMap
): ArrayBuffer | null {
  const encoder = new TextEncoder();
  const arr = new Uint8Array(buffer);
  const entries = Object.values(piiMap.byToken);
  if (entries.length === 0) return buffer;

  const byValueLength = [...entries].sort(
    (a, b) => encoder.encode(b.value).length - encoder.encode(a.value).length
  );

  for (let entryIndex = 0; entryIndex < byValueLength.length; entryIndex++) {
    const entry = byValueLength[entryIndex];
    const valueBytes = encoder.encode(entry.value);
    let tokenBytes = encoder.encode(entry.token);
    const tokenGtValue = tokenBytes.length > valueBytes.length;
    if (tokenGtValue) return null;

    const candidates = searchCandidates(entry.value);
    let searchBytes: Uint8Array | null = null;
    let pos = -1;
    let candidateIndex = -1;
    for (let ci = 0; ci < candidates.length; ci++) {
      const bytes = encoder.encode(candidates[ci]);
      if (bytes.length > arr.length) continue;
      pos = findBytes(arr, bytes);
      if (pos !== -1) {
        searchBytes = bytes;
        candidateIndex = ci;
        break;
      }
    }
    if (pos === -1 || searchBytes === null) return null;

    const replaceLen = searchBytes.length;
    if (tokenBytes.length < replaceLen) {
      const padded = new Uint8Array(replaceLen);
      padded.set(tokenBytes);
      padded.fill(0x20, tokenBytes.length);
      tokenBytes = padded;
    } else if (tokenBytes.length > replaceLen) return null;
    while (pos !== -1) {
      arr.set(tokenBytes, pos);
      pos = findBytes(arr, searchBytes);
    }
  }
  return arr.buffer;
}

/**
 * Replaces PII with tokens inside a copy of the file.
 *
 * DOCX: loads as ZIP, replaces in word/document.xml, returns tokenized File.
 * PDF: in-place replacement in raw buffer when PII appears as literal bytes (preserves
 * layout). If PDF has compressed streams, token longer than value, or PII not found,
 * returns null → caller uses createDocumentWithTextInBrowser (rebuild, no style preservation).
 *
 * @returns The tokenized result (file + buffer), or null if format not supported or in-place not possible (use rebuild).
 */
export async function replacePiiWithTokensInCopy(
  file: File,
  piiMap: PiiMap
): Promise<TokenizedCopyResult | null> {
  const mimeType = file.type;

  if (mimeType === MIME_PDF) {
    const buffer = await file.arrayBuffer();
    const out = replacePiiWithTokensInPdfBuffer(buffer, piiMap);
    if (out === null) return null;
    const tokenizedFile = new File([out], file.name, { type: file.type });
    return { file: tokenizedFile, buffer: out };
  }

  if (mimeType !== MIME_DOCX) {
    return null;
  }

  const buffer = await file.arrayBuffer();
  const zip = await JSZip.loadAsync(buffer);
  const docFile = zip.file(DOCUMENT_XML_PATH);
  if (!docFile) {
    throw new Error("Invalid DOCX: missing word/document.xml");
  }

  let xml = await docFile.async("string");

  // Replace each PII value with its token. Longer values first to avoid
  // partial replacements (e.g. "a@b.com" inside "x a@b.com y").
  const entries = Object.values(piiMap.byToken);
  const byValueLength = [...entries].sort(
    (a, b) => b.value.length - a.value.length
  );
  for (const entry of byValueLength) {
    xml = xml.split(entry.value).join(entry.token);
  }

  zip.file(DOCUMENT_XML_PATH, xml);

  const outBuffer = await zip.generateAsync({
    type: "arraybuffer",
    compression: "DEFLATE",
    compressionOptions: { level: 6 },
  });

  // Use a real File so FormData sends the correct filename (Blob would send "blob").
  const tokenizedFile = new File([outBuffer], file.name, {
    type: file.type,
  });
  return { file: tokenizedFile, buffer: outBuffer };
}

/**
 * Rehydrates a tokenized DOCX buffer in-place: replaces tokens with PII in
 * word/document.xml and word/_rels/document.xml.rels (e.g. mailto:{{PII_EMAIL_0}}).
 * Preserves all styles and layout (no rebuild from text).
 */
export async function rehydrateDocxBufferInPlace(
  tokenizedBuffer: ArrayBuffer,
  piiMap: PiiMap
): Promise<ArrayBuffer> {
  const zip = await JSZip.loadAsync(tokenizedBuffer);
  const docFile = zip.file(DOCUMENT_XML_PATH);
  if (!docFile) {
    throw new Error("Invalid DOCX: missing word/document.xml");
  }
  const replaceTokens = (str: string): string => {
    let out = str;
    for (const [token, entry] of Object.entries(piiMap.byToken)) {
      out = out.split(token).join(entry.value);
    }
    return out;
  };
  let xml = await docFile.async("string");
  zip.file(DOCUMENT_XML_PATH, replaceTokens(xml));

  const relsFile = zip.file(DOCUMENT_RELS_PATH);
  if (relsFile) {
    const relsXml = await relsFile.async("string");
    zip.file(DOCUMENT_RELS_PATH, replaceTokens(relsXml));
  }

  const outBuffer = await zip.generateAsync({
    type: "arraybuffer",
    compression: "DEFLATE",
    compressionOptions: { level: 6 },
  });
  return outBuffer;
}
