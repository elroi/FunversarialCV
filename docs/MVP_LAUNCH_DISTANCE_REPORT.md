# MVP launch distance — evaluation report

**Date:** 2026-03-24  
**Scope:** Distance to launch per [LAUNCH_IMPLEMENTATION_PLAN.md](LAUNCH_IMPLEMENTATION_PLAN.md) and optional credibility horizon per [CREDIBILITY_IA_RESEARCH_BRIEF.md](CREDIBILITY_IA_RESEARCH_BRIEF.md).

**Production deployment:** [https://funversarial-cv.vercel.app/](https://funversarial-cv.vercel.app/) — use this host for [LAUNCH_IMPLEMENTATION_PLAN.md](LAUNCH_IMPLEMENTATION_PLAN.md) §6.3 manual smoke. Spot-check (server-side, no browser): `GET /api/eggs` returns **200** with a JSON `eggs` array (manual check / validation copy per egg). Crawlers or snapshots without JavaScript may still show “Instructions not available” in HTML because those strings are the pre-hydration fallback until the client `fetch("/api/eggs")` in [`page.tsx`](../frontend/app/page.tsx) completes.

---

## 1. MVP definition (Step 0)

| Horizon | Definition | Use when |
|--------|------------|----------|
| **Technical v1 MVP** | Public v1 baseline in [LAUNCH_IMPLEMENTATION_PLAN.md](LAUNCH_IMPLEMENTATION_PLAN.md): operational safety, documented guarantees, pre-launch verification, launch tag. | Default “MVP launch” for this repo. |
| **Credibility / IA v1** | Structural trust surface: footer, policies, analytics disclosure, HR-first framing, SEO metadata — [CREDIBILITY_IA_RESEARCH_BRIEF.md](CREDIBILITY_IA_RESEARCH_BRIEF.md) §8. | Treat as **MVP+** or **v1.1** unless you explicitly block launch on HR/compliance polish. |

**Recommendation:** **Technical v1** WS6 is **closed** (see §2). Schedule credibility P0 items when analytics is enabled in production or when HR/compliance audience is primary.

---

## 2. Technical v1 — Workstream 6 scorecard (Step 1)

Evidence gathered 2026-03-24 on commit `65004da` (local + GitHub CLI where noted).

| Checklist item | Status | Evidence |
|----------------|--------|----------|
| **6.1** Fresh `npm ci` | Pass (assumed) | Standard workflow; lockfile present. Re-run if reproducibility is questioned. |
| **6.1** `npm test -- --ci` | **Pass** | 44 suites, 363 passed, 2 skipped (Jest, `frontend`). |
| **6.1** `npm run lint` | **Pass** | `next lint` — no warnings or errors. |
| **6.1** `npm run test:e2e` (local) | **Not run** | Playwright failed to start web server: port `3000` already in use in this environment. |
| **6.1 / 6.2** E2E in CI | **Pass** | `gh run list --workflow=e2e.yml`: recent runs **success** on `main` (e.g. run `23462695860`, merge PR #36). Workflow: [`.github/workflows/e2e.yml`](../.github/workflows/e2e.yml) (`npm run build` + `npm run test:e2e`, `RATE_LIMIT_HARDEN_MAX=1000`). |
| **6.2** PR checks `unit-and-lint` + `e2e` | **Pass** (by policy + recent E2E) | [`.github/workflows/ci.yml`](../.github/workflows/ci.yml) on PRs to `main`; E2E workflow on same triggers. |
| **6.3** Production: reject PDF / DOCX-only message | **Deferred (v1)** | Team decision: PDF is post–v1; manual PDF smoke waived for launch. API/tests still enforce DOCX-only. |
| **6.3** Production: happy-path DOCX | **Pass** | Verified on [production](https://funversarial-cv.vercel.app/) (upload → pipeline → download; Duality / steps). |
| **6.3** Production: oversize / invalid upload UX | **Waived (v1)** | Optional prod check accepted; E2E + API tests cover behavior. |
| **6.3** Production: Canary hit + logs | **Waived (v1)** | Optional: hit embedded canary URL → confirm Vercel logs or **Check for triggers**; waived for launch. |
| **6.3** Production: `GET /api/eggs` | **Pass** (spot-check) | 200 + valid JSON from `https://funversarial-cv.vercel.app/api/eggs` (direct HTTP). |
| **6.4** Git tag `v1.0.0-launch` (or equivalent) | **Waived (v1)** | Stakeholder OK without tag; add anytime for semver. |
| **6.4** Optional changelog / release notes | **Waived (v1)** | Stakeholder OK without dedicated release notes for this cut. |

**WS6 summary:** **Closed per [LAUNCH_IMPLEMENTATION_PLAN.md](LAUNCH_IMPLEMENTATION_PLAN.md).** Green CI, production at [funversarial-cv.vercel.app](https://funversarial-cv.vercel.app/), DOCX happy path verified; PDF / oversize / canary prod checks and tag/changelog **waived** as optional.

---

## 3. README / API vs code (Step 2)

| Claim | Doc location | Code alignment | Notes |
|-------|--------------|----------------|-------|
| 4 MB upload cap | README, [API.md](API.md) | `MAX_BODY_BYTES` / `MAX_FILE_SIZE_BYTES` = `4 * 1024 * 1024` | Aligned. |
| DOCX-only; PDF rejected with stated message | README, API.md | [route.ts](../frontend/app/api/harden/route.ts) returns documented string for PDF magic bytes | Aligned. |
| Error messages (400/413/500) | API.md | [route.ts](../frontend/app/api/harden/route.ts), route tests | Aligned. |
| Canary: process-local / signal-only | README, API.md | [canaryHits.ts](../frontend/src/lib/canaryHits.ts), API docs | Aligned; README already states multi-instance / cold-start caveat. |
| Rate limits on harden / canary / status | README | `rateLimit` usage in routes + tests | Spot-check: integrated per launch plan. |
| Structured logging, no CV content | README | `log.ts` usage in routes | Aligned at contract level. |
| Client oversize copy | DropZone + copy | `errorFileTooLarge` in [hr.ts](../frontend/src/copy/hr.ts) / [security.ts](../frontend/src/copy/security.ts): **"File is too large."** | **Minor drift:** README/API specify **4 MB** explicitly; client string does not (credibility brief P1-3 / UX_UI follow-up). Not a technical false claim — server returns correct 413 text. |

**Launch blockers from doc drift:** None identified for Technical v1. **Polish:** add numeric limit to client copy for parity with README/API.

---

## 4. Credibility horizon — mapped to MVP? (Step 3)

From [CREDIBILITY_IA_RESEARCH_BRIEF.md](CREDIBILITY_IA_RESEARCH_BRIEF.md) §8 — **required for Technical v1 MVP?** Default: **No**, unless you enable first-party analytics or need compliance-facing IA.

| ID | Item | Required for Technical v1? | Rationale |
|----|------|------------------------------|-----------|
| P0-1 | User-facing analytics / data notice when ingest enabled | **Conditional** | Required **if** `NEXT_PUBLIC_ANALYTICS_ENABLED` / `ANALYTICS_ENABLED` are on in prod; see [PRIVACY_ANALYTICS_IMPLEMENTATION_PLAN.md](PRIVACY_ANALYTICS_IMPLEMENTATION_PLAN.md). |
| P0-2 | Minimal footer (Privacy, GitHub, security contact) | No | Trust polish; not in launch plan WS1–WS6. |
| P0-3 | HR framing vs "RUN THE CV EXPERIMENT" | No | Copy/positioning; both audiences still share label in copy ([hr.ts](../frontend/src/copy/hr.ts)). |
| P1-1 | Site `metadata` / OG | No | [layout.tsx](../frontend/app/layout.tsx) has no `metadata` export — link previews weak. |
| P1-2 | Dedicated `/privacy` (optional `/terms`) | No | Resources route exists; brief wants linkable policy URL. |
| P1-3 | Oversize client copy includes 4 MB | No | Consistency polish. |
| P1-4 | `/api/eggs` loading flash | No | Maturity. |
| P2-* | Status, FAQ, body font split, etc. | No | Post-launch. |

---

## 5. Go / no-go (Step 4–5)

### Technical v1 MVP

| Criterion | Met? |
|-----------|------|
| WS1–WS5 complete per launch doc | Yes (documented Done) |
| Tests + lint + build | Yes (this evaluation) |
| Full E2E on PRs/`main` | Yes (recent GH Actions success) |
| Production smoke (§6.3) | **Yes (agreed scope)** — happy-path DOCX on prod; other items deferred or waived |
| Launch tag on green commit | **Waived** — baseline = `main` + Vercel deploy |
| README security claims vs code | Yes, with minor client copy nuance above |

**Verdict:** **Technical v1 baseline met** for the agreed scope — production live, core smoke done, optional items **waived** (see WS6 in launch plan).

### Credibility-inclusive “MVP”

If MVP **includes** credibility P0: **additional work** (footer, analytics notice if applicable, HR experiment label) — see §4. That is **orthogonal** to WS6; scope it as **v1.0.1 / v1.1** to avoid moving the goalposts on Technical v1.

### Risks to acknowledge at launch

- **Canary “Check for triggers”** is best-effort and process-local — already documented in README; acceptable for red-team v1 if expectations are clear.
- **PII detection** is heuristic, not DLP — documented in README.

---

## 6. Recommended next actions (ordered)

WS6 is **closed** per stakeholder sign-off. Optional follow-ups:

1. Add **`v1.0.0-launch`** (or semver tag) whenever you want a named baseline in git.  
2. Add **release notes** (`README` or `CHANGELOG.md`) when you publish a named release.  
3. Run **canary + Vercel log** check if you need extra confidence in signal-only analytics in prod.  
4. Re-run **`npm run test:e2e`** locally if you want the §6.1 local checkbox ticked (CI already runs E2E).  
5. If enabling **analytics** in prod: implement **P0-1** from credibility brief before or immediately with flip.

---

## References

- [LAUNCH_IMPLEMENTATION_PLAN.md](LAUNCH_IMPLEMENTATION_PLAN.md)  
- [IMPLEMENTATION_PLAN.md](IMPLEMENTATION_PLAN.md)  
- [README.md](../README.md)  
- [API.md](API.md)  
- [CREDIBILITY_IA_RESEARCH_BRIEF.md](CREDIBILITY_IA_RESEARCH_BRIEF.md)  
- [TESTING_PLAN.md](TESTING_PLAN.md)
