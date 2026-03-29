/**
 * Client-safe Metadata Shadow payload parse/serialize (no pdf-lib / zip).
 */

import { containsPii } from "../lib/vault";

export const KEY_PATTERN = /^[a-zA-Z0-9_]+$/;
export const MAX_VALUE_LENGTH = 200;
export const MAX_CUSTOM_KEYS = 20;

export const STANDARD_FIELD_KEYS = [
  "title",
  "subject",
  "author",
  "keywords",
] as const;

export type MetadataStandardFields = Partial<
  Record<(typeof STANDARD_FIELD_KEYS)[number], string>
>;

export type ParsedMetadataShadow = {
  custom: Record<string, string>;
  standard: MetadataStandardFields;
};

export type StandardFieldState = Record<
  (typeof STANDARD_FIELD_KEYS)[number],
  string
>;

export function emptyStandardFieldState(): StandardFieldState {
  return {
    title: "",
    subject: "",
    author: "",
    keywords: "",
  };
}

/** True when payload uses { custom?, standard? } shape (not legacy flat map). */
export function isExtendedShape(parsed: Record<string, unknown>): boolean {
  const c = parsed.custom;
  const s = parsed.standard;
  if (
    s !== undefined &&
    s !== null &&
    typeof s === "object" &&
    !Array.isArray(s)
  ) {
    return true;
  }
  if (
    c !== undefined &&
    c !== null &&
    typeof c === "object" &&
    !Array.isArray(c)
  ) {
    return true;
  }
  return false;
}

/** Parses JSON into custom + standard; invalid JSON yields empty buckets. */
export function parseMetadataShadowPayload(
  payload: string
): ParsedMetadataShadow {
  const trimmed = payload.trim();
  if (!trimmed) return { custom: {}, standard: {} };
  try {
    const parsed = JSON.parse(trimmed) as Record<string, unknown>;
    if (typeof parsed !== "object" || parsed === null) {
      return { custom: {}, standard: {} };
    }
    if (!isExtendedShape(parsed)) {
      const custom: Record<string, string> = {};
      for (const [k, v] of Object.entries(parsed)) {
        if (typeof v === "string" && KEY_PATTERN.test(k)) custom[k] = v;
      }
      return { custom, standard: {} };
    }
    for (const k of Object.keys(parsed)) {
      if (k !== "custom" && k !== "standard") {
        return { custom: {}, standard: {} };
      }
    }
    const custom: Record<string, string> = {};
    const rawCustom = parsed.custom;
    if (rawCustom !== undefined) {
      if (
        rawCustom === null ||
        typeof rawCustom !== "object" ||
        Array.isArray(rawCustom)
      ) {
        return { custom: {}, standard: {} };
      }
      for (const [k, v] of Object.entries(rawCustom as Record<string, unknown>)) {
        if (typeof v === "string" && KEY_PATTERN.test(k)) custom[k] = v;
      }
    }
    const standard: MetadataStandardFields = {};
    const rawStd = parsed.standard;
    if (
      rawStd !== undefined &&
      rawStd !== null &&
      typeof rawStd === "object" &&
      !Array.isArray(rawStd)
    ) {
      for (const key of STANDARD_FIELD_KEYS) {
        const v = (rawStd as Record<string, unknown>)[key];
        if (typeof v === "string" && v.trim() !== "") {
          standard[key] = v;
        }
      }
    }
    return { custom, standard };
  } catch {
    return { custom: {}, standard: {} };
  }
}

export function hasStandardFields(standard: MetadataStandardFields): boolean {
  return Object.keys(standard).length > 0;
}

export type CustomRow = { id: string; key: string; value: string };

/** UI + serialize blocking issues (mirrors MetadataShadow egg validation). */
export type MetadataShadowUiIssue =
  | { code: "custom_key_required"; rowIndex: number }
  | { code: "custom_value_required"; rowIndex: number }
  | { code: "custom_invalid_key"; rowIndex: number }
  | { code: "custom_value_too_long"; rowIndex: number }
  | { code: "custom_pii"; rowIndex: number }
  | { code: "custom_duplicate_key"; rowIndex: number; key: string }
  | { code: "custom_too_many_keys" }
  | { code: "standard_too_long"; field: (typeof STANDARD_FIELD_KEYS)[number] }
  | { code: "standard_pii"; field: (typeof STANDARD_FIELD_KEYS)[number] };

/**
 * Non-empty UI state that would fail egg validation or serialization.
 * Used for inline errors; `serializeMetadataShadowPayload` returns null when this is non-empty.
 */
export function getMetadataShadowUiIssues(
  rows: CustomRow[],
  standard: StandardFieldState
): MetadataShadowUiIssue[] {
  const issues: MetadataShadowUiIssue[] = [];
  const seenCustomKeys = new Set<string>();

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i]!;
    const k = row.key.trim();
    const v = row.value.trim();
    if (!k && !v) continue;
    if (!k && v) {
      issues.push({ code: "custom_key_required", rowIndex: i });
      continue;
    }
    if (k && !KEY_PATTERN.test(k)) {
      issues.push({ code: "custom_invalid_key", rowIndex: i });
      continue;
    }
    if (k && !v) {
      issues.push({ code: "custom_value_required", rowIndex: i });
      continue;
    }
    if (v.length > MAX_VALUE_LENGTH) {
      issues.push({ code: "custom_value_too_long", rowIndex: i });
      continue;
    }
    if (containsPii(v)) {
      issues.push({ code: "custom_pii", rowIndex: i });
      continue;
    }
    if (seenCustomKeys.has(k)) {
      issues.push({ code: "custom_duplicate_key", rowIndex: i, key: k });
    } else {
      if (seenCustomKeys.size >= MAX_CUSTOM_KEYS) {
        issues.push({ code: "custom_too_many_keys" });
      } else {
        seenCustomKeys.add(k);
      }
    }
  }

  for (const key of STANDARD_FIELD_KEYS) {
    const t = standard[key].trim();
    if (!t) continue;
    if (t.length > MAX_VALUE_LENGTH) {
      issues.push({ code: "standard_too_long", field: key });
    }
    if (containsPii(t)) {
      issues.push({ code: "standard_pii", field: key });
    }
  }

  return issues;
}

/**
 * Builds payload JSON from UI state. Returns null if a non-empty key is invalid
 * or constraints are violated (parent should keep previous payload).
 */
export function serializeMetadataShadowPayload(
  rows: CustomRow[],
  standard: StandardFieldState
): string | null {
  if (getMetadataShadowUiIssues(rows, standard).length > 0) return null;

  const custom: Record<string, string> = {};
  for (const row of rows) {
    const k = row.key.trim();
    const v = row.value.trim();
    if (!k && !v) continue;
    custom[k] = v;
  }

  const std: MetadataStandardFields = {};
  for (const key of STANDARD_FIELD_KEYS) {
    const t = standard[key].trim();
    if (t) {
      std[key] = t;
    }
  }

  const hasCustom = Object.keys(custom).length > 0;
  const hasStd = Object.keys(std).length > 0;
  if (!hasCustom && !hasStd) return "{}";

  const out: Record<string, unknown> = {};
  if (hasCustom) out.custom = custom;
  if (hasStd) out.standard = std;
  return JSON.stringify(out);
}

/** Hydrate rows + standard inputs from a stored payload string. */
export function hydrateMetadataShadowUi(
  payload: string,
  newRowId: () => string
): { rows: CustomRow[]; standard: StandardFieldState } {
  const parsed = parseMetadataShadowPayload(payload);
  const entries = Object.entries(parsed.custom);
  const rows: CustomRow[] =
    entries.length > 0
      ? entries.map(([key, value]) => ({
          id: newRowId(),
          key,
          value,
        }))
      : [{ id: newRowId(), key: "", value: "" }];
  const standard = emptyStandardFieldState();
  for (const key of STANDARD_FIELD_KEYS) {
    const v = parsed.standard[key];
    if (v) standard[key] = v;
  }
  return { rows, standard };
}
