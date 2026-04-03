/**
 * Central document Processor: coordinates the five-stage secure lifecycle.
 * Stateless — no files stored; buffer and PII store live only for the request.
 */

import { dehydrate, rehydrate } from "../lib/vault";
import type { IEgg } from "../types/egg";
import { runScan, buildScannerReport } from "../lib/Scanner";
import type { ScanResult, ScannerReport } from "../lib/Scanner";
import { extractText, createDocumentWithText, isSupportedMimeType } from "./documentExtract";
import { injectHiddenCanaryLinkIntoDocx } from "./docxCanary";
import { getInvisibleHandTrapText } from "../eggs";
import {
  applyHardenProfileToPayloads,
  type HardenDivergenceProfile,
} from "./divergenceProfile";

/** Matches canary URL as embedded in DOCX (our /api/canary/:token/docx-hidden pattern). */
const DOCX_CANARY_URL_RE =
  /https?:\/\/[^\s]+\/api\/canary\/[a-f0-9-]+\/docx-hidden(?:\?[^\s]*)?/;
const MIME_DOCX = "application/vnd.openxmlformats-officedocument.wordprocessingml.document";

/** Egg ids that only add content (no visible body text change). When preserveStyles is true and only these run, we use the original buffer. */
export const ADD_ONLY_EGG_IDS = new Set([
  "invisible-hand",
  "canary-wing",
  "metadata-shadow",
  "incident-mailto",
]);

export interface ProcessorInput {
  buffer: Buffer;
  mimeType: string;
  eggs: IEgg[];
  /** Optional payload per egg id; default empty string. */
  payloads?: Record<string, string>;
  /** When true and only add-only eggs are selected, use original buffer (preserve styles). */
  preserveStyles?: boolean;
  /**
   * Payload shaping for parser vs human-visible trade-offs. Omitted → balanced (backward compatible).
   */
  divergenceProfile?: HardenDivergenceProfile;
}

export interface ProcessorOutput {
  buffer: Buffer;
  /** Pre-injection scan result (observational; does not block processing). */
  dualityCheck: ScanResult;
  /** Duality feedback report; includes [DUALITY_ALERT] when existing adversarial layer detected. */
  scannerReport: ScannerReport;
}

/**
 * Runs the full pipeline:
 * 1) Accept buffer
 * 2) Duality check (scan for existing prompt-injection patterns)
 * 3) Dehydration (PII → tokens)
 * 4) Injection (run each IEgg on dehydrated buffer)
 * 5) Rehydration (tokens → PII) and return final buffer
 *
 * When preserveStyles is true and only add-only eggs are selected, skips rebuild and runs eggs on the original buffer.
 */
export async function process(input: ProcessorInput): Promise<ProcessorOutput> {
  const {
    buffer,
    mimeType,
    eggs,
    payloads = {},
    preserveStyles = false,
    divergenceProfile = "balanced",
  } = input;

  const effectivePayloads = applyHardenProfileToPayloads(
    divergenceProfile,
    eggs.map((e) => e.id),
    payloads
  );

  // —— Stage 1: Accept buffer ——
  if (!isSupportedMimeType(mimeType)) {
    throw new Error(`Unsupported document type: ${mimeType}. Use a Word document (.docx).`);
  }

  // When no eggs are selected, run scan only and return the original buffer unchanged.
  if (eggs.length === 0) {
    const rawText = await extractText(buffer, mimeType);
    const scan = await runScan({ text: rawText, buffer, mimeType });
    const scannerReport = buildScannerReport(scan);
    return { buffer, dualityCheck: scan, scannerReport };
  }

  const allAddOnly =
    preserveStyles &&
    eggs.every((egg) => ADD_ONLY_EGG_IDS.has(egg.id));

  if (allAddOnly) {
    // Try text extraction for duality scan; if it fails, proceed anyway.
    let rawText = "";
    let extractionFailed = false;
    try {
      rawText = await extractText(buffer, mimeType);
    } catch {
      extractionFailed = true;
    }
    const scan: ScanResult = extractionFailed
      ? { hasSuspiciousPatterns: false, matchedPatterns: [] }
      : await runScan({ text: rawText, buffer, mimeType });
    const scannerReport = buildScannerReport(scan);
    let currentBuffer = buffer;
    for (const egg of eggs) {
      const payload = effectivePayloads[egg.id] ?? "";
      if (!egg.validatePayload(payload)) {
        throw new Error(`Egg "${egg.id}" rejected payload validation.`);
      }
      currentBuffer = await egg.transform(currentBuffer, payload);
    }
    return { buffer: currentBuffer, dualityCheck: scan, scannerReport };
  }

  // —— Stage 2: Duality check (defensive scan) — observational only; no PII leaves this step ——
  const rawText = await extractText(buffer, mimeType);
  const scan = await runScan({ text: rawText, buffer, mimeType });
  const scannerReport = buildScannerReport(scan);

  // —— Stage 3: Dehydration — only tokens from here until rehydration ——
  const { dehydrated, store } = dehydrate(rawText);
  let currentBuffer = await createDocumentWithText(dehydrated, mimeType);

  // —— Stage 4: Injection — run each egg on the dehydrated document ——
  for (const egg of eggs) {
    const payload = effectivePayloads[egg.id] ?? "";
    if (!egg.validatePayload(payload)) {
      throw new Error(`Egg "${egg.id}" rejected payload validation.`);
    }

    currentBuffer = await egg.transform(currentBuffer, payload);
  }

  // —— Stage 5: Rehydration — restore PII only in the final output stream ——
  const finalText = await extractText(currentBuffer, mimeType);
  let rehydratedText = rehydrate(finalText, store);

  // For DOCX, Stage 5 rebuilds the doc from text, which loses hyperlink markup
  // and the hidden styling for Invisible Hand. Clean the plain text, rebuild,
  // then re-inject our hidden structures.
  let outputBuffer: Buffer;
  if (mimeType === MIME_DOCX) {
    const canaryUrlMatch = rehydratedText.match(DOCX_CANARY_URL_RE);
    const invisibleRan = eggs.some((e) => e.id === "invisible-hand");
    const trapText = invisibleRan
      ? getInvisibleHandTrapText(effectivePayloads["invisible-hand"] ?? "")
      : "";
    const hasTrapInPlainText =
      trapText.length > 0 && rehydratedText.includes(trapText);

    if (canaryUrlMatch || hasTrapInPlainText) {
      const canaryUrl = canaryUrlMatch?.[0]?.trim();

      let cleaned = rehydratedText;
      if (canaryUrl) {
        cleaned = cleaned.replace(canaryUrl, "");
      }
      cleaned = cleaned.replace(/\s*Verify document integrity\s*/gi, "");
      if (hasTrapInPlainText) {
        cleaned = cleaned.split(trapText).join("");
      }
      cleaned = cleaned.replace(/\n\n+/g, "\n").trim();

      outputBuffer = await createDocumentWithText(cleaned, mimeType);

      if (canaryUrl) {
        outputBuffer = await injectHiddenCanaryLinkIntoDocx(outputBuffer, canaryUrl);
      }
      if (hasTrapInPlainText) {
        // Re-inject the Invisible Hand trap as hidden white text (rebuild path loses styling).
        const { injectHiddenParagraphIntoDocx } = await import("./docxInject");
        outputBuffer = await injectHiddenParagraphIntoDocx(outputBuffer, trapText);
      }
    } else {
      outputBuffer = await createDocumentWithText(rehydratedText, mimeType);
    }
  } else {
    outputBuffer = await createDocumentWithText(rehydratedText, mimeType);
  }

  return { buffer: outputBuffer, dualityCheck: scan, scannerReport };
}
