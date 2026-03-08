/**
 * Canary endpoint: GET handler for Canary Wing (LLM10) trackable URLs.
 * When a crawler or pipeline follows the embedded canary link, this route is hit.
 * Parses token + optional variant (path or ?v=) so we know which embedding type was triggered.
 * Logs the hit for debugging/analytics; optionally persist to KV for "which works better where" analysis.
 * No PII is ever sent to this endpoint — the token in the path is the only identifier.
 */

import { NextRequest } from "next/server";
import { persistCanaryHit } from "@/lib/canaryHits";

export const dynamic = "force-dynamic";

const CANARY_VARIANTS = new Set([
  "docx-hidden",
  "docx-clickable",
  "pdf-text",
  "pdf-clickable",
]);

function parseTokenAndVariant(segments: string[]): { tokenId: string; variant: string | undefined } {
  if (!segments?.length) return { tokenId: "", variant: undefined };
  const last = segments[segments.length - 1];
  if (segments.length >= 2 && CANARY_VARIANTS.has(last)) {
    const tokenId = segments.slice(0, -1).join("/");
    return { tokenId, variant: last };
  }
  return { tokenId: segments.join("/"), variant: undefined };
}

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ token: string[] }> }
) {
  const { token: tokenSegments } = await context.params;
  const segments = tokenSegments ?? [];
  const { tokenId, variant: pathVariant } = parseTokenAndVariant(segments);
  const queryVariant = request.nextUrl.searchParams.get("v");
  const variant =
    pathVariant ?? (queryVariant && CANARY_VARIANTS.has(queryVariant) ? queryVariant : undefined);

  const userAgent = request.headers.get("user-agent") ?? "";
  const referer = request.headers.get("referer") ?? "";
  const variantLabel = variant ?? "legacy";
  console.info("[CanaryWing] hit", {
    tokenId,
    variant: variantLabel,
    ts: new Date().toISOString(),
    userAgent: userAgent.slice(0, 200),
    referer: referer.slice(0, 500),
  });

  persistCanaryHit({
    tokenId,
    variant: variantLabel,
    ts: new Date().toISOString(),
    userAgent: userAgent || undefined,
    referer: referer || undefined,
  }).catch(() => {});

  return new Response(JSON.stringify({ ok: true }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
}
