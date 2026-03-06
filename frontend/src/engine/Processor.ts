/**
 * Central document Processor: coordinates the five-stage secure lifecycle.
 * Stateless — no files stored; buffer and PII store live only for the request.
 */

import { dehydrate, rehydrate } from "../lib/vault";
import type { IEgg } from "../types/egg";
import { runScan } from "../lib/Scanner";
import type { ScanResult } from "../lib/Scanner";
import {
  extractText,
  createDocumentWithText,
  isSupportedMimeType,
} from "./documentExtract";

export interface ProcessorInput {
  buffer: Buffer;
  mimeType: string;
  eggs: IEgg[];
  /** Optional payload per egg id; default empty string. */
  payloads?: Record<string, string>;
}

export interface ProcessorOutput {
  buffer: Buffer;
  /** Pre-hardening scan result (observational; does not block processing). */
  dualityCheck: ScanResult;
}

/**
 * Runs the full pipeline:
 * 1) Accept buffer
 * 2) Duality check (scan for existing prompt-injection patterns)
 * 3) Dehydration (PII → tokens)
 * 4) Injection (run each IEgg on dehydrated buffer)
 * 5) Rehydration (tokens → PII) and return final buffer
 */
export async function process(input: ProcessorInput): Promise<ProcessorOutput> {
  const { buffer, mimeType, eggs, payloads = {} } = input;

  // —— Stage 1: Accept buffer ——
  if (!isSupportedMimeType(mimeType)) {
    throw new Error(`Unsupported document type: ${mimeType}. Use PDF or DOCX.`);
  }

  // —— Stage 2: Duality check (defensive scan) — observational only; no PII leaves this step ——
  const rawText = await extractText(buffer, mimeType);
  const dualityCheck = await runScan({ text: rawText, buffer, mimeType });

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

  return { buffer: outputBuffer, dualityCheck };
}
