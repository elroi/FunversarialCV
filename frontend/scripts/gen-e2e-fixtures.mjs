/**
 * Generates minimal PDF and DOCX fixtures for E2E.
 * Uses same approach as engine/documentExtract (pdf-lib, docx) so fixtures are valid.
 * Run from frontend: node scripts/gen-e2e-fixtures.mjs
 */
import { writeFileSync, mkdirSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import { Document, Packer, Paragraph, TextRun } from "docx";

const __dirname = dirname(fileURLToPath(import.meta.url));
const outDir = join(__dirname, "..", "e2e", "fixtures");

async function main() {
  mkdirSync(outDir, { recursive: true });

  // Minimal PDF (same logic as documentExtract.createDocumentWithText)
  const pdfDoc = await PDFDocument.create();
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const page = pdfDoc.addPage([595, 842]);
  page.drawText("Resume", {
    x: 40,
    y: 802,
    size: 11,
    font,
    color: rgb(0, 0, 0),
  });
  const pdfBytes = await pdfDoc.save();
  writeFileSync(join(outDir, "minimal.pdf"), Buffer.from(pdfBytes));
  console.log("Wrote e2e/fixtures/minimal.pdf");

  // PDF with PII (for client dehydration E2E: payload must have tokens, not raw PII)
  const piiPdf = await PDFDocument.create();
  const piiFont = await piiPdf.embedFont(StandardFonts.Helvetica);
  const piiPage = piiPdf.addPage([595, 842]);
  const piiLines = [
    "Name: Test User",
    "Email: user@example.com",
    "Phone: (415) 555-1234",
    "Address: 123 Main Street",
  ];
  let piiY = 802;
  for (const line of piiLines) {
    piiPage.drawText(line, { x: 40, y: piiY, size: 11, font: piiFont, color: rgb(0, 0, 0) });
    piiY -= 18;
  }
  const piiPdfBytes = await piiPdf.save();
  writeFileSync(join(outDir, "pii-sample.pdf"), Buffer.from(piiPdfBytes));
  console.log("Wrote e2e/fixtures/pii-sample.pdf");

  // Minimal DOCX
  const doc = new Document({
    sections: [
      {
        children: [
          new Paragraph({ children: [new TextRun({ text: "Resume content" })] }),
        ],
      },
    ],
  });
  const docxBuf = await Packer.toBuffer(doc);
  writeFileSync(join(outDir, "minimal.docx"), Buffer.from(docxBuf));
  console.log("Wrote e2e/fixtures/minimal.docx");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
