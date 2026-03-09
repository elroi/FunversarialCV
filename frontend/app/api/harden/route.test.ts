/**
 * API route tests for POST /api/harden (TDD).
 * Asserts: 200 + bufferBase64 + scannerReport; 400 for missing/invalid file or payloads; 500 body generic.
 * @jest-environment node
 */

import { POST } from "./route";
import { MAX_BODY_BYTES } from "./constants";
import { createDocumentWithText, MIME_PDF, MIME_DOCX } from "@/engine/documentExtract";
import * as Processor from "@/engine/Processor";

jest.mock("@/engine/Processor", () => {
  const actual = jest.requireActual<typeof import("@/engine/Processor")>("@/engine/Processor");
  return { ...actual, process: jest.fn(actual.process) };
});

describe("POST /api/harden", () => {
  async function buildPdfFormData(buffer: Buffer, filename = "test.pdf") {
    const form = new FormData();
    form.append("file", new Blob([new Uint8Array(buffer)], { type: "application/pdf" }), filename);
    form.append("payloads", "{}");
    return form;
  }

  async function buildDocxFormData(buffer: Buffer, filename = "test.docx") {
    const form = new FormData();
    form.append(
      "file",
      new Blob([new Uint8Array(buffer)], {
        type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      }),
      filename
    );
    form.append("payloads", "{}");
    return form;
  }

  it("returns 400 when file is missing", async () => {
    const form = new FormData();
    form.append("payloads", "{}");
    const req = new Request("http://localhost:3000/api/harden", {
      method: "POST",
      body: form,
    });
    const res = await POST(req as never);
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toBeDefined();
    expect(json.error.toLowerCase()).toMatch(/missing|invalid|file/);
  });

  it("returns 400 when content is not PDF or DOCX (magic bytes)", async () => {
    const form = new FormData();
    form.append(
      "file",
      new Blob([Buffer.from("not a pdf or docx")], { type: "application/octet-stream" }),
      "file.txt"
    );
    form.append("payloads", "{}");
    const req = new Request("http://localhost:3000/api/harden", {
      method: "POST",
      body: form,
    });
    const res = await POST(req as never);
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toBeDefined();
    expect(json.error.toLowerCase()).toMatch(/unsupported|invalid|pdf|docx/);
  });

  it("returns 400 when payloads is invalid JSON", async () => {
    const minimalPdf = await createDocumentWithText("Resume", MIME_PDF);
    const form = await buildPdfFormData(minimalPdf);
    form.set("payloads", "not json");
    const req = new Request("http://localhost:3000/api/harden", {
      method: "POST",
      body: form,
    });
    const res = await POST(req as never);
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toBeDefined();
    expect(json.error.toLowerCase()).toMatch(/payload|json/);
  });

  it("returns 413 when file exceeds max body size", async () => {
    const oversized = Buffer.alloc(MAX_BODY_BYTES + 1);
    oversized[0] = 0x25;
    oversized[1] = 0x50;
    oversized[2] = 0x44;
    oversized[3] = 0x46;
    const form = new FormData();
    form.append(
      "file",
      new Blob([new Uint8Array(oversized)], { type: "application/pdf" }),
      "large.pdf"
    );
    form.append("payloads", "{}");
    const req = new Request("http://localhost:3000/api/harden", {
      method: "POST",
      body: form,
    });
    const res = await POST(req as never);
    expect(res.status).toBe(413);
    const json = await res.json();
    expect(json.error).toBe("File too large. Max size is 4 MB.");
  });

  it("returns 400 when file content does not match extension", async () => {
    const minimalDocx = await createDocumentWithText("Resume content", MIME_DOCX);
    const form = new FormData();
    form.append(
      "file",
      new Blob([new Uint8Array(minimalDocx)], {
        type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      }),
      "resume.pdf"
    );
    form.append("payloads", "{}");
    const req = new Request("http://localhost:3000/api/harden", {
      method: "POST",
      body: form,
    });
    const res = await POST(req as never);
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toBeDefined();
    expect(json.error.toLowerCase()).toMatch(/content|extension/);
  });

  it("returns 200 with bufferBase64 and scannerReport for valid PDF (mocked process — pdf-parse fails on pdf-lib output in Node)", async () => {
    const minimalPdf = await createDocumentWithText("Resume content", MIME_PDF);
    (Processor.process as jest.Mock).mockResolvedValueOnce({
      buffer: Buffer.from([0x25, 0x50, 0x44, 0x46, 0x2d, 0x31, 0x2e, 0x34]), // %PDF-1.4
      scannerReport: {
        scan: { hasSuspiciousPatterns: false, matchedPatterns: [] },
        alerts: [],
      },
    });
    const form = await buildPdfFormData(minimalPdf);
    const req = new Request("http://localhost:3000/api/harden", {
      method: "POST",
      body: form,
    });
    const res = await POST(req as never);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.bufferBase64).toBeDefined();
    expect(typeof json.bufferBase64).toBe("string");
    expect(json.mimeType).toBe("application/pdf");
    expect(json.scannerReport).toBeDefined();
    expect(json.scannerReport.scan).toBeDefined();
    expect(json.scannerReport.scan).toHaveProperty("hasSuspiciousPatterns");
    expect(json.scannerReport.scan).toHaveProperty("matchedPatterns");
    expect(json.originalName).toBe("test.pdf");
    const decoded = Buffer.from(json.bufferBase64, "base64");
    expect(decoded.length).toBeGreaterThan(0);
    expect(decoded[0]).toBe(0x25);
    expect(decoded[1]).toBe(0x50);
  }, 15000);

  it("returns 200 with bufferBase64 and scannerReport for valid DOCX", async () => {
    const minimalDocx = await createDocumentWithText("Resume content", MIME_DOCX);
    const form = await buildDocxFormData(minimalDocx);
    const req = new Request("http://localhost:3000/api/harden", {
      method: "POST",
      body: form,
    });
    const res = await POST(req as never);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.bufferBase64).toBeDefined();
    expect(json.mimeType).toBe(
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
    );
    expect(json.scannerReport.scan).toBeDefined();
    const decoded = Buffer.from(json.bufferBase64, "base64");
    expect(decoded[0]).toBe(0x50);
    expect(decoded[1]).toBe(0x4b);
  }, 15000);

  it("returns 500 with generic error body when processing throws", async () => {
    const consoleSpy = jest.spyOn(console, "error").mockImplementation(() => {});
    (Processor.process as jest.Mock).mockRejectedValueOnce(
      new Error("Internal failure at /some/path/secret.ts:123")
    );
    const minimalDocx = await createDocumentWithText("Resume content", MIME_DOCX);
    const form = await buildDocxFormData(minimalDocx);
    const req = new Request("http://localhost:3000/api/harden", {
      method: "POST",
      body: form,
    });
    const res = await POST(req as never);
    expect(res.status).toBe(500);
    const json = await res.json();
    expect(json.error).toBe("Processing failed. Please try again.");
    expect(JSON.stringify(json)).not.toMatch(/stack|path|secret\.ts|Internal failure/);
    consoleSpy.mockRestore();
  }, 15000);

  it("honors eggIds and returns 200 when only subset of eggs requested", async () => {
    const minimalDocx = await createDocumentWithText("Resume content", MIME_DOCX);
    const form = new FormData();
    form.append(
      "file",
      new Blob([new Uint8Array(minimalDocx)], {
        type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      }),
      "test.docx"
    );
    form.append(
      "payloads",
      JSON.stringify({
        "canary-wing": JSON.stringify({
          baseUrl: "https://canary.example.com/c",
          token: "test-token",
        }),
      })
    );
    form.append("eggIds", JSON.stringify(["canary-wing"]));
    const req = new Request("http://localhost:3000/api/harden", {
      method: "POST",
      body: form,
    });
    const res = await POST(req as never);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.bufferBase64).toBeDefined();
    expect(json.scannerReport).toBeDefined();
    expect(json.scannerReport.scan).toBeDefined();
    const decoded = Buffer.from(json.bufferBase64, "base64");
    expect(decoded[0]).toBe(0x50);
    expect(decoded[1]).toBe(0x4b);
  }, 15000);

  it("passes preserveStyles to process when form has preserveStyles=true", async () => {
    const minimalDocx = await createDocumentWithText("Resume content", MIME_DOCX);
    const form = await buildDocxFormData(minimalDocx);
    form.append("preserveStyles", "true");
    form.append("eggIds", JSON.stringify(["metadata-shadow"]));
    const req = new Request("http://localhost:3000/api/harden", {
      method: "POST",
      body: form,
    });
    const res = await POST(req as never);
    expect(res.status).toBe(200);
    expect(Processor.process).toHaveBeenCalledWith(
      expect.objectContaining({
        preserveStyles: true,
        eggs: expect.any(Array),
      })
    );
  }, 15000);
});
