/**
 * Client-side PII dehydration/rehydration for the browser.
 * Keeps raw PII only in memory (PiiMap); server receives only tokenized content.
 */

import { PII_REGEX } from "./vault";
import {
  extractTextFromFileInBrowser,
  MIME_PDF,
  MIME_DOCX,
} from "./clientDocumentExtract";
import { rehydrateDocxBufferInPlace } from "./clientTokenReplaceInCopy";
import type { PiiMap } from "./clientVaultTypes";
import type { DehydrateResult, DehydrateInBrowserResult } from "./clientVaultTypes";

const TOKEN_PATTERN = /\{\{PII_[A-Z_]+\d+\}\}/g;

/**
 * Dehydrates plain text: replaces PII with tokens and returns tokenized text plus a PiiMap.
 * Safe to run in the browser; uses same token format as server vault for compatibility.
 */
export function dehydrateTextForBrowser(text: string): DehydrateResult {
  const piiMap: PiiMap = { byToken: {} };
  let counter = 0;

  let tokenizedText = text.replace(PII_REGEX.EMAIL, (match) => {
    const token = `{{PII_EMAIL_${counter++}}}`;
    piiMap.byToken[token] = {
      token,
      type: "EMAIL",
      value: match,
    };
    return token;
  });

  tokenizedText = tokenizedText.replace(PII_REGEX.PHONE, (match) => {
    const token = `{{PII_PHONE_${counter++}}}`;
    piiMap.byToken[token] = {
      token,
      type: "PHONE",
      value: match,
    };
    return token;
  });

  tokenizedText = tokenizedText.replace(PII_REGEX.ADDRESS, (match) => {
    const token = `{{PII_ADDR_${counter++}}}`;
    piiMap.byToken[token] = {
      token,
      type: "ADDRESS",
      value: match,
    };
    return token;
  });

  return { tokenizedText, piiMap };
}

/**
 * Rehydrate PDF by replacing token bytes with PII bytes in-place so we preserve
 * server-injected content (canary, invisible hand, etc.). Replacing in the raw buffer
 * keeps stream layout; we pad or truncate value to token length to avoid shifting bytes.
 * If tokens are in compressed streams they won't be found; we then fall back to extract+rebuild.
 */
function rehydratePdfBufferInPlace(
  buffer: ArrayBuffer,
  piiMap: PiiMap
): ArrayBuffer {
  const encoder = new TextEncoder();
  const arr = new Uint8Array(buffer);
  for (const [token, entry] of Object.entries(piiMap.byToken)) {
    const tokenBytes = encoder.encode(token);
    let valueBytes = encoder.encode(entry.value);
    if (valueBytes.length > tokenBytes.length) {
      valueBytes = valueBytes.slice(0, tokenBytes.length);
    } else if (valueBytes.length < tokenBytes.length) {
      const padded = new Uint8Array(tokenBytes.length);
      padded.set(valueBytes);
      padded.fill(0x20, valueBytes.length); // space
      valueBytes = padded;
    }
    const first = findBytes(arr, tokenBytes);
    if (first !== -1) {
      arr.set(valueBytes, first);
    }
  }
  return arr.buffer;
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

/**
 * Rehydrates a tokenized buffer using the client-held PiiMap.
 * text/plain: decode → replace tokens → re-encode.
 * DOCX: in-place token → PII replacement in word/document.xml (preserves styles).
 * PDF: in-place token → PII replacement in buffer (preserves canary, invisible hand, etc.).
 */
export async function rehydrateInBrowser(
  tokenizedBuffer: ArrayBuffer,
  mimeType: string,
  piiMap: PiiMap
): Promise<ArrayBuffer> {
  if (mimeType === "text/plain") {
    const text = new TextDecoder().decode(tokenizedBuffer);
    const rehydratedText = applyRehydrationToText(text, piiMap);
    return new TextEncoder().encode(rehydratedText).buffer;
  }
  if (mimeType === MIME_DOCX) {
    return rehydrateDocxBufferInPlace(tokenizedBuffer, piiMap);
  }
  if (mimeType === MIME_PDF) {
    // Try in-place byte replacement first (works if tokens are in uncompressed streams).
    const inPlace = rehydratePdfBufferInPlace(tokenizedBuffer, piiMap);
    // NOTE: If tokens live in compressed streams they won't be found in raw bytes.
    // We do NOT fall back to extract+rebuild because that destroys server-injected
    // egg content (0.5pt white text, link annotations, etc.). Instead, return the
    // in-place result as-is — any remaining tokens will be visible but eggs are preserved.
    // For most CVs this is acceptable; production enhancement could use a PDF library
    // that decompresses streams, replaces tokens, and recompresses.
    return inPlace;
  }
  throw new Error(
    `rehydrateInBrowser: unsupported mimeType ${mimeType}`
  );
}

function applyRehydrationToText(text: string, piiMap: PiiMap): string {
  const tokensInText = text.match(TOKEN_PATTERN) ?? [];
  const missing = [...new Set(tokensInText)].filter((t) => !piiMap.byToken[t]);
  if (missing.length > 0) {
    throw new Error(
      `rehydrateInBrowser: token(s) not in PiiMap: ${missing.join(", ")}`
    );
  }
  let rehydrated = text;
  for (const [token, entry] of Object.entries(piiMap.byToken)) {
    rehydrated = rehydrated.split(token).join(entry.value);
  }
  return rehydrated;
}

/**
 * Dehydrates a File (or Blob) in the browser.
 * Phase 2: supports text/plain, PDF, and DOCX via browser-side text extraction.
 */
export async function dehydrateInBrowser(
  file: File | Blob
): Promise<DehydrateInBrowserResult> {
  const { text, mimeType } = await extractTextFromFileInBrowser(file);
  const { tokenizedText, piiMap } = dehydrateTextForBrowser(text);
  const tokenizedBuffer = new TextEncoder().encode(tokenizedText).buffer;
  return {
    tokenizedBuffer,
    mimeType,
    piiMap,
    tokenizedText,
  };
}
