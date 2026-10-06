/**
 * Canary links must use a stable public host.
 * Preview and team deployment hostnames (*.vercel.app) are behind Vercel SSO
 * and must never be written into a generated file.
 */

import {
  defaultCanaryBaseForBrowser,
  normalizeCanaryBaseUrl,
  PRODUCTION_CANARY_BASE_URL,
  resolveCanaryBaseUrl,
} from "./canaryBaseUrl";

const PREVIEW_HOST = "funversarial-dd4k6uw5r-elroi1s-projects.vercel.app";

describe("normalizeCanaryBaseUrl", () => {
  it("appends /api/canary when the value is only a site origin", () => {
    expect(normalizeCanaryBaseUrl("https://cv.funversarial.com")).toBe(
      "https://cv.funversarial.com/api/canary"
    );
  });

  it("keeps an explicit /api/canary path", () => {
    expect(normalizeCanaryBaseUrl("https://cv.funversarial.com/api/canary/")).toBe(
      "https://cv.funversarial.com/api/canary"
    );
  });

  it("rejects preview and team vercel.app hosts", () => {
    expect(normalizeCanaryBaseUrl(`https://${PREVIEW_HOST}`)).toBeNull();
    expect(normalizeCanaryBaseUrl(`https://${PREVIEW_HOST}/api/canary`)).toBeNull();
    expect(normalizeCanaryBaseUrl("https://funversarial-cv.vercel.app")).toBeNull();
  });
});

describe("resolveCanaryBaseUrl", () => {
  it("prefers CANARY_BASE_URL and ignores VERCEL_URL", () => {
    expect(
      resolveCanaryBaseUrl({
        CANARY_BASE_URL: "https://cv.funversarial.com",
        VERCEL_URL: PREVIEW_HOST,
        NODE_ENV: "production",
      })
    ).toBe(PRODUCTION_CANARY_BASE_URL);
  });

  it("falls back to the production canary URL when only a preview host is available", () => {
    expect(
      resolveCanaryBaseUrl({
        VERCEL_URL: PREVIEW_HOST,
        NODE_ENV: "production",
      })
    ).toBe(PRODUCTION_CANARY_BASE_URL);
  });

  it("uses localhost outside production when no stable env URL is set", () => {
    expect(resolveCanaryBaseUrl({ NODE_ENV: "test" })).toBe(
      "http://localhost:3000/api/canary"
    );
  });
});

describe("defaultCanaryBaseForBrowser", () => {
  it("does not use a vercel.app tab as the canary host", () => {
    expect(
      defaultCanaryBaseForBrowser(`https://${PREVIEW_HOST}`, PREVIEW_HOST)
    ).toBe(PRODUCTION_CANARY_BASE_URL);
  });

  it("uses the tab origin on localhost", () => {
    expect(defaultCanaryBaseForBrowser("http://localhost:3000", "localhost")).toBe(
      "http://localhost:3000/api/canary"
    );
  });
});
