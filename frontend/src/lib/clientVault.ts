/**
 * Client-side PII dehydration/rehydration for the browser.
 * Keeps raw PII only in memory (PiiMap); server receives only tokenized content.
 */

import { PII_REGEX } from "./vault";
import {
  extractTextFromFileInBrowser,
  extractTextFromBuffer,
  MIME_PDF,
  MIME_DOCX,
} from "./clientDocumentExtract";
import { createDocumentWithTextInBrowser } from "./clientDocumentCreate";
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
 * Rehydrates a tokenized buffer using the client-held PiiMap.
 * text/plain: decode → replace tokens → re-encode.
 * DOCX: in-place token → PII replacement in word/document.xml (preserves styles).
 * PDF: extract text → replace tokens → rebuild document (no in-place path yet).
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
    const text = await extractTextFromBuffer(tokenizedBuffer, mimeType);
    const rehydratedText = applyRehydrationToText(text, piiMap);
    return createDocumentWithTextInBrowser(rehydratedText, mimeType);
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
