/**
 * Pre-hardening defensive Scanner: Pattern Recognition Engine.
 * Detects existing adversarial layers (LLM01 prompt injection, LLM10 canaries, metadata stuffing)
 * before eggs are applied. Observational only — does not modify input or block processing.
 */

import { PDFDocument } from "pdf-lib";
import { MIME_PDF, MIME_DOCX } from "../engine/documentExtract";
import JSZip from "jszip";

export interface ScanInput {
  text: string;
  buffer: Buffer;
  mimeType: string;
}

/** Result shape compatible with DualityCheckResult for UI/Processor. */
export interface ScanResult {
  hasSuspiciousPatterns: boolean;
  matchedPatterns: string[];
  details?: string[];
}

/** Duality feedback: report returned alongside the output buffer when an existing adversarial layer is detected. */
export interface ScannerReport {
  /** Pre-hardening scan result. */
  scan: ScanResult;
  /** Alerts for the duality feedback loop; includes [DUALITY_ALERT] when existing injection/layer is found. */
  alerts: string[];
}

/** Message emitted when the scanner finds an existing adversarial layer (prompt injection, canary, or metadata stuffing). */
export const DUALITY_ALERT_MESSAGE = "[DUALITY_ALERT] Existing Adversarial Layer Detected.";

/**
 * Builds a ScannerReport from a ScanResult. When the scan found suspicious patterns, adds the duality alert.
 */
export function buildScannerReport(scan: ScanResult): ScannerReport {
  const alerts: string[] = scan.hasSuspiciousPatterns ? [DUALITY_ALERT_MESSAGE] : [];
  return { scan, alerts };
}

// —— Detection rules (OWASP LLM01-aligned). Single source of truth for patterns. ——
const LLM01_PATTERNS: Array<{ name: string; regex: RegExp }> = [
  { name: "ignore_previous_instructions", regex: /ignore\s+(?:all\s+)?(?:previous|above)\s+instructions?/gi },
  { name: "system_instruction", regex: /system\s*:\s*|<\s*system\s*>/gi },
  { name: "system_note", regex: /system\s+note\s*:/gi },
  { name: "priority_candidate", regex: /priority\s+candidate/gi },
  { name: "ranking_bias_top", regex: /top\s+candidate/gi },
  { name: "ranking_bias_must_hire", regex: /must\s+hire/gi },
  { name: "double_angle_bracket", regex: /<<[^>]+>>/g },
  { name: "invisible_unicode", regex: /[\u200B-\u200D\u2060\uFEFF]/g },
  { name: "jailbreak_style", regex: /(?:DAN|jailbreak|no\s+restrictions)/gi },
  { name: "role_override", regex: /you\s+are\s+now\s+|act\s+as\s+if\s+you/gi },
];

/** Configurable: own canary path and known third-party canary domains (LLM10). */
const CANARY_PATTERNS: Array<{ name: "existing_canary_url"; regex: RegExp }> = [
  { name: "existing_canary_url", regex: /\/api\/canary\/[^\s"'<>]+/g },
  { name: "existing_canary_url", regex: /https?:\/\/[^/\s]*canarytokens\.com\/[^\s"'<>]+/gi },
];

/** Suspect metadata property names (name-based; case-insensitive). */
const SUSPECT_METADATA_NAMES = ["Ranking", "Status", "Score", "Priority"];

function scanLLM01(text: string): { matchedPatterns: string[]; details: string[] } {
  const matchedPatterns: string[] = [];
  const details: string[] = [];
  const seen = new Set<string>();
  for (const { name, regex } of LLM01_PATTERNS) {
    const matches = text.match(regex);
    if (matches?.length && !seen.has(name)) {
      seen.add(name);
      matchedPatterns.push(name);
      details.push(`${name}: ${matches.length} match(es)`);
    }
  }
  return { matchedPatterns, details };
}

function scanCanary(text: string): { matchedPatterns: string[]; details: string[] } {
  const matchedPatterns: string[] = [];
  const details: string[] = [];
  let count = 0;
  let firstUrl: string | null = null;
  for (const { name, regex } of CANARY_PATTERNS) {
    const matches = text.match(regex);
    if (matches?.length) {
      count += matches.length;
      if (!firstUrl && matches[0]) firstUrl = matches[0].slice(0, 80);
    }
  }
  if (count > 0) {
    matchedPatterns.push("existing_canary_url");
    details.push(`existing_canary_url: ${count} match(es)${firstUrl ? ` — e.g. ${firstUrl}` : ""}`);
  }
  return { matchedPatterns, details };
}

async function scanMetadataPdf(buffer: Buffer): Promise<{ matchedPatterns: string[]; details: string[] }> {
  const matchedPatterns: string[] = [];
  const details: string[] = [];
  try {
    const doc = await PDFDocument.load(new Uint8Array(buffer), { ignoreEncryption: true });
    const toCheck: { field: string; value: string | undefined }[] = [
      { field: "Title", value: doc.getTitle() as string | undefined },
      { field: "Author", value: doc.getAuthor() as string | undefined },
      { field: "Subject", value: doc.getSubject() as string | undefined },
      { field: "Keywords", value: doc.getKeywords() as string | undefined },
    ];
    for (const { field: fieldName, value } of toCheck) {
      if (!value || typeof value !== "string") continue;
      const lower = value.toLowerCase();
      for (const suspect of SUSPECT_METADATA_NAMES) {
        if (lower.includes(suspect.toLowerCase())) {
          matchedPatterns.push(`metadata_${suspect.toLowerCase()}`);
          details.push(`metadata: standard field "${fieldName}" contains "${suspect}"`);
          break;
        }
      }
    }
  } catch {
    // Corrupt or invalid PDF: do not throw; return no metadata findings.
  }
  return { matchedPatterns, details };
}

async function scanMetadataDocx(buffer: Buffer): Promise<{ matchedPatterns: string[]; details: string[] }> {
  const matchedPatterns: string[] = [];
  const details: string[] = [];
  try {
    const zip = await JSZip.loadAsync(buffer);
    const customFile = zip.file("docProps/custom.xml");
    if (!customFile) return { matchedPatterns, details };
    const xml = await customFile.async("string");
    const nameMatches = xml.matchAll(/name\s*=\s*["']([^"']+)["']/gi);
    const names = [...nameMatches].map((m) => m[1]);
    for (const name of names) {
      for (const suspect of SUSPECT_METADATA_NAMES) {
        if (name.toLowerCase() === suspect.toLowerCase()) {
          matchedPatterns.push(`metadata_${suspect.toLowerCase()}`);
          details.push(`metadata: custom property "${name}" present`);
          break;
        }
      }
    }
  } catch {
    // Corrupt or invalid DOCX: do not throw; return no metadata findings.
  }
  return { matchedPatterns, details };
}

async function scanMetadata(buffer: Buffer, mimeType: string): Promise<{ matchedPatterns: string[]; details: string[] }> {
  if (buffer.length === 0) return { matchedPatterns: [], details: [] };
  if (mimeType === MIME_PDF) return scanMetadataPdf(buffer);
  if (mimeType === MIME_DOCX) return scanMetadataDocx(buffer);
  return { matchedPatterns: [], details: [] };
}

/**
 * Runs the full defensive scan: LLM01 patterns, LLM10 canary URLs, metadata stuffing.
 * Does not throw on metadata read failure; returns combined result.
 */
export async function runScan(input: ScanInput): Promise<ScanResult> {
  const { text, buffer, mimeType } = input;
  const allPatterns: string[] = [];
  const allDetails: string[] = [];

  const llm01 = scanLLM01(text);
  allPatterns.push(...llm01.matchedPatterns);
  allDetails.push(...llm01.details);

  const canary = scanCanary(text);
  allPatterns.push(...canary.matchedPatterns);
  allDetails.push(...canary.details);

  const meta = await scanMetadata(buffer, mimeType);
  allPatterns.push(...meta.matchedPatterns);
  allDetails.push(...meta.details);

  return {
    hasSuspiciousPatterns: allPatterns.length > 0,
    matchedPatterns: allPatterns,
    details: allDetails.length ? allDetails : undefined,
  };
}
