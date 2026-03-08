/**
 * Tests for canary API route: token + variant parsing and logging.
 * @jest-environment node
 */

import { NextRequest } from "next/server";
import { GET } from "./route";

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
    const logSpy = jest.spyOn(console, "info").mockImplementation(() => {});
    const res2 = await GET(req, {
      params: Promise.resolve({ token: ["uuid-123", "docx-hidden"] }),
    });
    expect(res2.status).toBe(200);
    expect(logSpy).toHaveBeenCalledWith(
      "[CanaryWing] hit",
      expect.objectContaining({
        tokenId: "uuid-123",
        variant: "docx-hidden",
        ts: expect.any(String),
      })
    );
    logSpy.mockRestore();
  });

  it("parses path with single segment as token only (legacy, no variant)", async () => {
    const logSpy = jest.spyOn(console, "info").mockImplementation(() => {});
    const req = createRequest("https://example.com/api/canary/uuid-legacy");
    const res = await GET(req, {
      params: Promise.resolve({ token: ["uuid-legacy"] }),
    });
    expect(res.status).toBe(200);
    expect(logSpy).toHaveBeenCalledWith(
      "[CanaryWing] hit",
      expect.objectContaining({
        tokenId: "uuid-legacy",
        variant: "legacy",
      })
    );
    logSpy.mockRestore();
  });

  it("uses query param v= when path has no variant", async () => {
    const logSpy = jest.spyOn(console, "info").mockImplementation(() => {});
    const req = createRequest(
      "https://example.com/api/canary/my-token?v=pdf-clickable"
    );
    const res = await GET(req, {
      params: Promise.resolve({ token: ["my-token"] }),
    });
    expect(res.status).toBe(200);
    expect(logSpy).toHaveBeenCalledWith(
      "[CanaryWing] hit",
      expect.objectContaining({
        tokenId: "my-token",
        variant: "pdf-clickable",
      })
    );
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
});
