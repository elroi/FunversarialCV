/**
 * FunversarialCV secure engine: document lifecycle and egg pipeline.
 */

export { process, type ProcessorInput, type ProcessorOutput } from "./Processor";
export { runScan, buildScannerReport, DUALITY_ALERT_MESSAGE, type ScanInput, type ScanResult, type ScannerReport } from "../lib/Scanner";
export { runDualityCheck, type DualityCheckResult } from "./dualityCheck";
export {
  extractText,
  createDocumentWithText,
  isSupportedMimeType,
  MIME_PDF,
  MIME_DOCX,
  type SupportedMimeType,
} from "./documentExtract";
export {
  exportHardenedDocxToPdf,
  sanitizeExtractedDocxPlainTextForPdfSeed,
} from "./docxToPdfExport";
