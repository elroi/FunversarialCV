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

## Validation Lab & egg surfaces (the "honest sequence")

The eggs land on *different* DOCX surfaces, and only **body text** reaches an LLM that ingests a `.docx`:

- **InvisibleHand** — body text (white ~1pt run, `w:sz=2` in `docxInject.ts`). Reaches a chat model; may be acted on or flagged.
- **CanaryWing** — the URL is body text (white ~1pt hyperlink run), so the *address* can appear in a chat upload, but the **recorded hit** only fires when something fetches the link (`/api/canary/...`); chat apps don't fetch.
- **MetadataShadow** — `docProps/custom.xml` / `core.xml`. **Does not reach a chat model** (document properties aren't exposed). The console always sends `divergenceProfile=machine`, so armed files carry `Company` + `ParserDirective_Priority` / `LLM_Context_Seed` / `SchemaHint_Resume`. There is **no "Internal Priority Level"** field — don't write copy that asks a model to extract one.
- **IncidentMailto** — a hyperlink target; not read as an instruction.

So **public AI chat tools are not a reliable test**; the in-app Ingestion Lab ("What the file says") is the real, repeatable proof. The Validation Lab copy encodes this — see `docs/VALIDATION_LAB_HONEST_SEQUENCE_SPEC.md`. `GET /api/eggs` returns only `id`/`name`/`manualCheckAndValidation` (not `description`); the engine card renders `copy.invisibleHandDescription`.

`validationLabManualMirrorProtocol` is **schema-bearing** (parsed by `validationLabProtocol.ts`; bad shape → plain-paragraph fallback). The Validation Lab copy is **string-locked** across `src/copy/copy.test.ts` (e.g. `labHarnessIntro` must contain `LLM09`/not `LLM05`; `fullSessionIntro` must keep "full session" + "15–20 min"), `src/lib/validationLabProtocol.test.ts`, `src/components/ValidationLab.test.tsx`, and `app/page.test.tsx`. Change those strings and their tests in the same commit.

## Cloud sessions (claude.ai/code)

- A fresh container has **no `node_modules`** — run `npm install` (from `frontend/`) before `npm test` / `tsc`.
- This checkout often has **no git `origin`** wired. Attach with the session's repo-add (push access) and ensure the Claude GitHub App is installed on the repo. PR **merge** writes work through the egress proxy, but **branch/ref deletion does not** (`git push --delete` disconnects; REST `DELETE /git/refs` returns 403). Delete merged branches from the GitHub UI, not the session.
- **Playwright E2E can't run** in-container — the pinned `chrome-headless-shell` build isn't present and the env forbids `playwright install`. Verify the extract/ingestion engine via Jest (`src/engine/labExtract/*`, `app/api/lab/extract/route.test.ts`) instead; do the browser pass on the deployed site.
- The live domain `cv.funversarial.com` is **blocked by the egress proxy**, so live smoke tests need a real browser (Claude in Chrome / built-in browser) or a manual check, not `curl` from the shell.
- The stop hook flags any dirty file. Apply judgment: never commit to `main`, don't fold unrelated WIP into a feature branch, and discard regenerated fixtures (e.g. `frontend/e2e/fixtures/*.docx` get rewritten by a run) rather than committing them.

## Checks

From `frontend/`, continuous integration (CI) runs `npm test` and `npm run lint` on Node 22. `tsc --noEmit` also type-checks tests and already reports older errors that CI does not run. End-to-end tests are a separate job. A green test file is not a green suite when the failure depends on what ran earlier.
