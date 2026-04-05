/**
 * POST /api/lab/extract — deterministic DOCX extraction modes (stateless, rate-limited).
 * No LLM; no file persistence.
 */

import { NextRequest } from "next/server";
import { MAX_BODY_BYTES } from "../constants";
import { checkRateLimit } from "@/lib/rateLimit";
import { logInfo } from "@/lib/log";
import {
  detectDocumentType,
  MIME_DOCX,
  MIME_PDF,
} from "@/engine/documentExtract";
import { extractDocxForLab } from "@/engine/labExtract/extractDocxLab";

function getClientIp(req: NextRequest): string {
  const xff = req.headers.get("x-forwarded-for");
  if (xff) {
    const first = xff.split(",")[0]?.trim();
    if (first) return first;
  }
  return req.ip ?? "unknown";
}

function extensionMatchesContent(filename: string, isDocx: boolean): boolean {
  const lower = filename.toLowerCase();
  return isDocx ? lower.endsWith(".docx") : true;
}

export async function POST(request: NextRequest) {
  const ip = getClientIp(request);
  const rate = checkRateLimit("labExtract", ip);
  if (!rate.allowed) {
    logInfo("/api/lab/extract", "rate_limit_denied", {
      ip,
      retryAfterSeconds: rate.retryAfterSeconds,
    });
    return Response.json(
      {
        error:
          "Too many lab extraction requests from this client. Please wait and try again.",
      },
      {
        status: 429,
        headers: rate.retryAfterSeconds
          ? { "Retry-After": String(rate.retryAfterSeconds) }
          : undefined,
      }
    );
  }

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return Response.json({ error: "Invalid form data." }, { status: 400 });
  }

  const file = formData.get("file");
  if (!file || typeof file !== "object" || !(file instanceof Blob)) {
    return Response.json(
      {
        error:
          "Missing or invalid file. Upload a single Word document (.docx) for lab extraction.",
      },
      { status: 400 }
    );
  }

  const name =
    typeof (file as File).name === "string" ? (file as File).name : "upload.docx";
  const buf = Buffer.from(await file.arrayBuffer());

  if (buf.length > MAX_BODY_BYTES) {
    return Response.json(
      { error: "File too large. Max size is 4 MB." },
      { status: 413 }
    );
  }

  const detected = detectDocumentType(buf);
  if (detected === MIME_PDF) {
    return Response.json(
      {
        error:
          "PDF lab extraction is not available yet. Use a .docx file for the harness.",
      },
      { status: 400 }
    );
  }
  if (detected !== MIME_DOCX) {
    return Response.json(
      {
        error:
          "Unsupported or invalid document: lab extract requires a valid Word document (.docx).",
      },
      { status: 400 }
    );
  }

  if (!extensionMatchesContent(name, true)) {
    return Response.json(
      { error: "File content does not match extension." },
      { status: 400 }
    );
  }

  try {
    const result = await extractDocxForLab(buf);
    return Response.json(result);
  } catch (e) {
    logInfo("/api/lab/extract", "extract_failed", {
      message: e instanceof Error ? e.message : "unknown",
    });
    return Response.json(
      { error: "Lab extraction failed. Please try another document." },
      { status: 500 }
    );
  }
}
