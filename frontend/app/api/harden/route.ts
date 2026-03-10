/**
 * Harden API: POST /api/harden
 * Stateless — no files stored; buffer and PII live only for the request.
 */

import { NextRequest } from "next/server";
import { MAX_BODY_BYTES } from "./constants";
import { checkRateLimit } from "@/lib/rateLimit";
import { logInfo, logError } from "@/lib/log";

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
  const file = formData.get("file");
  if (!file || !(file instanceof File)) {
    return Response.json(
      { error: "Missing or invalid file. Upload a single PDF or DOCX." },
      { status: 400 }
    );
  }
  const buffer = Buffer.from(await file.arrayBuffer());
  if (buffer.length > MAX_BODY_BYTES) {
    return Response.json(
      { error: "File too large. Max size is 4 MB." },
      { status: 413 }
    );
  }
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
  } = await import("@/engine/documentExtract");

  const mimeType = detectDocumentType(buffer);
  if (!mimeType) {
    return Response.json(
      {
        error:
          "Unsupported or invalid document: file must be a valid PDF or DOCX.",
      },
      { status: 400 }
    );
  }

  const ext = file.name.toLowerCase();
  if (
    (mimeType === MIME_PDF && !ext.endsWith(".pdf")) ||
    (mimeType === MIME_DOCX && !ext.endsWith(".docx"))
  ) {
    return Response.json(
      { error: "File content does not match extension." },
      { status: 400 }
    );
  }

  const knownIds = new Set(AVAILABLE_EGGS.map((e) => e.id));
  const filteredPayloads: Record<string, string> = {};
  for (const [id, value] of Object.entries(payloads)) {
    if (knownIds.has(id)) filteredPayloads[id] = value;
  }

  const eggs =
    eggIds && eggIds.length > 0
      ? AVAILABLE_EGGS.filter((e) => eggIds!.includes(e.id))
      : AVAILABLE_EGGS;
  const payloadsForEggs: Record<string, string> = {};
  for (const e of eggs) {
    if (filteredPayloads[e.id] !== undefined) {
      payloadsForEggs[e.id] = filteredPayloads[e.id];
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
      originalName: file.name,
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
        { error: name === "InvalidPDFException" ? "Unsupported or invalid document: file must be a valid PDF or DOCX." : message },
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
