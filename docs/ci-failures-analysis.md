# CI Failures Analysis (commit 43e42dd / PR #17)

## Summary from GitHub API

**4 check runs** for commit `43e42ddea92b31ce019c3e633f4aefbc213fe2ab`:

| Check               | Conclusion | Notes |
|---------------------|------------|--------|
| Vercel Preview Comments | ✅ success | — |
| unit-and-lint (run 1)   | ❌ failure | Step "Run unit tests" exited with code 1 |
| unit-and-lint (run 2)   | ❌ failure | Same |
| e2e                    | ❌ failure | Step "Run E2E tests" exited with code 1 |

**Annotations:**

1. **Node.js 20 deprecated** (warning): `actions/checkout@v4` and `actions/setup-node@v4` run on Node 20; GitHub will switch to Node 24 by default in June 2026. Recommendation: set `node-version: "22"` (LTS) in the workflow.
2. **Process completed with exit code 1** (failure): Reported for both unit-and-lint and e2e jobs; no test name or assertion in the API response.

## Local reproduction

- **Unit tests:** `npm ci` + `npm test` in `frontend/` **pass** locally (33 suites, 271 passed, 2 skipped).
- **E2E tests:** Not runnable in this environment without Playwright browsers; CI runs `npx playwright install --with-deps chromium` then `npm run test:e2e`.

## Likely causes

1. **Unit-and-lint:** Possible flakiness (timing, parallelism) or CI-only environment (e.g. memory, concurrency). No "Incident Mailto" references remain in tests; egg display name is "Mailto Surprise" everywhere.
2. **E2E:** Failure could be real (e.g. selector or text change) or environment (browser install, timeouts).
3. **Node 20:** Deprecation is a warning only; upgrading to Node 22 avoids future breakage.

## Changes applied

- **`.github/workflows/ci.yml`**: Bump Node to 22; run unit tests with `--ci` for stable CI behavior.
- **`.github/workflows/e2e.yml`**: Bump Node to 22 for consistency.

Re-run the workflows after pushing; if unit-and-lint still fails, use the "Re-run all jobs" button and inspect the "Run unit tests" log for the failing test name and stack trace.
