/**
 * Lab harness: deterministic DOCX extraction modes for teaching ingestion vs model behavior.
 * Stateless — callers pass buffers only; no persistence.
 */
import mammoth from "mammoth";
import { extractText, MIME_DOCX } from "../documentExtract";
import { LAB_HARNESS_VERSION } from "./constants";
import type { LabExtractionModeId } from "./constants";
import { extractForensicWtConcatFromDocx } from "./forensicBody";
import { extractPackageMetadataFromDocx, type MetadataEntry } from "./packageMetadata";
import { extractHyperlinksFromDocx, type DocxHyperlinkRow } from "./hyperlinks";

export const LAB_EXTRACT_DOCX_MODE_VERSION = 1 as const;

export type LabTextModePayload = {
  modeId: "docx_forensic_body" | "server_word_extractor" | "server_mammoth_raw";
  version: typeof LAB_EXTRACT_DOCX_MODE_VERSION;
  text: string;
  warnings: string[];
};

export type LabMetadataModePayload = {
  modeId: "docx_package_metadata";
  version: typeof LAB_EXTRACT_DOCX_MODE_VERSION;
  entries: MetadataEntry[];
  warnings: string[];
};

export type LabHyperlinksModePayload = {
  modeId: "docx_hyperlinks";
  version: typeof LAB_EXTRACT_DOCX_MODE_VERSION;
  links: DocxHyperlinkRow[];
  warnings: string[];
};

export type LabDocxModeResult =
  | LabTextModePayload
  | LabMetadataModePayload
  | LabHyperlinksModePayload;

export interface LabDocxExtractResult {
  harnessVersion: string;
  modes: LabDocxModeResult[];
}

export async function extractDocxForLab(buffer: Buffer): Promise<LabDocxExtractResult> {
  const modes: LabDocxModeResult[] = [];

  const forensic = await extractForensicWtConcatFromDocx(buffer);
  modes.push({
    modeId: "docx_forensic_body",
    version: LAB_EXTRACT_DOCX_MODE_VERSION,
    text: forensic.text,
    warnings: forensic.warnings,
  });

  let wordWarnings: string[] = [];
  let wordText = "";
  try {
    wordText = await extractText(buffer, MIME_DOCX);
  } catch (e) {
    wordWarnings = [
      `word-extractor failed: ${e instanceof Error ? e.message : "unknown error"}`,
    ];
  }
  modes.push({
    modeId: "server_word_extractor",
    version: LAB_EXTRACT_DOCX_MODE_VERSION,
    text: wordText,
    warnings: wordWarnings,
  });

  let mammothWarnings: string[] = [];
  let mammothText = "";
  try {
    const result = await mammoth.extractRawText({ buffer });
    mammothText = result.value ?? "";
    if (result.messages?.length) {
      mammothWarnings = result.messages.map((m) => m.message).slice(0, 5);
    }
  } catch (e) {
    mammothWarnings = [
      `mammoth failed: ${e instanceof Error ? e.message : "unknown error"}`,
    ];
  }
  modes.push({
    modeId: "server_mammoth_raw",
    version: LAB_EXTRACT_DOCX_MODE_VERSION,
    text: mammothText,
    warnings: mammothWarnings,
  });

  const meta = await extractPackageMetadataFromDocx(buffer);
  modes.push({
    modeId: "docx_package_metadata",
    version: LAB_EXTRACT_DOCX_MODE_VERSION,
    entries: meta.entries,
    warnings: meta.warnings,
  });

  const links = await extractHyperlinksFromDocx(buffer);
  modes.push({
    modeId: "docx_hyperlinks",
    version: LAB_EXTRACT_DOCX_MODE_VERSION,
    links: links.links,
    warnings: links.warnings,
  });

  return { harnessVersion: LAB_HARNESS_VERSION, modes };
}

/** Stable mode order for snapshots and UI columns. */
export const LAB_MODE_ORDER: readonly LabExtractionModeId[] = [
  "docx_forensic_body",
  "server_word_extractor",
  "server_mammoth_raw",
  "docx_package_metadata",
  "docx_hyperlinks",
] as const;
