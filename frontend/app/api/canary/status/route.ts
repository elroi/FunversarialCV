/**
 * Canary status: GET handler for "did my canary sing?"
 * Returns recent hits for the given token only. Rate-limited by IP.
 * No auth beyond the token (knowing the token proves ownership). Best-effort, process-local.
 */

import { NextRequest } from "next/server";
import { getCanaryHitsByToken } from "@/lib/canaryHits";
import { checkRateLimit } from "@/lib/rateLimit";
import { logInfo } from "@/lib/log";

export const dynamic = "force-dynamic";

const MAX_HITS_PER_TOKEN = 50;

export async function GET(request: NextRequest) {
  const ip = request.ip ?? request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  const rate = checkRateLimit("canaryStatus", ip);
  if (!rate.allowed) {
    logInfo("/api/canary/status", "rate_limit_denied", { ip, retryAfterSeconds: rate.retryAfterSeconds });
    return new Response(
      JSON.stringify({ error: "Too many status checks. Try again later." }),
      {
        status: 429,
        headers: {
          "Content-Type": "application/json",
          ...(rate.retryAfterSeconds ? { "Retry-After": String(rate.retryAfterSeconds) } : {}),
        },
      }
    );
  }

  const token = request.nextUrl.searchParams.get("token");
  if (token === null || token === undefined) {
    return new Response(
      JSON.stringify({ error: "Missing query parameter: token." }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }
  if (typeof token !== "string" || !token.trim()) {
    return new Response(
      JSON.stringify({ error: "Query parameter token must be a non-empty string." }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }

  const hits = getCanaryHitsByToken(token.trim(), MAX_HITS_PER_TOKEN);
  const body = {
    hits: hits.map((h) => ({
      variant: h.variant,
      ts: h.ts,
      userAgent: h.userAgent,
      referer: h.referer,
    })),
  };
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
}
