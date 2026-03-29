/**
 * Build a PDF from a hardened DOCX so parser-facing eggs survive (Word "Save as PDF" often drops them).
 * Flow: extract plain text → strip egg artifacts that would duplicate PDF-side injections → create PDF → run eggs' PDF transforms.
 */

import { PDFDocument } from "pdf-lib";
import type { IEgg } from "../types/egg";
import { getInvisibleHandTrapText } from "../eggs";
import { extractText, createDocumentWithText, MIME_DOCX, MIME_PDF } from "./documentExtract";

/** pdf-parse (used by extractText) can choke on some pdf-lib incremental saves; round-trip normalizes streams. */
async function normalizePdfBuffer(buffer: Buffer): Promise<Buffer> {
  const doc = await PDFDocument.load(new Uint8Array(buffer), {
    ignoreEncryption: true,
  });
  const bytes = await doc.save();
  return Buffer.from(bytes);
}

/** Same pattern as Processor: canary hidden-link URL embedded in DOCX body text. */
const DOCX_CANARY_URL_RE =
  /https?:\/\/[^\s]+\/api\/canary\/[a-f0-9-]+\/docx-hidden(?:\?[^\s]*)?/;

/**
 * Removes injected DOCX-only strings from extracted body text so they are not duplicated as visible PDF lines
 * before eggs re-apply PDF-specific embeddings.
 */
export function sanitizeExtractedDocxPlainTextForPdfSeed(
  text: string,
  eggs: IEgg[],
  payloads: Record<string, string>
): string {
  const ids = new Set(eggs.map((e) => e.id));
  let plain = text;

  if (ids.has("canary-wing")) {
    const canaryUrlMatch = plain.match(DOCX_CANARY_URL_RE);
    if (canaryUrlMatch?.[0]) {
      plain = plain.replace(canaryUrlMatch[0], "");
    }
    plain = plain.replace(/\s*Verify document integrity\s*/gi, "");
  }

  if (ids.has("invisible-hand")) {
    const trapText = getInvisibleHandTrapText(payloads["invisible-hand"] ?? "");
    if (trapText.length > 0 && plain.includes(trapText)) {
      plain = plain.split(trapText).join("");
    }
  }

  return plain.replace(/\n\n+/g, "\n").trim();
}

/**
 * @param docxBuffer - Output of the harden pipeline (DOCX).
 * @param eggs - Same egg list and order as used in `process()`.
 * @param payloads - Same payloads as used in `process()` (including server-filled canary token).
 */
export async function exportHardenedDocxToPdf(
  docxBuffer: Buffer,
  eggs: IEgg[],
  payloads: Record<string, string>
): Promise<Buffer> {
  let plain = await extractText(docxBuffer, MIME_DOCX);
  plain = sanitizeExtractedDocxPlainTextForPdfSeed(plain, eggs, payloads);
  const seed = plain.length > 0 ? plain : " ";

  let pdfBuffer = await createDocumentWithText(seed, MIME_PDF);

  for (const egg of eggs) {
    const payload = payloads[egg.id] ?? "";
    if (!egg.validatePayload(payload)) {
      throw new Error(`Egg "${egg.id}" rejected payload validation.`);
    }
    pdfBuffer = await egg.transform(pdfBuffer, payload);
  }

  return normalizePdfBuffer(pdfBuffer);
}
