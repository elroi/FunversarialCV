/**
 * One-time generation: fetches demo CV from the running API, decodes base64
 * to binary, and writes real .pdf / .docx files to disk for inspection.
 *
 * Prerequisite: start the dev server (npm run dev), then run:
 *   node scripts/gen-demo-cv-once.mjs
 *
 * Output: frontend/demo-output/demo-{clean|dirty}.{pdf|docx} (real documents).
 */
import { writeFileSync, mkdirSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const outDir = join(__dirname, "..", "demo-output");
const baseUrl = process.env.DEMO_CV_BASE_URL || "http://localhost:3000";

const variants = ["clean", "dirty"];
const formats = [
  { format: "pdf", ext: "pdf" },
  { format: "docx", ext: "docx" },
];

async function fetchAndWrite(variant, { format, ext }) {
  const url = `${baseUrl}/api/demo-cv?variant=${variant}&format=${format}`;
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`GET ${url} returned ${res.status}. Is the dev server running (npm run dev)?`);
  }
  const data = await res.json();
  const bufferBase64 = data?.bufferBase64;
  if (typeof bufferBase64 !== "string") {
    throw new Error(`Invalid response from ${url}: missing bufferBase64`);
  }
  const buffer = Buffer.from(bufferBase64, "base64");
  const filename = `demo-${variant}.${ext}`;
  const path = join(outDir, filename);
  writeFileSync(path, buffer);
  console.log(`Wrote ${path}`);
}

async function main() {
  mkdirSync(outDir, { recursive: true });
  for (const variant of variants) {
    for (const f of formats) {
      await fetchAndWrite(variant, f);
    }
  }
  console.log("Done. Open the files in demo-output/ as normal PDF/DOCX documents.");
}

main().catch((err) => {
  console.error(err.message || err);
  process.exit(1);
});
