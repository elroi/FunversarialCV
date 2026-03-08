/**
 * CanaryWing egg: OWASP LLM10-aligned trackable URL embedding.
 * Embeds a unique, canary-token-style URL in a nearly invisible element to detect
 * exfiltration or model theft when the link is followed (e.g. by a crawler or LLM pipeline).
 * No PII is ever included in the URL; integrates with Stateless Vault by design.
 */

import { PDFDocument, rgb, StandardFonts } from "pdf-lib";
import type { IEgg } from "../types/egg";
import { OwaspMapping } from "../types/egg";
import { injectHiddenParagraphIntoDocx } from "../engine/docxInject";
import { PII_REGEX } from "../lib/vault";

const MAX_PAYLOAD_LENGTH = 1024;
const UNSAFE_PATTERN = /[<>]|<\s*script|javascript\s*:/i;
const VALID_TOKEN_PATTERN = /^[a-zA-Z0-9-]{1,128}$/;

function isPdfBuffer(buffer: Buffer): boolean {
  return (
    buffer.length >= 4 &&
    buffer[0] === 0x25 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x44 &&
    buffer[3] === 0x46
  );
}

function isDocxBuffer(buffer: Buffer): boolean {
  return buffer.length >= 2 && buffer[0] === 0x50 && buffer[1] === 0x4b;
}

/**
 * Default base URL for canary endpoint (app's own deployment).
 * Uses CANARY_BASE_URL, else VERCEL_URL + /api/canary, else localhost for dev/test.
 */
function getDefaultBaseUrl(): string {
  if (typeof process !== "undefined" && process.env?.CANARY_BASE_URL) {
    const base = process.env.CANARY_BASE_URL.trim().replace(/\/+$/, "");
    return base;
  }
  if (typeof process !== "undefined" && process.env?.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL}/api/canary`;
  }
  return "http://localhost:3000/api/canary";
}

interface CanaryPayload {
  /** Full URL to embed as-is (e.g. CanaryTokens.com). Takes precedence over baseUrl+token. */
  url?: string;
  baseUrl?: string;
  token?: string;
}

function parsePayload(payload: string): { config: CanaryPayload; parseOk: boolean } {
  const trimmed = payload.trim();
  if (!trimmed) return { config: {}, parseOk: true };
  try {
    const parsed = JSON.parse(trimmed) as CanaryPayload;
    const config =
      typeof parsed === "object" && parsed !== null ? parsed : {};
    return { config, parseOk: true };
  } catch {
    return { config: {}, parseOk: false };
  }
}

function isValidHttpUrl(s: string): boolean {
  try {
    const u = new URL(s);
    return u.protocol === "http:" || u.protocol === "https:";
  } catch {
    return false;
  }
}

/** Reject if string looks like PII (e.g. email in baseUrl). */
function containsPii(s: string): boolean {
  return PII_REGEX.EMAIL.test(s) || PII_REGEX.PHONE.test(s);
}

function buildCanaryUrl(baseUrl: string, token: string): string {
  const base = baseUrl.replace(/\/+$/, "");
  return `${base}/${token}`;
}

export const canaryWing: IEgg = {
  id: "canary-wing",
  name: "The Canary Wing",
  description:
    "OWASP LLM10: Embeds a unique, trackable canary-style URL in the document to detect when CV content is exfiltrated or used (e.g. link followed by crawler/model pipeline). Model Theft & Exfiltration.",
  owaspMapping: OwaspMapping.LLM10_Model_Theft,

  manualCheckAndValidation:
    "Manual check: In a PDF use Select All or search for a URL; in DOCX inspect the hidden paragraph or enable showing hidden content to find the canary URL. Validation: Run the transform and verify the canary URL appears in the output; optionally GET the URL to confirm the canary endpoint logs the hit.",

  validatePayload(payload: string): boolean {
    if (payload.length > MAX_PAYLOAD_LENGTH) return false;
    const { config, parseOk } = parsePayload(payload);
    if (!parseOk) return false;
    if (Object.keys(config).length === 0) return true;

    const url = config.url;
    if (url !== undefined) {
      if (typeof url !== "string") return false;
      if (!isValidHttpUrl(url)) return false;
      if (containsPii(url)) return false;
      if (UNSAFE_PATTERN.test(url)) return false;
    }

    const baseUrl = config.baseUrl;
    if (baseUrl !== undefined) {
      if (typeof baseUrl !== "string") return false;
      if (!isValidHttpUrl(baseUrl)) return false;
      if (containsPii(baseUrl)) return false;
      if (UNSAFE_PATTERN.test(baseUrl)) return false;
    }

    const token = config.token;
    if (token !== undefined) {
      if (typeof token !== "string") return false;
      if (!VALID_TOKEN_PATTERN.test(token)) return false;
      if (UNSAFE_PATTERN.test(token)) return false;
    }

    return true;
  },

  async transform(buffer: Buffer, payload: string): Promise<Buffer> {
    const { config } = parsePayload(payload);
    const canaryUrl =
      config.url && config.url.trim() !== ""
        ? config.url.trim()
        : buildCanaryUrl(
            config.baseUrl?.trim().replace(/\/+$/, "") ?? getDefaultBaseUrl(),
            config.token ?? crypto.randomUUID()
          );

    if (isPdfBuffer(buffer)) {
      const bytes = new Uint8Array(buffer);
      const doc = await PDFDocument.load(bytes);
      const pages = doc.getPages();
      const page = pages[0];
      if (!page) return buffer;
      const font = await doc.embedFont(StandardFonts.Helvetica);
      const margin = 40;
      const y = page.getHeight() - margin;
      // Nearly invisible: 0.5pt white (same as InvisibleHand / .cursorrules)
      page.drawText(canaryUrl, {
        x: margin,
        y,
        size: 0.5,
        font,
        color: rgb(1, 1, 1),
      });
      const pdfBytes = await doc.save();
      return Buffer.from(pdfBytes);
    }

    if (isDocxBuffer(buffer)) {
      return injectHiddenParagraphIntoDocx(buffer, canaryUrl);
    }

    throw new Error("Unsupported document format: buffer is neither PDF nor DOCX.");
  },
};
