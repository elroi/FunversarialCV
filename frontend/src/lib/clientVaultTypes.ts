/**
 * Client-side PII types for browser dehydration/rehydration.
 * PiiMap is kept only in memory on the client and never sent to the server.
 *
 * Token format: {{PII_<TYPE>_<N>}} where TYPE in EMAIL | PHONE | ADDRESS | NAME | OTHER, N is 0-based index.
 */

export type PiiType = "EMAIL" | "PHONE" | "ADDRESS" | "NAME" | "OTHER";

export interface PiiTokenMapping {
  token: string;
  type: PiiType;
  value: string;
}

export interface PiiMap {
  byToken: Record<string, PiiTokenMapping>;
}

export interface DehydrateResult {
  tokenizedText: string;
  piiMap: PiiMap;
}

export interface DehydrateInBrowserResult {
  tokenizedBuffer: ArrayBuffer;
  mimeType: string;
  piiMap: PiiMap;
  tokenizedText: string;
}
