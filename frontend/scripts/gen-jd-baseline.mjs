/**
 * Generates synthetic job-description baselines for manual and automated comparison
 * (clean CV vs injected CV vs JD). Writes:
 * - e2e/fixtures/jd-baseline.docx + jd-baseline.txt (committed)
 * - demo-output copies (or JD_BASELINE_DEMO_DIR when set) for local side-by-side review
 *
 * Run from frontend: npm run gen:jd-baseline
 */
import { writeFileSync, mkdirSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { Document, Packer, Paragraph, TextRun, HeadingLevel } from "docx";

const __dirname = dirname(fileURLToPath(import.meta.url));
const frontendRoot = join(__dirname, "..");
const fixturesDir = join(frontendRoot, "e2e", "fixtures");
const demoDir =
  process.env.JD_BASELINE_DEMO_DIR?.trim() ||
  join(frontendRoot, "demo-output");

/** Plain-text JD (source of truth for fixture shape checks). */
const JD_BASELINE_TEXT = `FunversarialCV Baseline Job Description (Synthetic Fixture)

Role: Staff Security Architect — Document & LLM Pipeline Resilience
Location: Remote-first (fixture text only; not a real opening)
Employment type: Full-time (illustrative)

Summary
We are documenting a repeatable baseline role description for side-by-side review: compare a clean candidate CV, the same CV after egg injection, and this job description. This file contains no real company data and is safe to commit.

Responsibilities
- Design stateless, zero-retention document processing flows for sensitive resumes.
- Model adversarial but ethical test cases aligned with OWASP LLM Application risks.
- Partner with hiring teams to interpret parser-only vs human-visible document differences.

Requirements
- Strong understanding of prompt-injection and insecure output handling in document pipelines.
- Experience with DOCX structure, metadata, and hyperlink surfaces (not macros).
- Comfort explaining security trade-offs to HR and engineering audiences.

Nice to have
- Background in red teaming or application security architecture.
- Familiarity with canary tokens and integrity signaling in distributed systems.

How to use this fixture
1. Keep jd-baseline.docx / jd-baseline.txt next to your test CV exports.
2. After running FunversarialCV hardening, diff extracted text or metadata against this baseline only as a mental anchor for "expected role context," not as automated scoring.
`;

function paragraphsFromText(text) {
  const lines = text.split("\n");
  return lines.map(
    (line) =>
      new Paragraph({
        children: [
          new TextRun({
            text: line.length > 0 ? line : " ",
          }),
        ],
      })
  );
}

async function main() {
  mkdirSync(fixturesDir, { recursive: true });
  mkdirSync(demoDir, { recursive: true });

  const title = new Paragraph({
    heading: HeadingLevel.TITLE,
    children: [new TextRun({ text: "Baseline Job Description (Fixture)" })],
  });
  const body = paragraphsFromText(JD_BASELINE_TEXT);

  const doc = new Document({
    sections: [
      {
        children: [title, ...body],
      },
    ],
  });

  const buf = await Packer.toBuffer(doc);
  const docxBytes = Buffer.from(buf);

  const fixtureDocx = join(fixturesDir, "jd-baseline.docx");
  const fixtureTxt = join(fixturesDir, "jd-baseline.txt");
  const demoDocx = join(demoDir, "jd-baseline.docx");
  const demoTxt = join(demoDir, "jd-baseline.txt");

  writeFileSync(fixtureDocx, docxBytes);
  writeFileSync(fixtureTxt, JD_BASELINE_TEXT, "utf8");
  writeFileSync(demoDocx, docxBytes);
  writeFileSync(demoTxt, JD_BASELINE_TEXT, "utf8");

  console.log(`Wrote ${fixtureDocx}`);
  console.log(`Wrote ${fixtureTxt}`);
  console.log(`Wrote ${demoDocx}`);
  console.log(`Wrote ${demoTxt}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
