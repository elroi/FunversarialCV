# FunversarialCV – Plan to Test the Codebase for Bugs

## 1. Overview

**Goal:** Systematically test the FunversarialCV codebase for bugs so that regressions are caught early, security guarantees hold, and users get a reliable hardening flow.

**Scope:** Unit tests (Jest), E2E tests (Playwright), coverage gaps, security-sensitive paths, and regression targets. The plan is **persona-aware** and incorporates feedback from each perspective before implementation.

**Out of scope:** Performance/load testing (separate plan); third-party dependency audits (use `npm audit` / Dependabot).

---

## 2. Current State Summary

### 2.1 Test Stack

| Layer        | Tool        | Config              | Command / Notes                    |
|-------------|-------------|---------------------|------------------------------------|
| Unit/React  | Jest 29     | `jest.config.js`    | `npm run test` (from `frontend/`)   |
| E2E         | Playwright  | `playwright.config.ts` | `npm run test:e2e` (Chromium, baseURL localhost:3000) |
| Lint        | ESLint      | Next.js config      | `npm run lint`                     |

- **Jest:** `roots`: `src`, `app`; `testMatch`: `**/*.test.ts`, **/*.test.tsx`; `collectCoverageFrom`: `src/**` only (app routes not in coverage metrics).
- **Playwright:** `e2e/specs/`; webServer: `npm run dev`; reuseExistingServer: true; timeout 90s; CI: 1 worker, 2 retries.

### 2.2 What Is Already Tested

**Unit (Jest)**

- **API routes:** `app/api/harden/route.test.ts`, `app/api/canary/status/route.test.ts`, `app/api/canary/[...token]/route.test.ts`, `app/api/eggs/route.test.ts`, `app/api/demo-cv/route.test.ts`.
- **Engine:** `Processor.test.ts`, `docxCanary.test.ts`, `docxInject.test.ts`, `docxMailto.test.ts`, `docxMailtoField.test.ts`.
- **Lib:** `vault.test.ts`, `clientVault.test.ts`, `rateLimit.test.ts`, `canaryHits.test.ts`, `Scanner.test.ts`, `clientDocumentExtract.test.ts`, `clientTokenReplaceInCopy.test.ts`, `pdfWinAnsi.test.ts`, `demoCvBuilders.test.ts`, `demoCvContent.test.ts`, `demoCvDocument.test.ts`.
- **Eggs:** `InvisibleHand.test.ts`, `IncidentMailto.test.ts`, `CanaryWing.test.ts`, `MetadataShadow.test.ts`.
- **UI:** `DropZone.test.tsx`, `CheckAndValidateBlock.test.tsx`, `DualityMonitor.test.tsx`, `Card.test.tsx`, `Input.test.tsx`, `Button.test.tsx`, `CollapsibleCard.test.tsx`; `app/page.test.tsx`, `app/layout.test.tsx`, `app/resources/page.test.tsx`, `app/admin/canaries/page.test.tsx`.

**E2E (Playwright)**

- `smoke.spec.ts` – home loads, “Engine Online”, drop zone visible.
- `happy-path.spec.ts` – DOCX upload → harden → download; client PII dehydration (tokenized payload).
- `errors.spec.ts`, `oversize-limit.spec.ts`, `navigation.spec.ts`, `options.spec.ts`, `demo-preset.spec.ts`, `duality-monitor.spec.ts`, `state-reset.spec.ts`, `server-pdf-pii.spec.ts`.

### 2.3 Gaps and Risk Areas

| Area | Risk | Current Coverage |
|------|------|------------------|
| **app/** in coverage | API route branches not in coverage report | `collectCoverageFrom` excludes `app/`; route tests exist but coverage is src-only. |
| **clientPdfium.ts** | PDF extraction fallback bugs (WASM, errors) | Used and mocked in `clientDocumentExtract.test.ts`; no direct unit tests for `extractPdfTextWithPdfium`. |
| **clientPdfStreamTokenize.ts** | PII replacement in PDF streams wrong or incomplete | No dedicated test file found. |
| **clientDocumentCreate.ts** | DOCX creation in browser (demo/build) | Referenced in `page.test.tsx`; no standalone unit tests. |
| **dualityCheck.ts** | Thin wrapper over Scanner | Covered indirectly via Scanner + Processor tests. |
| **log.ts** | No behavioral bug per se; could miss log-and-throw paths | Not unit-tested; covered implicitly by route tests. |
| **Egg templates** (`incidentMailtoBuild.ts`, etc.) | Wrong template or mailto URI | IncidentMailto egg tests exist; template helpers could have focused tests. |
| **documentExtract.ts** (server) | Wrong MIME/detection or extract/create behavior | Used in Processor/route tests; no isolated extract tests. |
| **Rate limit / canary reset** | Test pollution if resets are missing | `__resetRateLimitCountersForTests` and `__resetCanaryHitsForTests` used in route tests. |
| **E2E flakiness** | Timeouts, selectors, dev server | Retries in CI; some specs depend on network or file I/O. |

---

## 3. Bug-Testing Strategy

### 3.1 Principles

1. **TDD for non-trivial changes:** Write or describe tests first, then implement minimal code to pass (per `.cursorrules`).
2. **Security-first:** PII dehydration/rehydration, rate limiting, canary behavior, and “no file retention” must be covered by automated tests.
3. **Regression anchors:** Happy path (DOCX + PDF where applicable), oversize limit, duality alert, and server-PDF PII flow must stay green.
4. **Evidence over guesswork:** When debugging a bug, use runtime instrumentation and logs to confirm hypotheses before applying fixes (per debug-mode workflow).

### 3.2 Test Layers

| Layer | Purpose | Bug types targeted |
|-------|--------|--------------------|
| **Unit** | Pure logic, edge cases, mocks for I/O | Wrong branching, bad parsing, PII regex, rate-limit math, egg payloads. |
| **Integration** | API route + engine + eggs (Jest with NextRequest) | Wrong status codes, missing headers, malformed JSON, body size, eggIds/payloads. |
| **E2E** | Real browser, real server, real files | Upload → harden → download; error messages; navigation; duality monitor; server-PDF consent. |

### 3.3 Security-Sensitive Test Targets

- **PII:** `vault.ts` / `clientVault.ts` – dehydrate/rehydrate round-trip; no PII in server logs or responses beyond intentional rehydration in output.
- **Rate limiting:** `rateLimit.ts` – threshold and retry-after; route tests that assert 429 when over limit.
- **Canary:** Canary hit recording, `canaryTokenUsed` in harden response, status endpoint; no PII in canary payloads.
- **Stateless:** No file or buffer retention after response; tested implicitly by route tests (no shared state) and E2E (multiple runs).
- **Zero retention:** Stateless design; no persistence in route handlers; validated by route and E2E tests (no persistence layer).
- **Duality / Scanner:** Existing adversarial patterns detected and reported; alerts shown in UI (E2E).

### 3.4 Regression Test Matrix (Must Stay Green)

- Unit: `npm run test` – all Jest tests pass.
- E2E: `npm run test:e2e` – smoke, happy-path, errors, oversize-limit, server-pdf-pii, duality-monitor, state-reset, navigation, options, demo-preset.
- Lint: `npm run lint` – no new violations.
- Build: `npm run build` – succeeds (CI).

---

## 4. Prioritized Actions

### P0 – Before Any Release

1. **Run full suite and fix failures:** `npm run test` and `npm run test:e2e` in `frontend/`; fix any flaky or failing tests; document any known skip and reason.
2. **Confirm regression matrix:** Ensure the scenarios in §3.4 are explicitly covered by at least one test each; add a minimal test if any is missing.
3. **CI:** Branch protection requires unit + lint + E2E (per LAUNCH_IMPLEMENTATION_PLAN); verify that PRs run the same commands and that E2E uses a stable dev server or preview.

### P1 – High-Value Additions

4. **clientPdfium.ts:** Add a small unit test file that tests `extractPdfTextWithPdfium` with a minimal PDF buffer (or mock WASM) and with a failing/invalid buffer. If WASM is unavailable in CI, skip or gate these tests (e.g. `describe.skip` or env check) and document in README.
5. **clientPdfStreamTokenize.ts:** Add unit tests for `replacePiiInPdfFlateStreams` and `rehydratePdfFlateStreams` with synthetic buffers (e.g. uncompressed stream snippets) to guard against regressions in PII-in-PDF handling.
6. **Optional – app in coverage:** If desired, extend `collectCoverageFrom` to include `app/**/*.ts` (and exclude `app/**/*.test.*`) so API route branches appear in coverage; weigh noise vs. benefit.

### P2 – Nice to Have

7. **clientDocumentCreate.ts:** Unit tests for `createDocumentWithTextInBrowser` with a blob/buffer and assert output is valid DOCX (or mock `docx` and assert calls).
8. **Egg template helpers:** Focused tests for `buildMailtoUri`, `getResolvedTemplateConfigFromConfig` in `incidentMailtoBuild.ts` (or equivalent) to lock behavior.
9. **documentExtract.ts:** Isolated tests for `extractText`, `createDocumentWithText`, `detectDocumentType`, `isSupportedMimeType` with stub buffers.
10. **E2E stability:** Identify flaky specs (e.g. by run count or CI logs); add explicit waits or more robust selectors; consider tagging “slow” or “needs-server” and running them separately if needed.

### P3 – Ongoing

11. **New code:** For every new egg, API, or client flow, add at least one unit or integration test (TDD where non-trivial).
12. **Debug workflow:** When a bug is reported, use the debug-mode workflow: hypotheses → instrumentation → reproduce → analyze logs → fix with evidence → verify with logs → then remove instrumentation.

---

## 5. Persona Review and Plan Adjustments

### 5.1 Personas Considered

| Persona | Primary concern |
|---------|------------------|
| **Security Architect** | PII handling, rate limits, canary, no new injection surface, stateless execution. |
| **Hiring Manager / Candidate** | Happy path works; clear errors; no data loss; server-PDF consent when PII would be sent. |
| **Maintainer / DevOps** | Tests are stable, fast, runnable in CI; coverage is meaningful; no random flakiness. |
| **Privacy / Compliance** | PII flows are tested and documented; zero retention is verifiable. |
| **QA / Tester** | Clear test matrix; edge cases (oversize, invalid file, duality); reproducible runs. |

### 5.2 View from Each Persona

- **Security Architect:** The plan prioritizes PII, rate limit, canary, and statelessness in §3.3 and P0/P1. **Risk:** clientPdfStreamTokenize and clientPdfium are critical for “PII in browser”; adding tests (P1) reduces risk. **Adjustment:** Explicitly list “PII not in server logs” as a regression check (covered by route tests and code review; no new test added unless we add a dedicated audit test).
- **Candidate / Hiring Manager:** Happy path and error E2E are in the regression matrix; server-pdf-pii and duality-monitor cover consent and alerts. **Risk:** Slow or flaky E2E could block merges. **Adjustment:** P2 item 10 (E2E stability) stays; P0 item 1 includes “fix flaky tests” so releases aren’t blocked by noise.
- **Maintainer / DevOps:** Full suite and CI are P0; coverage is optional (P1). **Risk:** clientPdfium tests might need WASM in CI (e.g. Playwright or Node with WASM support). **Adjustment:** Document in P1 that clientPdfium tests may be skipped in CI if WASM isn’t available; still add the test file for local and optional CI runs.
- **Privacy / Compliance:** PII flows are tested via vault and client vault tests and E2E tokenized payload. **Risk:** No single “PII audit” test. **Adjustment:** Rely on existing route + E2E tests; add a short “Compliance” subsection under §3.3 stating that zero retention is validated by stateless design and route tests (no persistence layer).
- **QA / Tester:** Regression matrix (§3.4) and P0/P1/P2 give a clear checklist. **Risk:** Edge cases (e.g. empty file, wrong MIME, huge payload) might be under-covered. **Adjustment:** Keep P2 item 9 (documentExtract isolated tests) to lock MIME/detection edge cases.

### 5.3 Incorporation into the Plan

- **§3.3:** Add a bullet: “Zero retention: stateless design; no persistence in route handlers; validated by route and E2E tests.”
- **P1 item 4:** Add note: “If WASM is unavailable in CI, skip or gate clientPdfium tests (e.g. `describe.skip` or env check) and document in README.”
- **P0 item 1:** Already includes “fix any flaky or failing tests”; no change.
- **P2:** Retain E2E stability (item 10) and documentExtract tests (item 9) as above.

---

## 6. Summary

- **Current state:** Solid unit and E2E coverage for routes, engine, eggs, vault, rate limit, canary, and main UI; gaps in `clientPdfium`, `clientPdfStreamTokenize`, optional `clientDocumentCreate` and `documentExtract` isolated tests; app routes not in coverage report.
- **Strategy:** Three layers (unit, integration, E2E); security-first targets (PII, rate limit, canary, stateless); regression matrix that must stay green; prioritized P0/P1/P2/P3 actions.
- **Personas:** Security, Candidate, Maintainer, Privacy, QA perspectives reviewed; adjustments applied (zero-retention note, clientPdfium CI note, flakiness in P0, retention of edge-case and E2E stability work).

**Next step:** Execute P0 (run full suite, fix failures, confirm regression matrix and CI), then proceed to P1 tests for clientPdfium and clientPdfStreamTokenize when ready.
