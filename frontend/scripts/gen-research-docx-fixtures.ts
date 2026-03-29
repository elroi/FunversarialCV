/**
 * Generates golden DOCX fixtures for styled-PDF / egg-retention research.
 * Applies all eggs via the same Processor pipeline used in production (preserveStyles).
 *
 * Run from frontend/: npm run gen:research-fixtures
 */
import { mkdirSync, writeFileSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";
import { Document, Packer, Paragraph, TextRun } from "docx";
import { process as runProcessor } from "../src/engine/Processor";
import { AVAILABLE_EGGS } from "../src/eggs/registry";
import { MIME_DOCX } from "../src/engine/documentExtract";

const __dirname = dirname(fileURLToPath(import.meta.url));
const outDir = join(__dirname, "..", "e2e", "fixtures", "research");

/** Synthetic payloads: no real PII; canary points at example.com only. */
const RESEARCH_PAYLOADS: Record<string, string> = {
  "invisible-hand": "STYLED_PDF_RESEARCH_TRAP_PHRASE",
  "incident-mailto": "",
  "canary-wing": JSON.stringify({
    baseUrl: "https://example.com/api/canary",
    token: "research-fixture-canary-token",
    docxHiddenText: true,
  }),
  "metadata-shadow": JSON.stringify({
    ResearchFixture: "golden_v1",
  }),
};

async function buildMinimalDocx(): Promise<Buffer> {
  const doc = new Document({
    sections: [
      {
        children: [
          new Paragraph({
            children: [
              new TextRun({
                text: "Golden minimal body for styled-PDF egg research.",
              }),
            ],
          }),
        ],
      },
    ],
  });
  return Buffer.from(await Packer.toBuffer(doc));
}

async function buildCvShapedDocx(): Promise<Buffer> {
  const doc = new Document({
    sections: [
      {
        children: [
          new Paragraph({
            children: [
              new TextRun({
                text: "Research Candidate",
                bold: true,
                size: 32,
              }),
            ],
          }),
          new Paragraph({
            children: [
              new TextRun({
                text: "Security Architect — Styled PDF research fixture",
                italics: true,
              }),
            ],
          }),
          new Paragraph({
            children: [new TextRun({ text: "" })],
          }),
          new Paragraph({
            children: [
              new TextRun({
                text: "Contact: research.candidate@example.com | +1 555 0100",
              }),
            ],
          }),
          new Paragraph({
            children: [new TextRun({ text: "" })],
          }),
          new Paragraph({
            children: [
              new TextRun({ text: "Experience", bold: true, size: 28 }),
            ],
          }),
          new Paragraph({
            children: [
              new TextRun({
                text: "• Built stateless document pipelines with zero retention.",
              }),
            ],
          }),
          new Paragraph({
            children: [
              new TextRun({
                text: "• Evaluated DOCX→PDF converters for layout and signal survival.",
              }),
            ],
          }),
          new Paragraph({
            children: [new TextRun({ text: "" })],
          }),
          new Paragraph({
            children: [
              new TextRun({ text: "Education", bold: true, size: 28 }),
            ],
          }),
          new Paragraph({
            children: [
              new TextRun({
                text: "M.Mus, B.A.Mus — placeholder for layout stress (music cred line).",
              }),
            ],
          }),
        ],
      },
    ],
  });
  return Buffer.from(await Packer.toBuffer(doc));
}

async function harden(buffer: Buffer, label: string): Promise<Buffer> {
  const result = await runProcessor({
    buffer,
    mimeType: MIME_DOCX,
    eggs: AVAILABLE_EGGS,
    payloads: RESEARCH_PAYLOADS,
    preserveStyles: true,
  });
  console.log(`Processed ${label}: ${result.buffer.length} bytes`);
  return result.buffer;
}

async function main() {
  mkdirSync(outDir, { recursive: true });

  const minimalRaw = await buildMinimalDocx();
  const minimalHardened = await harden(minimalRaw, "golden-minimal-all-eggs");
  writeFileSync(join(outDir, "golden-minimal-all-eggs.docx"), minimalHardened);

  const cvRaw = await buildCvShapedDocx();
  const cvHardened = await harden(cvRaw, "golden-cv-all-eggs");
  writeFileSync(join(outDir, "golden-cv-all-eggs.docx"), cvHardened);

  console.log(`Wrote fixtures under ${outDir}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
