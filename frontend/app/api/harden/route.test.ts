/**
 * API route tests for POST /api/harden (TDD).
 * Asserts: 200 + bufferBase64 + scannerReport; 400 for missing/invalid file or payloads; 500 body generic.
 * @jest-environment node
 */

import { POST } from "./route";
import { MAX_BODY_BYTES } from "./constants";
import pdfParse from "pdf-parse";
import { createDocumentWithText, MIME_PDF, MIME_DOCX } from "@/engine/documentExtract";
import * as Processor from "@/engine/Processor";
import * as vault from "@/lib/vault";

jest.mock("@/engine/Processor", () => {
  const actual = jest.requireActual<typeof import("@/engine/Processor")>("@/engine/Processor");
  return { ...actual, process: jest.fn(actual.process) };
});

jest.mock("@/lib/vault", () => {
  const actual = jest.requireActual<typeof import("@/lib/vault")>("@/lib/vault");
  return { ...actual, containsPii: jest.fn(actual.containsPii) };
});

jest.mock("@/engine/documentExtract", () => {
  const actual = jest.requireActual<typeof import("@/engine/documentExtract")>("@/engine/documentExtract");
  return {
    ...actual,
    extractText: jest.fn((buffer: Buffer, mimeType: string) => actual.extractText(buffer, mimeType)),
  };
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

  it("returns 400 when content is PDF (DOCX only)", async () => {
    const minimalPdf = await createDocumentWithText("Resume", MIME_PDF);
    const form = await buildPdfFormData(minimalPdf);
    const req = new Request("http://localhost:3000/api/harden", {
      method: "POST",
      body: form,
    });
    const res = await POST(req as never);
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toMatch(/support.*Word documents.*\.docx.*only|PDF support is planned/i);
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
    expect(json.error.toLowerCase()).toMatch(/unsupported|invalid|word document|\.docx/);
  });

  it("returns 400 when payloads is invalid JSON", async () => {
    const minimalDocx = await createDocumentWithText("Resume", MIME_DOCX);
    const form = await buildDocxFormData(minimalDocx);
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

  it("returns 429 when rate limit is exceeded", async () => {
    // Make the limiter very strict for this test.
    process.env.RATE_LIMIT_HARDEN_MAX = "1";
    process.env.RATE_LIMIT_HARDEN_WINDOW_MS = "60000";

    const minimalDocx = await createDocumentWithText("Resume", MIME_DOCX);
    const form = await buildDocxFormData(minimalDocx);

    const makeRequest = async () =>
      POST(
        new Request("http://localhost:3000/api/harden", {
          method: "POST",
          body: form,
          headers: { "x-forwarded-for": "203.0.113.1" },
        }) as never
      );

    const first = await makeRequest();
    expect(first.status).not.toBe(429);

    const second = await makeRequest();
    expect(second.status).toBe(429);
    const json = await second.json();
    expect(json.error).toMatch(/too many egg-injection requests/i);

    delete process.env.RATE_LIMIT_HARDEN_MAX;
    delete process.env.RATE_LIMIT_HARDEN_WINDOW_MS;
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

  it("returns 400 when document text still contains obvious PII (PII-guard)", async () => {
    (Processor.process as jest.Mock).mockClear();
    const piiText = "Name: Test User\nEmail: test.user@example.com\nPhone: (415) 555-1234\n123 Main Street";
    const minimalDocxWithPii = await createDocumentWithText(piiText, MIME_DOCX);
    (vault.containsPii as jest.Mock).mockReturnValueOnce(true);
    const { extractText } = await import("@/engine/documentExtract");
    (extractText as jest.Mock).mockResolvedValueOnce(piiText);
    const form = await buildDocxFormData(minimalDocxWithPii, "resume.docx");
    const req = new Request("http://localhost:3000/api/harden", {
      method: "POST",
      body: form,
    });
    const res = await POST(req as never);
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toBe(
      "Server expected dehydrated tokens only; client dehydration may have failed. No document was produced or stored."
    );
    expect(Processor.process).not.toHaveBeenCalled();
  });

  it("accepts tokenizedText mode with originalMimeType and returns 200", async () => {
    (Processor.process as jest.Mock).mockResolvedValueOnce({
      buffer: Buffer.from([0x25, 0x50, 0x44, 0x46]), // %PDF
      scannerReport: {
        scan: { hasSuspiciousPatterns: false, matchedPatterns: [] },
        alerts: [],
      },
    });

    const form = new FormData();
    form.append("tokenizedText", "Hello {{PII_EMAIL_0}}");
    form.append("originalMimeType", MIME_PDF);
    form.append("payloads", "{}");
    const req = new Request("http://localhost:3000/api/harden", {
      method: "POST",
      body: form,
    });

    const res = await POST(req as never);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.mimeType).toBe(MIME_PDF);
    expect(json.bufferBase64).toBeDefined();
    expect(typeof json.bufferBase64).toBe("string");
    expect(json.originalName).toBe("document.pdf");
  });

  it("returns 400 in tokenizedText mode when text still contains obvious PII", async () => {
    (Processor.process as jest.Mock).mockClear();
    (vault.containsPii as jest.Mock).mockReturnValueOnce(true);
    const form = new FormData();
    form.append("tokenizedText", "Email: user@example.com");
    form.append("originalMimeType", MIME_PDF);
    form.append("payloads", "{}");
    const req = new Request("http://localhost:3000/api/harden", {
      method: "POST",
      body: form,
    });

    const res = await POST(req as never);
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toBe(
      "Server expected dehydrated tokens only; client dehydration may have failed. No document was produced or stored."
    );
    expect(Processor.process).not.toHaveBeenCalled();
  });

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

  it("returns pdfExport fields when includePdfExport is true (DOCX output)", async () => {
    const minimalDocx = await createDocumentWithText("Resume content\nLine two", MIME_DOCX);
    const form = await buildDocxFormData(minimalDocx);
    form.append("includePdfExport", "true");
    form.append("eggIds", JSON.stringify(["invisible-hand"]));
    form.append("payloads", JSON.stringify({ "invisible-hand": "" }));
    const req = new Request("http://localhost:3000/api/harden", {
      method: "POST",
      body: form,
    });
    const res = await POST(req as never);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(typeof json.pdfExportBase64).toBe("string");
    expect(json.pdfExportMimeType).toBe(MIME_PDF);
    expect(json.pdfExportFileName).toMatch(/\.pdf$/i);
    const pdfBuf = Buffer.from(json.pdfExportBase64, "base64");
    expect(pdfBuf[0]).toBe(0x25);
    const parsed = await pdfParse(pdfBuf);
    expect(parsed.text).toContain("Resume content");
    expect(parsed.text).toMatch(/Note to AI recruiter|exceptionally qualified/i);
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

  it("returns canaryTokenUsed when canary-wing payload has no token so client can sync card", async () => {
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
        "canary-wing": JSON.stringify({ baseUrl: "http://localhost:3000/api/canary" }),
      })
    );
    form.append("eggIds", JSON.stringify(["canary-wing"]));
    const req = new Request("http://localhost:3000/api/harden", { method: "POST", body: form });
    const res = await POST(req as never);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.canaryTokenUsed).toBeDefined();
    expect(typeof json.canaryTokenUsed).toBe("string");
    expect(json.canaryTokenUsed).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i);
  }, 15000);

  it("runs no eggs when client sends eggIds: [] (all eggs unchecked)", async () => {
    const minimalDocx = await createDocumentWithText("Resume content", MIME_DOCX);
    const form = await buildDocxFormData(minimalDocx);
    form.append("eggIds", JSON.stringify([]));
    const req = new Request("http://localhost:3000/api/harden", {
      method: "POST",
      body: form,
    });
    const res = await POST(req as never);
    expect(res.status).toBe(200);
    expect(Processor.process).toHaveBeenCalledWith(
      expect.objectContaining({
        eggs: [],
      })
    );
    const json = await res.json();
    const decoded = Buffer.from(json.bufferBase64, "base64");
    expect(decoded[0]).toBe(0x50);
    expect(decoded[1]).toBe(0x4b);
  }, 15000);

  describe("DOCX with PII (PII guard)", () => {
    const ADD_ONLY_EGG_IDS_LIST = [
      "invisible-hand",
      "canary-wing",
      "metadata-shadow",
      "incident-mailto",
    ];

    it("returns 400 when DOCX contains PII (PII guard runs for DOCX)", async () => {
      (Processor.process as jest.Mock).mockClear();
      const piiText = "Email: user@example.com\nPhone: (415) 555-1234";
      const minimalDocxWithPii = await createDocumentWithText(piiText, MIME_DOCX);
      (vault.containsPii as jest.Mock).mockReturnValueOnce(true);
      const { extractText } = await import("@/engine/documentExtract");
      (extractText as jest.Mock).mockResolvedValueOnce(piiText);

      const form = await buildDocxFormData(minimalDocxWithPii, "resume.docx");
      form.append("preserveStyles", "true");
      form.append("eggIds", JSON.stringify(ADD_ONLY_EGG_IDS_LIST));
      const req = new Request("http://localhost:3000/api/harden", {
        method: "POST",
        body: form,
      });
      const res = await POST(req as never);
      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.error).toMatch(/dehydrated tokens only|client dehydration/);
      expect(Processor.process).not.toHaveBeenCalled();
    }, 15000);

    it("returns 400 when DOCX contains PII and request is not add-only (no preserveStyles)", async () => {
      (Processor.process as jest.Mock).mockClear();
      const piiText = "Email: user@example.com";
      const minimalDocxWithPii = await createDocumentWithText(piiText, MIME_DOCX);
      (vault.containsPii as jest.Mock).mockReturnValueOnce(true);
      const { extractText } = await import("@/engine/documentExtract");
      (extractText as jest.Mock).mockResolvedValueOnce(piiText);

      const form = await buildDocxFormData(minimalDocxWithPii, "resume.docx");
      form.append("eggIds", JSON.stringify(ADD_ONLY_EGG_IDS_LIST));
      const req = new Request("http://localhost:3000/api/harden", {
        method: "POST",
        body: form,
      });
      const res = await POST(req as never);
      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.error).toBe(
        "Server expected dehydrated tokens only; client dehydration may have failed. No document was produced or stored."
      );
      expect(Processor.process).not.toHaveBeenCalled();
    }, 15000);

    it("returns 400 when DOCX contains PII and request has non-add-only egg", async () => {
      (Processor.process as jest.Mock).mockClear();
      const piiText = "Email: user@example.com";
      const minimalDocxWithPii = await createDocumentWithText(piiText, MIME_DOCX);
      (vault.containsPii as jest.Mock).mockReturnValueOnce(true);
      const { extractText } = await import("@/engine/documentExtract");
      (extractText as jest.Mock).mockResolvedValueOnce(piiText);

      const form = await buildDocxFormData(minimalDocxWithPii, "resume.docx");
      form.append("preserveStyles", "true");
      form.append("eggIds", JSON.stringify(["invisible-hand", "canary-wing", "llm-trap"]));
      const req = new Request("http://localhost:3000/api/harden", {
        method: "POST",
        body: form,
      });
      const res = await POST(req as never);
      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.error).toMatch(/dehydrated tokens only|client dehydration/);
      expect(Processor.process).not.toHaveBeenCalled();
    }, 15000);
  });
});
