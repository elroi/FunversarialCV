import type { PDFDocument } from "pdf-lib";

/**
 * pdf-parse bundles pdf.js 1.10, which cannot read pdf-lib's default object
 * streams. Saving one of those PDFs also leaves later parses in the same
 * process unable to read a normal file.
 */
export function savePdf(doc: PDFDocument): Promise<Uint8Array> {
  return doc.save({ useObjectStreams: false });
}
