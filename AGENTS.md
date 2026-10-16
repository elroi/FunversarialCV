# FunversarialCV agent notes

Facts and gotchas for this repo. Claude Code loads this file through `@AGENTS.md` in `CLAUDE.md`.

## Canary links

Generated Canary Wing hyperlinks must use `CANARY_BASE_URL`. That value may be the site origin (`https://cv.funversarial.com`) or the canary prefix (`https://cv.funversarial.com/api/canary`). A bare origin gets `/api/canary` appended.

`VERCEL_URL` is the deployment hostname. On this project, deployment hosts such as `*.vercel.app` sit behind Vercel login (`ssoProtection: all_except_custom_domains`). `https://cv.funversarial.com` answers `/api/canary/...` in the open. Do not write a `*.vercel.app` host into a downloaded file. A full canary URL the user types into the card is still used as typed.

A fresh clone has no `.env`. The production value lives in the Vercel project, not in git.

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

## Checks

From `frontend/`, continuous integration (CI) runs `npm test` and `npm run lint` on Node 22. `tsc --noEmit` also type-checks tests and already reports older errors that CI does not run. End-to-end tests are a separate job. A green test file is not a green suite when the failure depends on what ran earlier.
