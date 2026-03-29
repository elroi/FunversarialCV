import type { Audience } from "../contexts/AudienceContext";
import type { Copy } from "./types";
import { securityCopy } from "./security";
import { hrCopy } from "./hr";
import { useAudience } from "../contexts/AudienceContext";

export type { Copy } from "./types";
export { securityCopy, hrCopy };

export function getCopy(audience: Audience): Copy {
  return audience === "hr" ? hrCopy : securityCopy;
}

export function useCopy(): Copy {
  const { contentAudience } = useAudience();
  return getCopy(contentAudience);
}

/**
 * Replace {n} and {max} in a copy string (e.g. invisibleHandHint).
 */
export function replaceCopyPlaceholders(
  str: string,
  replacements: Record<string, string | number>
): string {
  let out = str;
  for (const [key, value] of Object.entries(replacements)) {
    out = out.replace(new RegExp(`\\{${key}\\}`, "g"), String(value));
  }
  return out;
}
