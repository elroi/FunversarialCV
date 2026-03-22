import { NextRequest } from "next/server";
import {
  buildStyledDemoCvDocx,
  buildUncompressedDemoCvPdf,
} from "@/lib/demoCvBuilders";
import { MIME_DOCX, MIME_PDF, detectDocumentType } from "@/engine/documentExtract";

type Variant = "clean" | "dirty";
type Format = "pdf" | "docx";

function parseVariant(input: string | null): Variant {
  return input === "dirty" ? "dirty" : "clean";
}

function parseFormat(input: string | null): Format {
  return input === "docx" ? "docx" : "pdf";
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const variant = parseVariant(searchParams.get("variant"));
    const format = parseFormat(searchParams.get("format"));

    const mimeType = format === "docx" ? MIME_DOCX : MIME_PDF;
    const buffer =
      format === "docx"
        ? await buildStyledDemoCvDocx(variant)
        : buildUncompressedDemoCvPdf(variant);
    if (!buffer || buffer.length === 0) {
      return Response.json(
        { error: "Failed to generate demo CV document." },
        { status: 500 }
      );
    }
    const detected = detectDocumentType(buffer);
    if (!detected || detected !== mimeType) {
      return Response.json(
        { error: "Failed to generate demo CV document." },
        { status: 500 }
      );
    }

    const originalName =
      format === "docx"
        ? `FunversarialCV Demo – Senior Security Architect (${variant}).docx`
        : `FunversarialCV Demo – Senior Security Architect (${variant}).pdf`;

    return Response.json({
      bufferBase64: buffer.toString("base64"),
      mimeType,
      variant,
      originalName,
    });
  } catch (err) {
    console.error("[demo-cv] GET failed:", err);
    return Response.json(
      { error: "Failed to generate demo CV document." },
      { status: 500 }
    );
  }
}

