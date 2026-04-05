/**
 * @jest-environment node
 */

import { POST } from "./route";
import { MAX_BODY_BYTES } from "../constants";
import { createDocumentWithText, MIME_DOCX, MIME_PDF } from "@/engine/documentExtract";
import { __resetRateLimitCountersForTests } from "@/lib/rateLimit";

describe("POST /api/lab/extract", () => {
  beforeEach(() => {
    __resetRateLimitCountersForTests();
  });

  async function buildDocxForm(buffer: Buffer, filename = "test.docx") {
    const form = new FormData();
    form.append(
      "file",
      new Blob([new Uint8Array(buffer)], {
        type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      }),
      filename
    );
    return form;
  }

  it("returns 400 when file is missing", async () => {
    const form = new FormData();
    const res = await POST(
      new Request("http://localhost/api/lab/extract", { method: "POST", body: form }) as never
    );
    expect(res.status).toBe(400);
  });

  it("returns 400 for PDF with scoped message", async () => {
    const pdf = await createDocumentWithText("Hi", MIME_PDF);
    const form = new FormData();
    form.append("file", new Blob([new Uint8Array(pdf)], { type: "application/pdf" }), "x.pdf");
    const res = await POST(
      new Request("http://localhost/api/lab/extract", { method: "POST", body: form }) as never
    );
    expect(res.status).toBe(400);
    const j = await res.json();
    expect(String(j.error)).toMatch(/PDF lab extraction is not available/i);
  });

  it("returns 413 when file exceeds max", async () => {
    const oversized = Buffer.alloc(MAX_BODY_BYTES + 1);
    oversized[0] = 0x50;
    oversized[1] = 0x4b;
    const form = await buildDocxForm(oversized);
    const res = await POST(
      new Request("http://localhost/api/lab/extract", { method: "POST", body: form }) as never
    );
    expect(res.status).toBe(413);
  });

  it("returns 429 when rate limit exceeded", async () => {
    process.env.RATE_LIMIT_LAB_EXTRACT_MAX = "1";
    process.env.RATE_LIMIT_LAB_EXTRACT_WINDOW_MS = "60000";
    __resetRateLimitCountersForTests();
    const docx = await createDocumentWithText("Resume line", MIME_DOCX);
    const form = await buildDocxForm(docx);
    const headers = { "x-forwarded-for": "198.51.100.2" };
    const r1 = await POST(
      new Request("http://localhost/api/lab/extract", {
        method: "POST",
        body: form,
        headers,
      }) as never
    );
    expect(r1.status).toBe(200);
    const r2 = await POST(
      new Request("http://localhost/api/lab/extract", {
        method: "POST",
        body: form,
        headers,
      }) as never
    );
    expect(r2.status).toBe(429);
    delete process.env.RATE_LIMIT_LAB_EXTRACT_MAX;
    delete process.env.RATE_LIMIT_LAB_EXTRACT_WINDOW_MS;
    __resetRateLimitCountersForTests();
  });

  it("returns 200 with modes for valid docx", async () => {
    const docx = await createDocumentWithText("Hello lab", MIME_DOCX);
    const form = await buildDocxForm(docx);
    const res = await POST(
      new Request("http://localhost/api/lab/extract", { method: "POST", body: form }) as never
    );
    expect(res.status).toBe(200);
    const j = await res.json();
    expect(j.harnessVersion).toBeDefined();
    expect(Array.isArray(j.modes)).toBe(true);
    expect(j.modes.length).toBeGreaterThanOrEqual(5);
    const ids = j.modes.map((m: { modeId: string }) => m.modeId);
    expect(ids).toContain("docx_forensic_body");
    expect(ids).toContain("docx_hyperlinks");
  });
});
