/**
 * In-place PII → token replacement in a copy of the original file.
 * Preserves document layout (DOCX: word/document.xml only; PDF deferred).
 * Server receives the tokenized copy; rehydration happens on the client after response.
 */

import JSZip from "jszip";
import { MIME_DOCX } from "./clientDocumentExtract";
import type { PiiMap } from "./clientVaultTypes";

const DOCUMENT_XML_PATH = "word/document.xml";
const DOCUMENT_RELS_PATH = "word/_rels/document.xml.rels";

export type TokenizedCopyResult = { file: File; buffer: ArrayBuffer };

/**
 * Replaces PII with tokens inside a copy of the file. Only DOCX is supported;
 * for PDF/text the caller should use createDocumentWithTextInBrowser (rebuild path).
 *
 * DOCX: loads the file as ZIP, replaces each PII value with its token in
 * word/document.xml, saves the ZIP and returns the tokenized File and its buffer.
 *
 * @returns The tokenized result (file + buffer), or null if format not supported (use rebuild).
 */
export async function replacePiiWithTokensInCopy(
  file: File,
  piiMap: PiiMap
): Promise<TokenizedCopyResult | null> {
  const mimeType = file.type;
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
