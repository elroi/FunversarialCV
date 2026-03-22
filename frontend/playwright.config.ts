/**
 * Playwright E2E config.
 * - Local: `next dev` (reuse if you already have it on :3000).
 * - CI with `.next` output: `next start` (workflow runs `next build` first).
 * - CI without a build (e.g. `CI=true` in a dev shell): fall back to `next dev`.
 * Usage: npm run test:e2e
 */
import fs from "node:fs";
import path from "node:path";
import { defineConfig, devices } from "@playwright/test";

const isCI = !!process.env.CI;
const hasNextBuild = fs.existsSync(
  path.join(process.cwd(), ".next", "BUILD_ID")
);
const useCiProdServer = isCI && hasNextBuild;

export default defineConfig({
  testDir: "./e2e/specs",
  timeout: 90_000,
  fullyParallel: true,
  forbidOnly: isCI,
  retries: isCI ? 1 : 0,
  // Dev server + single worker made PR checks disproportionately slow; prod
  // server is stable enough for modest parallelism on ubuntu-latest.
  workers: isCI ? 2 : undefined,
  reporter: "html",
  use: {
    baseURL: "http://localhost:3000",
    trace: "on-first-retry",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: useCiProdServer
    ? {
        command: "npm run start",
        url: "http://localhost:3000",
        reuseExistingServer: false,
        timeout: 60_000,
      }
    : {
        command: "npm run dev",
        url: "http://localhost:3000",
        reuseExistingServer: !isCI,
        timeout: 120_000,
      },
});
