## FunversarialCV v1 Launch Implementation Plan

### 1. Overview

- **Goal**: Take FunversarialCV from “functionally launchable” to a **public v1** that is operationally safe, observably stable, and aligned with its documented security guarantees.
- **Scope**:
  - **Align upload limits** with the actual deployment platform.
  - **Clarify and/or extend PII handling**.
  - **Decide and implement the Canary Wing analytics story**.
  - **Add basic rate limiting and observability** for critical APIs.
  - **Finalize Vercel configuration and CI/branch protections**.
  - **Run a full pre-launch verification pass** and tag the launch baseline.

### 2. Milestones

- **M1 – Limits & PII alignment**
  - Body size limits aligned with Vercel.
  - PII detection behavior and documentation in sync.
- **M2 – Canary Wing story**
  - Clear decision on analytics scope.
  - Either minimal persistence implemented or explicitly de-scoped in docs.
- **M3 – Operational hardening**
  - Rate limiting and structured logging for `/api/harden` and `/api/canary`.
- **M4 – Deployment readiness**
  - Vercel project configured.
  - Env vars and branch protection rules in place.
- **M5 – Launch baseline**
  - All tests green on `main`.
  - Manual smoke tests on production.
  - Launch commit tagged (e.g. `v1.0.0-launch`).

### 3. Progress summary

| Workstream | Status | Notes |
|------------|--------|--------|
| **WS1 – Body size limits** | Done | All items checked; limits, UX, E2E, docs aligned. |
| **WS2 – Canary** | Done | Option B (signal-only). Close-the-loop: GET /api/canary/status, “Did my canary sing?” UX, canaryTokenUsed in harden response. Docs: v1 no long-term analytics; persistCanaryHit extension point. |
| **WS3 – PII** | Mostly done | Address patterns, vault, unit tests, README. Open: Processor integration test (address round-trip). |
| **WS4 – Rate limit & logging** | Done | rateLimit.ts, log.ts; integrated in harden and canary routes; tests. |
| **WS5 – Vercel & CI** | Partial | Project root, build, env vars, Hosting & Ops docs done. Open: verify Preview/Production; branch protection. |
| **WS6 – Pre-launch** | Open | E2E in CI; PR merge; production smoke; tag v1.0.0-launch; optional changelog. |

---

## Workstream 1 – Align Body Size Limits

**Objective**: Ensure the documented, client-side, and server-side file size limits match what Vercel will actually accept, and surface clear errors to users.

### 1.1 Discovery

- **Confirm Vercel limits**
  - [x] Identify the runtime used by `/api/harden` (Node vs Edge).
  - [x] Confirm default body size limits for that runtime.
  - [x] Decide the official max file size (e.g. 4 MB vs 10 MB) that is guaranteed to work.

### 1.2 Server-side enforcement (`/api/harden`)

- **Update constants and logic**
  - [x] Adjust the max-bytes constant in `frontend/src/app/api/harden/route.ts` to the chosen limit.
  - [x] Ensure oversize uploads consistently return a 413-style or clear 4xx response with a descriptive error message.
- **Tests**
  - [x] Add/adjust Jest tests:
    - Files just under the limit succeed.
    - Files just over the limit fail with the expected status code and message.

### 1.3 Client-side UX

- **Mirror size limit in UI**
  - [x] Update client-side checks in the upload component(s) (e.g. `DropZone`) to enforce the new size cap via `file.size`.
- **Error messaging**
  - [x] Show a clear error when the file is too large (e.g. inline message or toast).
  - [x] Ensure UX does not attempt to call `/api/harden` when the file is already known to be oversize.
- **E2E**
  - [x] Extend Playwright tests to:
    - Attempt an oversize upload.
    - Assert that the user sees a clear error and (if applicable) that the server is not called.

### 1.4 Documentation

- **Update docs**
  - [x] Reflect the effective limit in `README.md` and `docs/API.md`.
  - [x] Include a short note about why the limit exists (platform/runtime constraints, performance).

---

## Workstream 2 – Canary Analytics & Persistence

**Status: Complete (Option B).** Decision: v1 signal-only; close-the-loop shipped (status API, “Did my canary sing?” UX, canaryTokenUsed); docs updated.

**Objective**: Decide whether Canary Wing in v1 includes hit persistence/analytics, and implement or explicitly de-scope accordingly.

### 2.1 Product/Scope Decision

- **Decide v1 scope**
  - [ ] **Option A**: Minimal analytics (persist hits + simple view).
  - [x] **Option B**: No persistence; `/api/canary` acts as a transient ping only.

### If Option A – Implement Minimal Analytics

#### 2.2 Storage & Data Model

- **Select storage**
  - [ ] Choose Vercel KV or equivalent as the store for canary hits.
- **Define model**
  - [ ] Decide on stored fields, e.g.:
    - `tokenId`, `variant`, `timestamp`.
    - Optional `sourceIpHash` or similar (avoid raw IP).
    - Truncated headers or selected metadata.

#### 2.3 Implement `persistCanaryHit`

- **Implementation**
  - [ ] Implement `persistCanaryHit` in the relevant module under `frontend/src/lib`:
    - Normalize hit data (truncate headers, hash any IP-like values).
    - Write to KV under a namespaced key (e.g. `canary:token:<tokenId>:<uuid>`).
  - [ ] Make behavior environment-driven:
    - If KV is not configured (e.g. local dev), safely no-op.
- **Tests**
  - [ ] Add unit tests using a fake KV client to assert:
    - Correct normalization.
    - Correct key structure.

#### 2.4 Minimal Analytics UI (Optional but Recommended)

- **Admin page**
  - [ ] Add an internal page (e.g. `frontend/src/app/admin/canaries/page.tsx`) to:
    - List recent hits.
    - Show count per token and last-seen timestamps.
  - [ ] Gate with a simple mechanism suitable for personal use (e.g. secret query parameter or header).

#### 2.5 Documentation

- **Docs**
  - [x] Update `README.md` / `docs/API.md`:
    - Describe what gets stored, retention expectations, and privacy posture.

### If Option B – De-scope Persistence

#### 2.6 Documentation Changes

- **Update Canary Wing description**
  - [x] Clarify in `README.md` and other docs that:
    - v1 does not provide long-term canary analytics.
    - `/api/canary` is a “signal only” endpoint.
- **Document extension hook**
  - [x] Keep `persistCanaryHit` as an extension point and document how it could be wired in a future version.

---

## Workstream 3 – PII Detection Scope vs Documentation

**Objective**: Align the real PII handling behavior with what the docs promise, especially around addresses.

### Option A – Expand PII Detection

#### 3.1 Pattern Design

- **Design conservative address patterns**
  - [x] Create regex/heuristics for common postal addresses:
    - Street numbers with street-type keywords (initially focusing on `123 Main St` / `123 Main Street`-style patterns).
    - Optional trailing city/state/ZIP segments on the same line.
  - [x] Aim for “best-effort helper,” not full DLP.

#### 3.2 Implementation in `vault`

- **Extend tokenization**
  - [x] In `frontend/src/lib/vault.ts`:
    - Add an address token type (e.g. `{{PII_ADDR_0}}`).
    - Extend `dehydrate` to:
      - Identify addresses and replace them with tokens.
      - Store address values in the in-memory map.
- **Rehydration**
  - [x] Extend `rehydrate` to correctly restore address tokens in the final text.

#### 3.3 Testing

- **Unit tests**
  - [x] Add tests covering:
    - Clear address examples that should be tokenized and restored.
    - Non-address text that must not be over-matched.
- **Integration tests**
  - [ ] Add or extend processor tests where CV text includes an address:
    - Verify round-trip correctness after the full pipeline (dehydrate → eggs → rehydrate).

#### 3.4 Documentation

- **Update docs**
  - [x] Update `README.md` to explicitly list:
    - Email, phone, and address as covered patterns, and to describe style-preserving behavior for compatible eggs (including Incident Mailto on DOCX).
  - [x] Add a short “Limitations” note clarifying that detection is heuristic and that style preservation for Incident Mailto may fall back to a rebuilt layout in complex documents.

### Option B – Narrow Documentation to Current Behavior

#### 3.5 Docs Alignment

- **Rename scope**
  - [ ] Update phrasing like “Phone, Address” in `README.md` and related docs to:
    - “Email and Phone” or “Selected high-risk PII (currently Email and Phone)”.
- **Add limitations note**
  - [ ] Clarify that:
    - PII detection helps identify common risky fields but is not exhaustive.
    - Users remain responsible for final redaction decisions.

---

## Workstream 4 – Rate Limiting & Observability

**Objective**: Add basic protections and structured logging around `/api/harden` and `/api/canary`.

### 4.1 Rate Limiting Strategy

- **Decide strategy**
  - [x] Choose:
    - In-memory limiter for low-volume Node runtime (bounded, per-IP, fixed window).
    - KV-backed limiter can be introduced later if higher volume / multi-region is expected.
  - [x] Define keys:
    - `/api/harden`: rate limit per IP (derived from `x-forwarded-for` when present).
    - `/api/canary`: per IP via `request.ip` (or fallback).

### 4.2 Implement Limiter Utility

- **Limiter module**
  - [x] Add `frontend/src/lib/rateLimit.ts`:
    - Expose `checkRateLimit(kind, key)` returning:
      - `{ allowed: boolean; retryAfterSeconds?: number }`.
    - Implement a fixed-window in-memory limiter with per-kind configuration.
- **Tests**
  - [x] Unit tests verifying:
    - Behavior within the allowed window.
    - Correct denial and `retryAfterSeconds` after threshold exceeded.
    - Reset/expiry behavior (via test helpers).

### 4.3 Integrate into Routes

- **`/api/harden` integration**
  - [x] Early in the handler, derive a key (e.g. from IP).
  - [x] Call `checkRateLimit('harden', key)`.
  - [x] On denial, return 429 with a clear message and optional `Retry-After` header.
- **`/api/canary` integration**
  - [x] Do the same for `checkRateLimit('canary', key)` based on IP.

### 4.4 Structured Logging

- **Logging helper**
  - [x] Add `frontend/src/lib/log.ts`:
    - Provide `logInfo`, `logError`, etc., emitting structured JSON:
      - `{ level, route, event, message?, meta? }`.
- **Apply to critical paths**
  - [x] `/api/harden`:
    - Log rate-limit denials and successful harden operations with mime type.
  - [x] `/api/canary`:
    - Log hits (without PII) and rate-limit denials.

---

## Workstream 5 – Vercel Setup & CI Integration

**Objective**: Ensure Vercel, environment variables, and CI/branch protections all reflect the intended architecture.

### 5.1 Vercel Project Configuration

- **Project root**
  - [x] Confirm `frontend` is set as the Vercel project root.
- **Build settings**
  - [x] Ensure build command/output directory use the standard Next.js defaults (unless there’s a reason to customize).
- **Preview vs production**
  - [ ] Verify:
    - PR branches deploy to Preview.
    - `main` deploys to Production.

### 5.2 Environment Variables

- **Define required env vars**
  - [x] `CANARY_BASE_URL` (if used).
  - [x] Any KV/rate-limit/logging related env vars.
- **Docs**
  - [x] Add a short “Deployment env vars” section to `CONTRIBUTING.md` or `docs/IMPLEMENTATION_PLAN.md` describing each variable and defaults.

### 5.3 Branch Protection & CI

- **Branch rules**
  - [ ] Confirm `main` is protected:
    - All changes via PR.
    - Required checks:
      - `CI / unit-and-lint`.
      - `e2e`.
- **Vercel + GitHub integration**
  - [ ] Ensure Vercel only promotes to production when those checks are green.

### 5.4 Hosting & Ops Documentation

- **Add section to docs**
  - [x] Runtime (Node vs Edge).
  - [x] Effective file size and rate limits.
  - [x] What kinds of logs exist and how to access them (e.g. Vercel logs).
  - [x] High-level error behavior (what users see, and when to look at logs).

---

## Workstream 6 – Pre-launch Test Pass & Launch Tag

**Objective**: Validate stability end-to-end, then tag a specific commit as the v1 launch baseline.

### 6.1 Local Verification

- **Fresh install**
  - [x] `cd frontend && npm ci`.
- **Automated checks**
  - [x] `npm test` (Jest).
  - [x] `npm run lint`.
  - [ ] `npm run test:e2e` (full suite, or at least smoke + happy-path for quick iteration).

### 6.2 CI Verification

- **PR into `main`**
  - [ ] Open a PR with all launch-related changes.
  - [ ] Confirm:
    - `CI / unit-and-lint` passes.
    - `e2e` passes.

### 6.3 Production Smoke Tests

- **Manual checks on Vercel production**
  - [ ] Happy-path for PDF (including download and Duality Monitor).
  - [ ] Happy-path for DOCX.
  - [ ] Oversize or invalid upload to confirm user-facing error.
  - [ ] Canary Wing hit to confirm `/api/canary` logs (and analytics, if implemented).

### 6.4 Tagging the Launch

- **Git tag**
  - [ ] Create a tag (e.g. `v1.0.0-launch`) on the commit that passed all checks.
- **Changelog**
  - [ ] Optionally add a short “Release Notes / Changelog” section to `README.md` or a dedicated file summarizing what v1 includes.

---

## Future / Post-launch

**Objective**: Optional improvements once v1 is live; not blocking launch.

### Configure GitHub Code Scanning

- **Enable Code Scanning**
  - [ ] In repo **Settings → Code security and analysis**, enable **Code scanning**.
  - [ ] Add a workflow (e.g. `.github/workflows/codeql.yml`) that runs **CodeQL** (or another SARIF-emitting tool) on push/PR for the relevant languages (e.g. JavaScript/TypeScript).
  - [ ] Optionally add **Dependency review** or **Dependabot** for supply-chain alerts.
- **Branch protection**
  - [ ] Once Code Scanning is running and reporting results, re-enable **“Require code scanning results”** in the rule that protects `main` so PRs must have a clean (or accepted) scan before merge.
- **Docs**
  - [ ] Note in `CONTRIBUTING.md` or security docs that Code Scanning is required for `main` and how to view/triage alerts in the Security tab.

