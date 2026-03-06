/**
 * Canary endpoint: GET handler for Canary Wing (LLM10) trackable URLs.
 * When a crawler or pipeline follows the embedded canary link, this route is hit.
 * Logs the hit for debugging/analytics; optionally increment a counter (e.g. Vercel KV).
 * No PII is ever sent to this endpoint — the token in the path is the only identifier.
 */

import { NextRequest } from "next/server";

export const dynamic = "force-dynamic";

export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ token: string[] }> }
) {
  const { token: tokenSegments } = await context.params;
  const token = tokenSegments?.join("/") ?? "";

  // Log the hit (Vercel/server logs, Better Stack, etc.)
  const userAgent = _request.headers.get("user-agent") ?? "";
  const referer = _request.headers.get("referer") ?? "";
  console.info("[CanaryWing] hit", {
    token,
    ts: new Date().toISOString(),
    userAgent: userAgent.slice(0, 200),
    referer: referer.slice(0, 500),
  });

  // Optional: increment counter via Vercel KV or similar (MVP: logging only)
  // e.g. await kv.incr('canary:hits'); await kv.incr(`canary:${token}`);

  return new Response(JSON.stringify({ ok: true }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
}
