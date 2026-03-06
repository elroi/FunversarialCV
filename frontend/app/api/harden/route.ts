/**
 * Harden API: POST /api/harden
 * Stateless — no files stored; buffer and PII live only for the request.
 */

import { NextRequest } from "next/server";

export async function POST(request: NextRequest) {
  const formData = await request.formData();
  const file = formData.get("file");
  if (!file || !(file instanceof File)) {
    return Response.json(
      { error: "Missing or invalid file. Upload a single PDF or DOCX." },
      { status: 400 }
    );
  }
  const buffer = Buffer.from(await file.arrayBuffer());
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

  const { process } = await import("@/engine/Processor");
  const { AVAILABLE_EGGS } = await import("@/eggs/registry");
  const {
    detectDocumentType,
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

  try {
    const result = await process({
      buffer,
      mimeType,
      eggs,
      payloads: payloadsForEggs,
    });
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
    console.error("[POST /api/harden]", err);
    return Response.json(
      { error: "Processing failed. Please try again." },
      { status: 500 }
    );
  }
}
