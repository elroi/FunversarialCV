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

/** Matches full tokens {{PII_*_N}} and short tokens {{E0}}, {{P0}}, {{A0}} (with optional trailing spaces for padding). */
const TOKEN_PATTERN = /\{\{(?:PII_[A-Z_]+\d+|E\d+|P\d+|A\d+)\}\}\s*/g;

/** PII shorter than this is not tokenized (avoids noise; ensures token can fit in binary replace). */
export const MIN_PII_VALUE_LENGTH = 6;

/** Length of full tokens so we know when to use short form (short form fits in value.length). */
const FULL_TOKEN_LENS = {
  E: "{{PII_EMAIL_0}}".length,
  P: "{{PII_PHONE_0}}".length,
  A: "{{PII_ADDR_0}}".length,
} as const;

/**
 * Returns a token string that is at most value.length (for style-preserving PDF/DOCX replace).
 * Uses short form (e.g. {{E0}}) when value is shorter than full token; pads with spaces to value.length.
 */
function tokenForReplace(
  fullToken: string,
  shortPrefix: keyof typeof FULL_TOKEN_LENS,
  index: number,
  value: string
): string {
  const fullLen = FULL_TOKEN_LENS[shortPrefix];
  if (value.length >= fullLen) return fullToken;
  const short = `{{${shortPrefix}${index}}}`;
  return short.padEnd(value.length, " ");
}

/**
 * Dehydrates plain text: replaces PII with tokens and returns tokenized text plus a PiiMap.
 * Uses short tokens for short PII so token never exceeds value length (preserves styles in PDF/DOCX).
 * Only tokenizes PII with length >= MIN_PII_VALUE_LENGTH.
 */
export function dehydrateTextForBrowser(text: string): DehydrateResult {
  const piiMap: PiiMap = { byToken: {} };
  let emailCount = 0;
  let phoneCount = 0;
  let addrCount = 0;

  let tokenizedText = text.replace(PII_REGEX.EMAIL, (match) => {
    if (match.length < MIN_PII_VALUE_LENGTH) return match;
    const fullToken = `{{PII_EMAIL_${emailCount}}}`;
    const token = tokenForReplace(fullToken, "E", emailCount, match);
    emailCount++;
    piiMap.byToken[token] = {
      token,
      type: "EMAIL",
      value: match,
    };
    return token;
  });

  tokenizedText = tokenizedText.replace(PII_REGEX.PHONE, (match) => {
    if (match.length < MIN_PII_VALUE_LENGTH) return match;
    const fullToken = `{{PII_PHONE_${phoneCount}}}`;
    const token = tokenForReplace(fullToken, "P", phoneCount, match);
    phoneCount++;
    piiMap.byToken[token] = {
      token,
      type: "PHONE",
      value: match,
    };
    return token;
  });

  tokenizedText = tokenizedText.replace(PII_REGEX.ADDRESS, (match) => {
    if (match.length < MIN_PII_VALUE_LENGTH) return match;
    const fullToken = `{{PII_ADDR_${addrCount}}}`;
    const token = tokenForReplace(fullToken, "A", addrCount, match);
    addrCount++;
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
    // Replace every occurrence (e.g. visible text and mailto: URIs).
    let pos = findBytes(arr, tokenBytes);
    while (pos !== -1) {
      arr.set(valueBytes, pos);
      pos = findBytes(arr, tokenBytes);
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
    // In-place replacement for tokens in uncompressed streams.
    let buf = rehydratePdfBufferInPlace(tokenizedBuffer, piiMap);
    // Also rehydrate tokens inside FlateDecode streams (preserve-styles path for compressed PDFs).
    const { rehydratePdfFlateStreams } = await import("./clientPdfStreamTokenize");
    buf = await rehydratePdfFlateStreams(buf, piiMap);
    return buf;
  }
  throw new Error(
    `rehydrateInBrowser: unsupported mimeType ${mimeType}`
  );
}

function applyRehydrationToText(text: string, piiMap: PiiMap): string {
  const tokensInText = text.match(TOKEN_PATTERN) ?? [];
  const missing = [...new Set(tokensInText)].filter((t) => {
    const trimmed = t.replace(/\s+$/, "");
    return !piiMap.byToken[t] && !piiMap.byToken[trimmed];
  });
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
