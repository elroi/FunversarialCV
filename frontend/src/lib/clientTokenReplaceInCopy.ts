/**
 * In-place PII → token replacement in a copy of the original file.
 * Preserves document layout (DOCX: word/document.xml; PDF: raw buffer when PII found).
 * Server receives the tokenized copy; rehydration happens on the client after response.
 */

import JSZip from "jszip";
import { MIME_DOCX, MIME_PDF } from "./clientDocumentExtract";
import type { PiiMap } from "./clientVaultTypes";

const DOCUMENT_XML_PATH = "word/document.xml";

export type TokenizedCopyResult = { file: File; buffer: ArrayBuffer };

type ValueTokenPair = { value: string; token: string };

/** All word OOXML parts that may contain literal PII (body, rels, headers, etc.). */
function listWordXmlAndRelsPaths(zip: JSZip): string[] {
  return Object.keys(zip.files).filter(
    (n) =>
      !zip.files[n].dir &&
      n.startsWith("word/") &&
      (n.endsWith(".xml") || n.endsWith(".rels"))
  );
}

/**
 * Value→token pairs for XML replacement, longest values first.
 * Includes URL-encoded email (mailto targets often use %40) and compact phone (tel: / no spaces).
 */
function collectXmlValueTokenPairs(piiMap: PiiMap): ValueTokenPair[] {
  const pairs: ValueTokenPair[] = [];
  const add = (value: string, token: string) => {
    if (!value) return;
    if (!pairs.some((p) => p.value === value && p.token === token)) {
      pairs.push({ value, token });
    }
  };

  for (const e of Object.values(piiMap.byToken)) {
    add(e.value, e.token);

    if (e.type === "EMAIL" && e.value.includes("@")) {
      const atPct = e.value.replace(/@/g, "%40");
      if (atPct !== e.value) add(atPct, e.token);
      try {
        const enc = encodeURIComponent(e.value);
        if (enc !== e.value && enc !== atPct) add(enc, e.token);
      } catch {
        /* ignore */
      }
    }

    if (e.type === "PHONE") {
      const noSpaces = e.value.replace(/\s/g, "");
      if (noSpaces !== e.value) add(noSpaces, e.token);
    }
  }

  return pairs.sort((a, b) => b.value.length - a.value.length);
}

function replaceValuesWithTokens(xml: string, pairs: ValueTokenPair[]): string {
  let out = xml;
  for (const { value, token } of pairs) {
    out = out.split(value).join(token);
  }
  return out;
}

/**
 * Tokenize PII everywhere it may appear under word/ (document, rels, headers, footers, etc.).
 * Hyperlink targets (e.g. mailto:, often %40-encoded) must match rehydration coverage.
 */
async function tokenizeDocxPackageXmlParts(
  zip: JSZip,
  piiMap: PiiMap
): Promise<void> {
  const pairs = collectXmlValueTokenPairs(piiMap);
  if (pairs.length === 0) return;

  for (const p of listWordXmlAndRelsPaths(zip)) {
    const f = zip.file(p);
    if (!f) continue;
    const xml = await f.async("string");
    zip.file(p, replaceValuesWithTokens(xml, pairs));
  }
}

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

  await tokenizeDocxPackageXmlParts(zip, piiMap);

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
 * Rehydrates a tokenized DOCX buffer in-place: replaces tokens with PII in every
 * word XML and word rels part (same paths as client tokenization).
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

  for (const p of listWordXmlAndRelsPaths(zip)) {
    const f = zip.file(p);
    if (!f) continue;
    const xml = await f.async("string");
    zip.file(p, replaceTokens(xml));
  }

  const outBuffer = await zip.generateAsync({
    type: "arraybuffer",
    compression: "DEFLATE",
    compressionOptions: { level: 6 },
  });
  return outBuffer;
}
