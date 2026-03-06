/**
 * Pre-hardening duality check: thin facade over Scanner for text-only callers.
 * All pattern definitions and logic live in Scanner (single source of truth).
 * Security: Observational only — no PII leaves this step.
 */

import { runScan, type ScanResult } from "../lib/Scanner";

/** Re-export Scanner result type for backward compatibility (UI, tests). */
export type DualityCheckResult = ScanResult;

/**
 * Scans text for common prompt-injection and canary patterns (no metadata).
 * For full scan including metadata, use runScan from ../lib/Scanner with buffer and mimeType.
 */
export async function runDualityCheck(text: string): Promise<DualityCheckResult> {
  return runScan({
    text,
    buffer: Buffer.alloc(0),
    mimeType: "",
  });
}
