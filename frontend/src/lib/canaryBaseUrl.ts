/**
 * Stable public base for Canary Wing hyperlinks.
 *
 * Vercel sets VERCEL_URL to the deployment hostname. Those hosts look like
 * funversarial-<id>-<team>.vercel.app and, on this project, sit behind
 * Vercel SSO. A canary in a downloaded file must stay reachable without that
 * login, so those hosts are rejected.
 *
 * CANARY_BASE_URL may be the site origin (https://cv.funversarial.com) or the
 * canary prefix (https://cv.funversarial.com/api/canary). A bare origin gets
 * /api/canary appended. Any other path is kept.
 */

export const PRODUCTION_CANARY_BASE_URL = "https://cv.funversarial.com/api/canary";

const LOCAL_DEV_CANARY_BASE_URL = "http://localhost:3000/api/canary";

/** Deployment URLs and *.vercel.app aliases. Not a stable public canary host. */
const VERCEL_APP_HOST = /(^|\.)vercel\.app$/i;

export function isUnstableDeploymentHost(hostname: string): boolean {
  return VERCEL_APP_HOST.test(hostname);
}

/**
 * Returns the prefix placed before /{token}/{variant}, or null when the value
 * is empty, not http(s), or a vercel.app host.
 */
export function normalizeCanaryBaseUrl(raw: string | undefined | null): string | null {
  if (!raw) return null;
  const trimmed = raw.trim();
  if (!trimmed) return null;
  const withProtocol = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
  let url: URL;
  try {
    url = new URL(withProtocol);
  } catch {
    return null;
  }
  if (url.protocol !== "http:" && url.protocol !== "https:") return null;
  if (isUnstableDeploymentHost(url.hostname)) return null;
  const path = url.pathname.replace(/\/+$/, "");
  const prefix = path === "" ? "/api/canary" : path;
  return `${url.origin}${prefix}`;
}

export function resolveCanaryBaseUrl(env: {
  CANARY_BASE_URL?: string;
  NEXT_PUBLIC_SITE_URL?: string;
  /** Present on Vercel. Read only so callers can prove it is ignored. */
  VERCEL_URL?: string;
  NODE_ENV?: string;
}): string {
  const fromCanary = normalizeCanaryBaseUrl(env.CANARY_BASE_URL);
  if (fromCanary) return fromCanary;
  const fromSite = normalizeCanaryBaseUrl(env.NEXT_PUBLIC_SITE_URL);
  if (fromSite) return fromSite;
  if (env.NODE_ENV !== "production") {
    return LOCAL_DEV_CANARY_BASE_URL;
  }
  return PRODUCTION_CANARY_BASE_URL;
}

/** On-screen default. A vercel.app tab must not become the copied or injected host. */
export function defaultCanaryBaseForBrowser(origin: string, hostname: string): string {
  const fromSite = normalizeCanaryBaseUrl(process.env.NEXT_PUBLIC_SITE_URL);
  if (fromSite) return fromSite;
  if (!isUnstableDeploymentHost(hostname)) {
    try {
      const url = new URL(origin);
      if (!isUnstableDeploymentHost(url.hostname)) {
        return `${url.origin}/api/canary`;
      }
    } catch {
      /* fall through to the production canary */
    }
  }
  return PRODUCTION_CANARY_BASE_URL;
}
