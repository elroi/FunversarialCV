/**
 * Tests for GET /api/canary/status — candidate-facing "did my canary sing?"
 * @jest-environment node
 */

import { NextRequest } from "next/server";
import { GET } from "./route";
import { persistCanaryHit, __resetCanaryHitsForTests } from "@/lib/canaryHits";
import { __resetRateLimitCountersForTests } from "@/lib/rateLimit";

function createRequest(url: string): NextRequest {
  return new NextRequest(url, { method: "GET" });
}

describe("GET /api/canary/status", () => {
  beforeEach(() => {
    __resetCanaryHitsForTests();
    __resetRateLimitCountersForTests();
  });

  it("returns 400 when token is missing", async () => {
    const req = createRequest("https://example.com/api/canary/status");
    const res = await GET(req);
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toMatch(/missing.*token/i);
  });

  it("returns 400 when token is empty string", async () => {
    const req = createRequest("https://example.com/api/canary/status?token=");
    const res = await GET(req);
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toMatch(/token/i);
  });

  it("returns 200 and empty hits when token has no hits", async () => {
    const req = createRequest("https://example.com/api/canary/status?token=no-such-token");
    const res = await GET(req);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toEqual({ hits: [] });
  });

  it("returns only hits for the requested token", async () => {
    await persistCanaryHit({
      tokenId: "my-token",
      variant: "pdf-clickable",
      ts: "2025-01-01T12:00:00.000Z",
      userAgent: "Mozilla/5.0",
    });
    await persistCanaryHit({
      tokenId: "other-token",
      variant: "docx-hidden",
      ts: "2025-01-01T12:01:00.000Z",
    });
    const req = createRequest("https://example.com/api/canary/status?token=my-token");
    const res = await GET(req);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.hits).toHaveLength(1);
    expect(body.hits[0]).toMatchObject({
      variant: "pdf-clickable",
      ts: "2025-01-01T12:00:00.000Z",
      userAgent: "Mozilla/5.0",
    });
  });

  it("returns hits newest-first and does not expose tokenId", async () => {
    await persistCanaryHit({
      tokenId: "t",
      variant: "legacy",
      ts: "2025-01-01T12:00:00.000Z",
    });
    await persistCanaryHit({
      tokenId: "t",
      variant: "pdf-text",
      ts: "2025-01-01T12:01:00.000Z",
    });
    const req = createRequest("https://example.com/api/canary/status?token=t");
    const res = await GET(req);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.hits).toHaveLength(2);
    expect(body.hits[0].ts).toBe("2025-01-01T12:01:00.000Z");
    expect(body.hits[0].variant).toBe("pdf-text");
    expect(body.hits[0]).not.toHaveProperty("tokenId");
  });
});
