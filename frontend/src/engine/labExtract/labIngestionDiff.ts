/**
 * Deterministic comparison helpers for lab “ingestion divergence” demos.
 */

/** Whitespace-separated tokens in `first` that do not appear in `second` (sorted, unique). */
export function tokensOnlyInFirst(first: string, second: string): string[] {
  const b = new Set(second.split(/\s+/).filter(Boolean));
  const a = first.split(/\s+/).filter(Boolean);
  const out = new Set<string>();
  for (const t of a) {
    if (!b.has(t)) out.add(t);
  }
  return [...out].sort((x, y) => x.localeCompare(y));
}
