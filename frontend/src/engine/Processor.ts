/**
 * Central document Processor: coordinates the five-stage secure lifecycle.
 * Stateless — no files stored; buffer and PII store live only for the request.
 */

import { dehydrate, rehydrate } from "../lib/vault";
import type { IEgg } from "../types/egg";
import { runScan, buildScannerReport } from "../lib/Scanner";
import type { ScanResult, ScannerReport } from "../lib/Scanner";
import {
  extractText,
  createDocumentWithText,
  isSupportedMimeType,
} from "./documentExtract";

/** Egg ids that only add content (no visible body text change). When preserveStyles is true and only these run, we use the original buffer. */
export const ADD_ONLY_EGG_IDS = new Set([
  "invisible-hand",
  "canary-wing",
  "metadata-shadow",
]);

export interface ProcessorInput {
  buffer: Buffer;
  mimeType: string;
  eggs: IEgg[];
  /** Optional payload per egg id; default empty string. */
  payloads?: Record<string, string>;
  /** When true and only add-only eggs are selected, use original buffer (preserve styles). */
  preserveStyles?: boolean;
}

export interface ProcessorOutput {
  buffer: Buffer;
  /** Pre-hardening scan result (observational; does not block processing). */
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
  const { buffer, mimeType, eggs, payloads = {}, preserveStyles = false } = input;

  // —— Stage 1: Accept buffer ——
  if (!isSupportedMimeType(mimeType)) {
    throw new Error(`Unsupported document type: ${mimeType}. Use PDF or DOCX.`);
  }

  const allAddOnly =
    preserveStyles &&
    eggs.length >= 0 &&
    eggs.every((egg) => ADD_ONLY_EGG_IDS.has(egg.id));

  if (allAddOnly) {
    const rawText = await extractText(buffer, mimeType);
    const scan = await runScan({ text: rawText, buffer, mimeType });
    const scannerReport = buildScannerReport(scan);
    let currentBuffer = buffer;
    for (const egg of eggs) {
      const payload = payloads[egg.id] ?? "";
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
    const payload = payloads[egg.id] ?? "";
    if (!egg.validatePayload(payload)) {
      throw new Error(`Egg "${egg.id}" rejected payload validation.`);
    }
    currentBuffer = await egg.transform(currentBuffer, payload);
  }

  // —— Stage 5: Rehydration — restore PII only in the final output stream ——
  const finalText = await extractText(currentBuffer, mimeType);
  const rehydratedText = rehydrate(finalText, store);
  const outputBuffer = await createDocumentWithText(rehydratedText, mimeType);

  return { buffer: outputBuffer, dualityCheck: scan, scannerReport };
}
