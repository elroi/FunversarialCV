/**
 * Heuristic checks on a PDF produced from golden research DOCX (e.g. via LibreOffice).
 * Run from frontend/: node scripts/check-research-pdf-eggs.mjs /path/to/output.pdf
 */
import { readFileSync } from "fs";
import pdfParse from "pdf-parse";
import { PDFDocument } from "pdf-lib";

const pdfPath = process.argv[2];
if (!pdfPath) {
  console.error("Usage: node scripts/check-research-pdf-eggs.mjs <file.pdf>");
  process.exit(1);
}

const buf = readFileSync(pdfPath);

const checks = {
  invisibleHandTrap: /STYLED_PDF_RESEARCH_TRAP_PHRASE/,
  canaryUrl: /example\.com\/api\/canary|docx-hidden/i,
  mailto: /mailto:/i,
  bodyFixtureText: /Golden minimal|Research Candidate/i,
};

async function main() {
  let text = "";
  try {
    const parsed = await pdfParse(buf);
    text = parsed.text || "";
    console.log("--- pdf-parse text layer (excerpt) ---");
    console.log(text.slice(0, 800));
  } catch (e) {
    console.warn(
      "--- pdf-parse failed (some pdf-lib-only PDFs); skipping text-layer checks ---",
      e.message || e
    );
  }

  console.log("--- text-layer checks ---");
  for (const [name, re] of Object.entries(checks)) {
    const ok = text ? re.test(text) : false;
    console.log(
      `${text ? (ok ? "PASS" : "FAIL") : "SKIP"}  ${name}`
    );
  }

  const doc = await PDFDocument.load(buf, { ignoreEncryption: true });
  const kw = doc.getKeywords();
  console.log("--- pdf-lib keywords (metadata-shadow) ---");
  console.log(kw || "(empty)");
  const metaOk = /ResearchFixture|golden_v1/i.test(kw || "");
  console.log(`${metaOk ? "PASS" : "FAIL"}  metadata keywords contain ResearchFixture/golden_v1`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
