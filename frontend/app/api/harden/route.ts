/**
 * Harden API: POST /api/harden
 * Stateless — no files stored; buffer and PII live only for the request.
 */

import { NextRequest } from "next/server";
import { MAX_BODY_BYTES } from "./constants";
import { containsPii } from "@/lib/vault";
import { checkRateLimit } from "@/lib/rateLimit";
import { logInfo, logError } from "@/lib/log";
import { ADD_ONLY_EGG_IDS } from "@/engine/Processor";

function getClientIp(req: NextRequest): string {
  const xff = req.headers.get("x-forwarded-for");
  if (xff) {
    const first = xff.split(",")[0]?.trim();
    if (first) return first;
  }
  return req.ip ?? "unknown";
}

export async function POST(request: NextRequest) {
  const ip = getClientIp(request);
  const rate = checkRateLimit("harden", ip);
  if (!rate.allowed) {
    logInfo("/api/harden", "rate_limit_denied", {
      ip,
      retryAfterSeconds: rate.retryAfterSeconds,
    });
    return Response.json(
      {
        error:
          "Too many harden requests from this client. Please wait a moment and try again.",
      },
      {
        status: 429,
        headers: rate.retryAfterSeconds
          ? { "Retry-After": String(rate.retryAfterSeconds) }
          : undefined,
      }
    );
  }

  const formData = await request.formData();
  const tokenizedTextRaw = formData.get("tokenizedText");
  const originalMimeTypeRaw = formData.get("originalMimeType");
  const isTextMode =
    typeof tokenizedTextRaw === "string" &&
    typeof originalMimeTypeRaw === "string";

  const file = formData.get("file");
  const payloadsRaw = formData.get("payloads");
  let payloads: Record<string, string> = {};
  if (payloadsRaw && typeof payloadsRaw === "string") {
    try {
      payloads = JSON.parse(payloadsRaw) as Record<string, string>;
    } catch {
      return Response.json(
        { error: "Invalid payloads JSON." },
        { status: 400 }
      );
    }
  }

  const eggIdsRaw = formData.get("eggIds");
  let eggIds: string[] | null = null;
  if (eggIdsRaw && typeof eggIdsRaw === "string") {
    try {
      const parsed = JSON.parse(eggIdsRaw) as unknown;
      if (Array.isArray(parsed) && parsed.every((x) => typeof x === "string")) {
        eggIds = parsed as string[];
      }
    } catch {
      // ignore invalid eggIds; run all eggs
    }
  }

  const preserveStylesRaw = formData.get("preserveStyles");
  const preserveStyles =
    preserveStylesRaw === "true" || preserveStylesRaw === "1";

  const { process } = await import("@/engine/Processor");
  const { AVAILABLE_EGGS } = await import("@/eggs/registry");
  const {
    detectDocumentType,
    MIME_PDF,
    MIME_DOCX,
    extractText,
    createDocumentWithText,
  } = await import("@/engine/documentExtract");

  let buffer: Buffer;
  let mimeType: string;
  let originalName: string;

  if (isTextMode) {
    const tokenizedText = tokenizedTextRaw as string;
    const originalMimeType = originalMimeTypeRaw as string;

    if (originalMimeType !== MIME_PDF && originalMimeType !== MIME_DOCX) {
      return Response.json(
        { error: "Unsupported originalMimeType for tokenized text mode." },
        { status: 400 }
      );
    }

    // PII-guard for tokenized text: reject if obvious PII is still present.
    if (tokenizedText && containsPii(tokenizedText)) {
      logInfo("/api/harden", "pii_guard_rejected", {
        mimeType: originalMimeType,
        ip,
        mode: "text",
      });
      return Response.json(
        {
          error:
            "Server expected dehydrated tokens only; client dehydration may have failed. No document was hardened or stored.",
        },
        { status: 400 }
      );
    }

    const created = await createDocumentWithText(
      tokenizedText,
      originalMimeType
    );
    buffer = created;
    mimeType = originalMimeType;
    const originalNameFromForm = formData.get("originalName");
    originalName =
      typeof originalNameFromForm === "string" && originalNameFromForm
        ? originalNameFromForm
        : originalMimeType === MIME_PDF
        ? "document.pdf"
        : "document.docx";
  } else {
    if (!file || !(file instanceof File)) {
      return Response.json(
        { error: "Missing or invalid file. Upload a single Word document (.docx)." },
        { status: 400 }
      );
    }
    const rawBuffer = Buffer.from(await file.arrayBuffer());
    if (rawBuffer.length > MAX_BODY_BYTES) {
      return Response.json(
        { error: "File too large. Max size is 4 MB." },
        { status: 413 }
      );
    }

    const detectedMimeType = detectDocumentType(rawBuffer);
    if (detectedMimeType === MIME_PDF) {
      return Response.json(
        {
          error:
            "We currently support Word documents (.docx) only. PDF support is planned for a future release.",
        },
        { status: 400 }
      );
    }
    if (!detectedMimeType) {
      const detail =
        rawBuffer.length === 0
          ? "Document is empty. Please upload a valid Word document (.docx)."
          : "Unsupported or invalid document: file must be a valid Word document (.docx).";
      return Response.json({ error: detail }, { status: 400 });
    }

    const ext = file.name.toLowerCase();
    if (!ext.endsWith(".docx")) {
      return Response.json(
        { error: "File content does not match extension." },
        { status: 400 }
      );
    }

    // DOCX-only: no add-only skip (was PDF-only). PII guard always runs for binary uploads.
    const isAddOnlyRequest = false;

    if (!isAddOnlyRequest) {
      // PII-guard: reject documents that still contain obvious PII.
      try {
        const text = await extractText(rawBuffer, detectedMimeType);
        if (text && containsPii(text)) {
          logInfo("/api/harden", "pii_guard_rejected", {
            mimeType: detectedMimeType,
            ip,
            mode: "binary",
          });
          return Response.json(
            {
              error:
                "Server expected dehydrated tokens only; client dehydration may have failed. No document was hardened or stored.",
            },
            { status: 400 }
          );
        }
      } catch {
        // If text extraction fails, skip PII-guard rather than breaking valid requests.
      }
    }

    buffer = rawBuffer;
    mimeType = detectedMimeType;
    originalName = file.name;
  }

  const knownIds = new Set(AVAILABLE_EGGS.map((e) => e.id));
  const filteredPayloads: Record<string, string> = {};
  for (const [id, value] of Object.entries(payloads)) {
    if (knownIds.has(id)) filteredPayloads[id] = value;
  }

  // When client sends eggIds: [] (no eggs selected), run none; when missing/invalid, default to all.
  const eggs =
    eggIds === null
      ? AVAILABLE_EGGS
      : AVAILABLE_EGGS.filter((e) => eggIds.includes(e.id));
  const payloadsForEggs: Record<string, string> = {};
  for (const e of eggs) {
    if (filteredPayloads[e.id] !== undefined) {
      payloadsForEggs[e.id] = filteredPayloads[e.id];
    }
  }

  // If canary-wing runs with no token, generate one here and inject so we can return it to the client
  // (the card needs the token for "Check for triggers"); the egg would otherwise generate its own and the client wouldn't know it.
  let canaryTokenUsed: string | undefined;
  if (payloadsForEggs["canary-wing"]) {
    try {
      const parsed = JSON.parse(payloadsForEggs["canary-wing"]) as Record<string, unknown>;
      const token = parsed?.token;
      if (token === undefined || token === null || String(token).trim() === "") {
        const uuid = typeof crypto !== "undefined" && crypto.randomUUID
          ? crypto.randomUUID()
          : (await import("crypto")).randomUUID();
        canaryTokenUsed = uuid;
        payloadsForEggs["canary-wing"] = JSON.stringify({ ...parsed, token: uuid });
      }
    } catch {
      // leave payload as-is
    }
  }

  // #region agent log
  fetch("http://127.0.0.1:7449/ingest/0768c635-2444-40d4-9a51-16892d6a03ff", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Debug-Session-Id": "1e3930",
    },
    body: JSON.stringify({
      sessionId: "1e3930",
      runId: "incident-mailto-docx",
      hypothesisId: "H1",
      location: "app/api/harden/route.ts:135",
      message: "Selected eggs for /api/harden",
      data: {
        eggIds: eggs.map((e) => e.id),
        preserveStyles,
        mimeType,
      },
      timestamp: Date.now(),
    }),
  }).catch(() => {});
  // #endregion agent log

  try {
    const result = await process({
      buffer,
      mimeType,
      eggs,
      payloads: payloadsForEggs,
      preserveStyles,
    });
    logInfo("/api/harden", "success", { mimeType });
    return Response.json({
      bufferBase64: result.buffer.toString("base64"),
      mimeType,
      scannerReport: result.scannerReport,
      originalName,
      ...(canaryTokenUsed !== undefined ? { canaryTokenUsed } : {}),
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Processing failed.";
    const name = err instanceof Error ? err.name : "";
    if (
      message.includes("Unsupported") ||
      message.includes("rejected payload") ||
      name === "InvalidPDFException"
    ) {
      return Response.json(
        { error: name === "InvalidPDFException" ? "Unsupported or invalid document: file must be a valid Word document (.docx)." : message },
        { status: 400 }
      );
    }
    logError("/api/harden", "unhandled_error", message);
    return Response.json(
      { error: "Processing failed. Please try again." },
      { status: 500 }
    );
  }
}
