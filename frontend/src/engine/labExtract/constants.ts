/** Bump when extraction semantics or mode set changes (shown in API + UI). */
export const LAB_HARNESS_VERSION = "1.0.0";

export const LAB_EXTRACTION_MODE_IDS = [
  "docx_forensic_body",
  "server_word_extractor",
  "server_mammoth_raw",
  "docx_package_metadata",
  "docx_hyperlinks",
] as const;

export type LabExtractionModeId = (typeof LAB_EXTRACTION_MODE_IDS)[number];
