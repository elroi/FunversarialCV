/**
 * Helpers for strings that will be passed to pdf-lib when using standard fonts.
 * Standard fonts use WinAnsi encoding; characters outside that set (e.g. U+0080)
 * cause "WinAnsi cannot encode" errors on save. Use toWinAnsiSafe() before
 * drawText, setKeywords, PDFString.of, etc.
 */

/** WinAnsi-safe: printable ASCII 0x20–0x7E and Latin-1 supplement 0xA0–0xFF. Replaces others with space. */
export function toWinAnsiSafe(str: string): string {
  if (typeof str !== "string") return "";
  return str.replace(/[\x00-\x1f\x7f\x80-\x9f]|[\u0100-\uFFFF]/g, " ");
}

/** Printable ASCII only (0x20–0x7E). Use for raw PDF content streams so bytes are single-byte and never trigger WinAnsi 0x0080. */
export function toPdfStreamSafe(str: string): string {
  if (typeof str !== "string") return "";
  return str.replace(/[^\x20-\x7e]/g, " ");
}
