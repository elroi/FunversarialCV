# Playwright E2E (`frontend/e2e`)

## Keeping tests aligned with the UI

- **Audience:** The home page defaults to **HR**. Specs that assert security-only copy (PII badge, “Armed CV”, sample-CV row) must call `ensureSecurityAudienceForE2e(page)` immediately after `page.goto("/")` (or `"/?…"`). See `helpers/security-audience.ts`.
- **Engine section:** The armed-CV line and **Harden** live inside **Engine Configuration** / **How it runs**. The fold starts **collapsed**; after a file arms it **auto-expands**. `expandEngineConfigurationSection` waits for the armed line to become visible and only clicks the fold when `aria-expanded="false"` (a blind toggle would collapse an already-open section).
- **Security copy in one place:** Matchers for security-audience strings are built from `src/copy/security.ts` in `helpers/security-ui.ts`. When you change those fields in product copy, E2E usually needs no regex edits—only run the suite. If you add **new** security-only UI, add a derived regex there (or a `data-testid` on the component and assert that).
- **HR-only or shared copy:** If a test should reflect HR wording, do not call `ensureSecurityAudienceForE2e`; assert against `src/copy/hr.ts` or stable roles/test ids instead.

## Commands

From `frontend/`:

- Full suite: `npm run test:e2e` (starts dev server via Playwright when not in CI; CI uses `next start` after `next build`—see `.github/workflows/e2e.yml`).
- Install browsers: `npx playwright install chromium`
