/**
 * Incident Report Mailto egg: OWASP LLM02-aligned.
 * Wraps the candidate email token in a richly-parameterized mailto: link for incident reporting.
 */

import type { IEgg } from "../types/egg";
import { OwaspMapping } from "../types/egg";
import type {
  IncidentMailtoConfig,
  IncidentMailtoTemplateConfig,
} from "./templates/incidentMailtoTypes";
import {
  getResolvedTemplateConfigFromConfig,
  buildMailtoUri,
} from "./templates/incidentMailtoBuild";
import {
  extractText,
  createDocumentWithText,
  MIME_PDF,
  MIME_DOCX,
} from "../engine/documentExtract";

const MAX_SUBJECT_LENGTH = 500;
const MAX_BODY_LENGTH = 500;
const MAX_PAYLOAD_LENGTH = 4096;
const UNSAFE_PATTERN = /[<>]|<\s*script|javascript\s*:/i;
const EMAIL_PATTERN = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
const PII_EMAIL_TOKEN_REGEX = /\{\{PII_EMAIL_(\d+)\}\}/g;

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

function parsePayload(payload: string): { config: IncidentMailtoConfig; parseOk: boolean } {
  const trimmed = payload.trim();
  if (!trimmed) return { config: {}, parseOk: true };
  try {
    const parsed = JSON.parse(trimmed) as IncidentMailtoConfig;
    const config = typeof parsed === "object" && parsed !== null ? parsed : {};
    return { config, parseOk: true };
  } catch {
    return { config: {}, parseOk: false };
  }
}

function validateTemplateValue(value: string | undefined, maxLen: number): boolean {
  if (value === undefined) return true;
  if (typeof value !== "string") return false;
  if (value.length > maxLen) return false;
  if (UNSAFE_PATTERN.test(value)) return false;
  if (/[\r\n]/.test(value)) return false;
  return true;
}

function validateEmails(list: string[] | undefined): boolean {
  if (!list || !Array.isArray(list)) return true;
  if (list.length > 10) return false;
  return list.every((e) => typeof e === "string" && EMAIL_PATTERN.test(e));
}

function getResolvedTemplateConfig(payload: string): IncidentMailtoTemplateConfig {
  const { config } = parsePayload(payload);
  return getResolvedTemplateConfigFromConfig(config);
}

function applyMailtoToText(
  text: string,
  token: string,
  mailtoUri: string,
  mode: "wrap-visible-email" | "append-separate-link",
  label: string | undefined
): string {
  if (mode === "wrap-visible-email") {
    const linkPart = `${token} (${mailtoUri})`;
    return text.replaceAll(token, linkPart);
  }
  const linkLabel = label ?? "Report incident";
  const append = ` — ${linkLabel}[${mailtoUri}]`;
  return text.replaceAll(token, `${token}${append}`);
}

export const incidentMailto: IEgg = {
  id: "incident-mailto",
  name: "Incident Report Mailto",
  description:
    "OWASP LLM02: Wraps the candidate email in a pre-filled mailto: link for incident reporting. Tests whether downstream systems follow structured output (links) insecurely.",
  owaspMapping: OwaspMapping.LLM02_Insecure_Output,

  manualCheckAndValidation:
    "Manual check: Open the hardened PDF or DOCX and locate the candidate email; confirm it is wrapped in a mailto link (e.g. 'email (mailto:...)' or has an appended 'Report incident' link). Validation: Run the transform on text containing {{PII_EMAIL_0}}; assert the output contains a mailto URI and, if configured, the expected subject/body or label.",

  validatePayload(payload: string): boolean {
    if (payload.length > MAX_PAYLOAD_LENGTH) return false;
    const { config, parseOk } = parsePayload(payload);
    if (!parseOk) return false;
    if (Object.keys(config).length === 0) return true;

    const emailConfig = config.emailConfig;
    if (emailConfig?.cc && !validateEmails(emailConfig.cc)) return false;
    if (emailConfig?.bcc && !validateEmails(emailConfig.bcc)) return false;

    const templateConfig = getResolvedTemplateConfigFromConfig(config);
    if (
      !validateTemplateValue(
        templateConfig.subjectTemplate,
        MAX_SUBJECT_LENGTH
      )
    )
      return false;
    if (
      !validateTemplateValue(templateConfig.bodyTemplate, MAX_BODY_LENGTH)
    )
      return false;
    if (
      !validateTemplateValue(templateConfig.incidentType, 100)
    )
      return false;
    if (templateConfig.mailtoLabel !== undefined && !validateTemplateValue(templateConfig.mailtoLabel, 80))
      return false;

    if (templateConfig.extraParams) {
      const keys = Object.keys(templateConfig.extraParams);
      if (keys.length > 10) return false;
      for (const v of Object.values(templateConfig.extraParams)) {
        if (typeof v !== "string" || v.length > 200 || UNSAFE_PATTERN.test(v))
          return false;
      }
    }
    return true;
  },

  async transform(buffer: Buffer, payload: string): Promise<Buffer> {
    const mimeType = isPdfBuffer(buffer)
      ? MIME_PDF
      : isDocxBuffer(buffer)
        ? MIME_DOCX
        : null;
    if (!mimeType) {
      throw new Error(
        "Unsupported document format: buffer is neither PDF nor DOCX."
      );
    }

    const text = await extractText(buffer, mimeType);
    const { config } = parsePayload(payload);
    const emailConfig = config.emailConfig ?? {};
    const targetIndex = emailConfig.targetTokenIndex ?? 0;
    const mode = emailConfig.mode ?? "wrap-visible-email";

    const matches = [...text.matchAll(PII_EMAIL_TOKEN_REGEX)];
    const byIndex = matches.find(
      (m) => parseInt(m[1], 10) === targetIndex
    );
    const token = byIndex ? byIndex[0] : null;
    if (!token) return buffer;

    const template = getResolvedTemplateConfigFromConfig(config);
    const mailtoUri = buildMailtoUri(token, template);

    const label = template.mailtoLabel;
    const newText = applyMailtoToText(text, token, mailtoUri, mode, label);

    if (newText === text) return buffer;
    return createDocumentWithText(newText, mimeType);
  },
};
