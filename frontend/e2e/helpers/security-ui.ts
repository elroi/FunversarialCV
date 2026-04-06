import { securityCopy } from "../../src/copy/security";

function escapeRegExp(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Regex matchers for security-audience UI after `ensureSecurityAudienceForE2e`.
 * Built from `frontend/src/copy/security.ts` so copy edits propagate to E2E in one place.
 */
export const securityUiRx = {
  audienceSecurityButton: new RegExp(
    escapeRegExp(securityCopy.audienceSecurity),
    "i"
  ),
  piiModeBadge: new RegExp(escapeRegExp(securityCopy.piiModeBadge), "i"),
  armedCvLabel: new RegExp(escapeRegExp(securityCopy.armedCvLabel), "i"),
} as const;
