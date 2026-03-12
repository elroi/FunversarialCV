/**
 * Document extraction and creation helpers for PDF and DOCX.
 * Used by the Processor to get/set text without persisting files (stateless).
 * Uses low-level parsers only — no macro or script execution.
 */

import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import { Document, Packer, Paragraph, TextRun } from "docx";

// Lazy-loaded to avoid pulling in Node-only deps at module load (Next.js client bundle).
let pdfParse: ((buf: Buffer) => Promise<{ text: string }>) | null = null;
let WordExtractor: (new () => { extract: (buf: Buffer) => Promise<{ getBody: () => string }> }) | null = null;

async function getPdfParse(): Promise<(buf: Buffer) => Promise<{ text: string }>> {
  if (!pdfParse) {
    const mod = await import("pdf-parse");
    const fn = (mod as { default?: (b: Buffer) => Promise<{ text: string }> }).default ?? mod;
    pdfParse = typeof fn === "function" ? fn : () => Promise.resolve({ text: "" });
  }
  return pdfParse as (buf: Buffer) => Promise<{ text: string }>;
}

async function getWordExtractor(): Promise<
  (buf: Buffer) => Promise<{ getBody: () => string }>
> {
  type ExtractorClass = new () => { extract: (buf: Buffer) => Promise<{ getBody: () => string }> };
  if (!WordExtractor) {
    const mod = await import("word-extractor") as unknown as { default?: ExtractorClass } & ExtractorClass;
    WordExtractor = typeof mod.default === "function" ? mod.default : mod;
  }
  const Extractor = WordExtractor!;
  return (buf: Buffer) => new Extractor().extract(buf) as Promise<{ getBody: () => string }>;
}

export const MIME_PDF = "application/pdf";
export const MIME_DOCX =
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document";

/** Page and layout constants for PDF created by createDocumentWithText (must match usage below). */
const PDF_FONT_SIZE = 11;
const PDF_LINE_HEIGHT = PDF_FONT_SIZE * 1.3;
const PDF_MARGIN = 40;
const PDF_PAGE_WIDTH = 595;
const PDF_PAGE_HEIGHT = 842;
const PDF_CONTENT_WIDTH = PDF_PAGE_WIDTH - 2 * PDF_MARGIN;
// Leave extra breathing room on the right to avoid any visual clipping
const PDF_CONTENT_SAFE_WIDTH = PDF_CONTENT_WIDTH * 0.9;

/**
 * Wraps a single line of text into multiple lines that fit within maxWidth when rendered with the given font and size.
 * Returns an array of strings to draw (each fits on one line).
 */
function wrapLine(
  line: string,
  maxWidth: number,
  font: { widthOfTextAtSize: (text: string, size: number) => number },
  fontSize: number
): string[] {
  if (!line.trim()) return [line || " "];
  const result: string[] = [];
  const words = line.split(/\s+/);
  let current = "";
  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word;
    const w = font.widthOfTextAtSize(candidate, fontSize);
    if (w <= maxWidth) {
      current = candidate;
    } else {
      if (current) result.push(current);
      // Single word longer than maxWidth: put on its own line (may overflow but won't hang).
      current = word;
    }
  }
  if (current) result.push(current);
  return result;
}

export type SupportedMimeType = typeof MIME_PDF | typeof MIME_DOCX;

/**
 * Extracts plain text from a PDF or DOCX buffer.
 * Security: No execution of document macros or scripts.
 */
export async function extractText(
  buffer: Buffer,
  mimeType: string
): Promise<string> {
  if (mimeType === MIME_PDF) {
    const pdf = await getPdfParse();
    const result = await pdf(buffer);
    return result?.text ?? "";
  }
  if (mimeType === MIME_DOCX) {
    const extract = await getWordExtractor();
    const doc = await extract(buffer);
    return doc.getBody?.() ?? "";
  }
  throw new Error(`Unsupported document type: ${mimeType}`);
}

/**
 * Creates a new document buffer containing only the given text.
 * Used to pass dehydrated (or rehydrated) content through the pipeline.
 * PDF: single page with the text; DOCX: paragraphs split by newline.
 */
export async function createDocumentWithText(
  text: string,
  mimeType: string
): Promise<Buffer> {
  if (mimeType === MIME_PDF) {
    const doc = await PDFDocument.create();
    const font = await doc.embedFont(StandardFonts.Helvetica);
    const lines = text.split(/\r?\n/);
    let currentPage = doc.addPage();
    let y = PDF_PAGE_HEIGHT - PDF_MARGIN;
    for (const line of lines) {
      const wrapped = wrapLine(line, PDF_CONTENT_SAFE_WIDTH, font, PDF_FONT_SIZE);
      for (const toDraw of wrapped) {
        if (y - PDF_LINE_HEIGHT < PDF_MARGIN) {
          currentPage = doc.addPage();
          y = PDF_PAGE_HEIGHT - PDF_MARGIN;
        }
        currentPage.drawText(toDraw || " ", {
          x: PDF_MARGIN,
          y,
          size: PDF_FONT_SIZE,
          font,
          color: rgb(0, 0, 0),
        });
        y -= PDF_LINE_HEIGHT;
      }
    }
    const pdfBytes = await doc.save();
    return Buffer.from(pdfBytes);
  }
  if (mimeType === MIME_DOCX) {
    const paragraphs = text.split(/\r?\n/).map(
      (line) =>
        new Paragraph({
          children: [new TextRun({ text: line || " " })],
        })
    );
    const doc = new Document({
      sections: [{ children: paragraphs.length ? paragraphs : [new Paragraph({ children: [new TextRun({ text: " " })] })] }],
    });
    const blob = await Packer.toBuffer(doc);
    return Buffer.from(blob);
  }
  throw new Error(`Unsupported document type: ${mimeType}`);
}

export function isSupportedMimeType(mime: string): mime is SupportedMimeType {
  return mime === MIME_PDF || mime === MIME_DOCX;
}

/**
 * Detects document type from in-file magic bytes (not from filename or Content-Type).
 * PDF: %PDF (0x25, 0x50, 0x44, 0x46); DOCX: PK (ZIP, 0x50, 0x4b).
 */
export function detectDocumentType(buffer: Buffer): SupportedMimeType | null {
  if (!buffer || buffer.length < 2) return null;
  if (
    buffer.length >= 4 &&
    buffer[0] === 0x25 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x44 &&
    buffer[3] === 0x46
  ) {
    return MIME_PDF;
  }
  if (buffer[0] === 0x50 && buffer[1] === 0x4b) {
    return MIME_DOCX;
  }
  return null;
}
