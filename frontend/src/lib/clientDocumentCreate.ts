/**
 * Browser-side document creation from plain text.
 * Used to rebuild PDF/DOCX after rehydrating tokens → PII in the client.
 * Uses pdf-lib and docx only (no Node-only deps).
 */

import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import { Document, Packer, Paragraph, TextRun } from "docx";
import { MIME_PDF, MIME_DOCX } from "./clientDocumentExtract";

const PDF_FONT_SIZE = 11;
const PDF_LINE_HEIGHT = PDF_FONT_SIZE * 1.3;
const PDF_MARGIN = 40;
const PDF_PAGE_HEIGHT = 842;
const PDF_CONTENT_SAFE_WIDTH = (595 - 2 * PDF_MARGIN) * 0.9;

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
      current = word;
    }
  }
  if (current) result.push(current);
  return result;
}

/**
 * Creates a PDF or DOCX buffer from plain text in the browser.
 * Layout: PDF = wrapped lines; DOCX = one paragraph per line.
 */
export async function createDocumentWithTextInBrowser(
  text: string,
  mimeType: string
): Promise<ArrayBuffer> {
  if (mimeType === MIME_PDF) {
    const doc = await PDFDocument.create();
    const font = await doc.embedFont(StandardFonts.Helvetica);
    const lines = text.split(/\r?\n/);
    let currentPage = doc.addPage();
    let y = PDF_PAGE_HEIGHT - PDF_MARGIN;
    for (const line of lines) {
      const wrapped = wrapLine(
        line,
        PDF_CONTENT_SAFE_WIDTH,
        font,
        PDF_FONT_SIZE
      );
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
    return pdfBytes.buffer.slice(
      pdfBytes.byteOffset,
      pdfBytes.byteOffset + pdfBytes.byteLength
    );
  }
  if (mimeType === MIME_DOCX) {
    const paragraphs = text.split(/\r?\n/).map(
      (line) =>
        new Paragraph({
          children: [new TextRun({ text: line || " " })],
        })
    );
    const doc = new Document({
      sections: [
        {
          children:
            paragraphs.length > 0
              ? paragraphs
              : [new Paragraph({ children: [new TextRun({ text: " " })] })],
        },
      ],
    });
    const blob = await Packer.toBlob(doc);
    return blob.arrayBuffer();
  }
  throw new Error(
    `createDocumentWithTextInBrowser: unsupported mimeType ${mimeType}`
  );
}
