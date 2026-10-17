# FunversarialCV agent notes

Facts and gotchas for this repo. Claude Code loads this file through `@AGENTS.md` in `CLAUDE.md`.

## Canary links

Generated Canary Wing hyperlinks must use `CANARY_BASE_URL`. That value may be the site origin (`https://cv.funversarial.com`) or the canary prefix (`https://cv.funversarial.com/api/canary`). A bare origin gets `/api/canary` appended.

`VERCEL_URL` is the deployment hostname. On this project, deployment hosts such as `*.vercel.app` sit behind Vercel login (`ssoProtection: all_except_custom_domains`). `https://cv.funversarial.com` answers `/api/canary/...` in the open. Do not write a `*.vercel.app` host into a downloaded file. A full canary URL the user types into the card is still used as typed.

A fresh clone has no `.env`. The production value lives in the Vercel project, not in git.

## Vercel command-line interface (CLI)

`frontend/` is not linked to the `funversarial-cv` project. `vc curl --yes` from that directory creates an empty Vercel project named `frontend`. Preview hosts (`*.vercel.app`) are behind Vercel login. Read `https://cv.funversarial.com`, or link the CLI to `funversarial-cv` before `vc curl`.

## Vercel builds

Three warnings recur. Only a stale Browserslist database is a change in this repo.

From `frontend/`, `npx update-browserslist-db@latest` refreshes `caniuse-lite` and `baseline-browser-mapping`, then uninstalls both from `package.json`. From the repo root, `git diff -- frontend/package.json frontend/package-lock.json` should show only the lockfile. If that uninstall stops halfway, `package.json` lists those packages and should be cleaned. The next Vercel log goes from "Creating an optimized production build" to "Compiled successfully" with no age warning. A restored build cache can still apply the lockfile bump.

`cache-dir` is not set in this repo. npm's setting is `cache`. The unknown-config warning comes from the Vercel build environment.

`esbuild` is required only by `tsx`. The Next.js 14.1.0 production build uses the `@next/swc-*` packages. `unrs-resolver` comes from `eslint-config-next` through `eslint-import-resolver-typescript`. The Vercel build log may name `npm install-scripts approve <pkg>` for those two. That subcommand is absent from npm 10.9.8. Approving them does not fix a failure that is happening now.

The production deploy is Vercel's Git integration. It is not a workflow file in this repo.

## Open Worldwide Application Security Project (OWASP) labels

The 2025 Top 10 for large language model (LLM) applications renamed categories. The live site kept many 2023 address slugs.

- Canary Wing is LLM09:2025 Misinformation. The page is `https://genai.owasp.org/llmrisk/llm09-overreliance/`.
- Metadata Shadow and Mailto Surprise are LLM05:2025 Improper Output Handling. The page is `https://genai.owasp.org/llmrisk/llm05-supply-chain-vulnerabilities/`.
- The short address `https://genai.owasp.org/llm09-overreliance/` redirects to the 2023 archive. Slugs that spell the 2025 titles, such as `llm09-misinformation`, return 404.
- The index is `https://genai.owasp.org/llm-top-10/`.

Security copy says "eggs" and "Inject Eggs". Human-resources (HR) copy says "options" and "Add signals". That split is intentional. The audience switch stores the choice immediately. Visible copy and theme change after the fade, about three seconds. Leaving the page before the fade finishes makes the next page show the new copy at once.

## Portable Document Format (PDF) saves

`pdf-parse` bundles pdf.js 1.10. pdf-lib's default `doc.save()` writes object streams that this parser cannot read. It reports a bogus compression error. Creating one such PDF in a process also makes later parses fail, so a test can pass alone and fail once another test has created a PDF.

Every PDF this app saves goes through `savePdf` in `frontend/src/lib/pdfSave.ts` (`useObjectStreams: false`). A fix on only the final export is not enough.

## Word files

The `docx` library writes core creator `Un-named` unless `creator` is set. Files we generate set it to `FunversarialCV`. An uploaded Word file keeps its own author.

## Document title

The root layout exports metadata the same way it exports the viewport: `export { metadata, viewport }` in `frontend/app/layout.tsx`. The browser tab stays `FunversarialCV`. It does not follow the HR or security audience.

A test of the metadata object can pass while the built page still has no `<title>`. Confirm `<title>FunversarialCV</title>` in `frontend/.next/server/app/index.html` and `document.title` on `/` and `/resources`.

## Checks

From `frontend/`, continuous integration (CI) runs `npm test` and `npm run lint` on Node 22 for a pull request into `main`. That job does not run again on a push to `main`. End-to-end tests run on both a pull request and a push to `main`. `tsc --noEmit` also type-checks tests and already reports older errors that CI does not run. A green test file is not a green suite when the failure depends on what ran earlier.
