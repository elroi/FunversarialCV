/**
 * Pre-hardening duality check: scan for existing prompt-injection–style patterns
 * in the document before we add our own adversarial layers.
 * Security: Observational only — no PII leaves this step.
 */

export interface DualityCheckResult {
  /** True if any known prompt-injection–like pattern was found. */
  hasSuspiciousPatterns: boolean;
  /** Human-readable list of matched pattern names (for logging/UI). */
  matchedPatterns: string[];
  /** Optional detail per match (e.g. snippet or index). */
  details?: string[];
}

/** Patterns that suggest existing prompt injection or instruction-override attempts. */
const DUALITY_PATTERNS: Array<{ name: string; regex: RegExp }> = [
  { name: "ignore_previous_instructions", regex: /ignore\s+(?:all\s+)?(?:previous|above)\s+instructions?/gi },
  { name: "system_instruction", regex: /system\s*:\s*|<\s*system\s*>/gi },
  { name: "double_angle_bracket", regex: /<<[^>]+>>/g },
  { name: "invisible_unicode", regex: /[\u200B-\u200D\u2060\uFEFF]/g },
  { name: "jailbreak_style", regex: /(?:DAN|jailbreak|no\s+restrictions)/gi },
  { name: "role_override", regex: /you\s+are\s+now\s+|act\s+as\s+if\s+you/gi },
];

/**
 * Scans text for common prompt-injection patterns.
 * Returns a DualityCheckResult; does not modify the input.
 */
export function runDualityCheck(text: string): DualityCheckResult {
  const matchedPatterns: string[] = [];
  const details: string[] = [];
  for (const { name, regex } of DUALITY_PATTERNS) {
    const matches = text.match(regex);
    if (matches?.length) {
      matchedPatterns.push(name);
      details.push(`${name}: ${matches.length} match(es)`);
    }
  }
  return {
    hasSuspiciousPatterns: matchedPatterns.length > 0,
    matchedPatterns,
    details: details.length ? details : undefined,
  };
}
