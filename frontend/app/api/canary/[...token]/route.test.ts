/**
 * Tests for canary API route: token + variant parsing and logging.
 * @jest-environment node
 */

import { NextRequest } from "next/server";
import { GET } from "./route";

function parseLastLog(spy: jest.SpyInstance): any | null {
  const calls = spy.mock.calls;
  if (!calls.length) return null;
  const [arg] = calls[calls.length - 1];
  try {
    return JSON.parse(String(arg));
  } catch {
    return null;
  }
}

function createRequest(url: string, headers?: HeadersInit): NextRequest {
  return new NextRequest(url, { method: "GET", headers: headers ?? {} });
}

describe("GET /api/canary/[...token]", () => {
  it("parses path with variant and logs variant docx-hidden", async () => {
    const req = createRequest("https://example.com/api/canary/uuid-123/docx-hidden");
    const res = await GET(req, {
      params: Promise.resolve({ token: ["uuid-123", "docx-hidden"] }),
    });
    expect(res.status).toBe(200);
    const logSpy = jest.spyOn(console, "log").mockImplementation(() => {});
    const res2 = await GET(req, {
      params: Promise.resolve({ token: ["uuid-123", "docx-hidden"] }),
    });
    expect(res2.status).toBe(200);
    const payload = parseLastLog(logSpy);
    expect(payload).toMatchObject({
      level: "info",
      route: "/api/canary",
      event: "hit",
      meta: expect.objectContaining({
        tokenId: "uuid-123",
        variant: "docx-hidden",
      }),
    });
    logSpy.mockRestore();
  });

  it("parses path with single segment as token only (legacy, no variant)", async () => {
    const logSpy = jest.spyOn(console, "log").mockImplementation(() => {});
    const req = createRequest("https://example.com/api/canary/uuid-legacy");
    const res = await GET(req, {
      params: Promise.resolve({ token: ["uuid-legacy"] }),
    });
    expect(res.status).toBe(200);
    const payload = parseLastLog(logSpy);
    expect(payload).toMatchObject({
      level: "info",
      route: "/api/canary",
      event: "hit",
      meta: expect.objectContaining({
        tokenId: "uuid-legacy",
        variant: "legacy",
      }),
    });
    logSpy.mockRestore();
  });

  it("uses query param v= when path has no variant", async () => {
    const logSpy = jest.spyOn(console, "log").mockImplementation(() => {});
    const req = createRequest(
      "https://example.com/api/canary/my-token?v=pdf-clickable"
    );
    const res = await GET(req, {
      params: Promise.resolve({ token: ["my-token"] }),
    });
    expect(res.status).toBe(200);
    const payload = parseLastLog(logSpy);
    expect(payload).toMatchObject({
      level: "info",
      route: "/api/canary",
      event: "hit",
      meta: expect.objectContaining({
        tokenId: "my-token",
        variant: "pdf-clickable",
      }),
    });
    logSpy.mockRestore();
  });

  it("returns JSON { ok: true }", async () => {
    const req = createRequest("https://example.com/api/canary/any/pdf-text");
    const res = await GET(req, {
      params: Promise.resolve({ token: ["any", "pdf-text"] }),
    });
    const body = await res.json();
    expect(body).toEqual({ ok: true });
    expect(res.headers.get("Content-Type")).toContain("application/json");
  });

  it("returns 429 when canary rate limit is exceeded", async () => {
    process.env.RATE_LIMIT_CANARY_MAX = "1";
    process.env.RATE_LIMIT_CANARY_WINDOW_MS = "60000";

    const makeReq = async () =>
      GET(
        createRequest("https://example.com/api/canary/uuid-123/docx-hidden", {
          "x-forwarded-for": "198.51.100.5",
        }) as unknown as NextRequest,
        {
          params: Promise.resolve({ token: ["uuid-123", "docx-hidden"] }),
        }
      );

    const first = await makeReq();
    expect(first.status).toBe(200);

    const second = await makeReq();
    expect(second.status).toBe(429);
    const body = await second.json();
    expect(body.ok).toBe(false);
    expect(body.error).toMatch(/too many canary hits/i);

    delete process.env.RATE_LIMIT_CANARY_MAX;
    delete process.env.RATE_LIMIT_CANARY_WINDOW_MS;
  });
});
