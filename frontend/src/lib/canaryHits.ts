/**
 * Canary hit persistence for "which works better where" analysis.
 *
 * Schema (for Vercel KV or similar when enabled):
 * - canary:hit:{id} = JSON CanaryHit (id = uuid per hit)
 * - canary:by-variant:{variant} = counter (INCR)
 * - canary:by-token:{tokenId} = list of hit ids (LPUSH, trim to last N)
 *
 * Optional: persist each hit as { tokenId, variant, ts, userAgent?, referer? }
 * so a future "Canary analytics" page can show hits per variant, per token, over time.
 */

export interface CanaryHit {
  tokenId: string;
  variant: string;
  ts: string;
  userAgent?: string;
  referer?: string;
}

// In-memory ring buffer for minimal, process-local analytics.
// This is intentionally small and ephemeral; for durable, cross-region analytics,
// a KV-backed implementation can replace this via environment configuration.
const MAX_HITS = 200;
let hits: CanaryHit[] = [];

export function getRecentCanaryHits(limit: number = MAX_HITS): CanaryHit[] {
  const slice = hits.slice(0, limit);
  return slice;
}

/**
 * Return recent hits for a single token (for candidate-facing "did my canary sing?").
 * Process-local; best-effort when running on multiple instances.
 */
export function getCanaryHitsByToken(tokenId: string, limit: number = 50): CanaryHit[] {
  if (!tokenId.trim()) return [];
  return hits.filter((h) => h.tokenId === tokenId).slice(0, limit);
}

/**
 * Persist a canary hit for later analysis. Extension point for durable analytics:
 * when KV is configured, write here; getRecentCanaryHits / getCanaryHitsByToken can read from KV.
 * To enable: add @vercel/kv, set KV_REST_API_URL (and KV_REST_API_TOKEN if required),
 * and implement e.g. kv.lpush('canary:hits', JSON.stringify(hit)) and kv.incr(`canary:by-variant:${variant}`).
 */
export async function persistCanaryHit(hit: CanaryHit): Promise<void> {
  // Optional: when Vercel KV is available, persist hit for analytics.
  // const kv = await getKV(); await kv.lpush('canary:hits', JSON.stringify(hit)); await kv.incr(`canary:by-variant:${hit.variant}`);
  hits.unshift(hit);
  if (hits.length > MAX_HITS) {
    hits.length = MAX_HITS;
  }
}

// Test-only helper to reset in-memory state between tests.
export function __resetCanaryHitsForTests() {
  hits = [];
}
