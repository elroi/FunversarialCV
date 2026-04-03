# Validation Lab — content and structure audit memo

**Scope:** Review-only deliverable from the Validation Lab audit plan (April 2026). No product code was changed to produce this document.

**Goal:** Single inventory of sources of truth, duplication and drift risks, IA observations, persona findings, and prioritized issues (P0–P2), plus optional structural recommendations for a follow-up implementation pass.

---

## 1. Executive summary

The Validation Lab works, but **content and instructions are split across many files**, with **meaningful duplication** of the “fit gap” narrative and a **hard contradiction** between **How to run a fair test** (step 5) and the **Validation Lab protocol** (BASE-00 must precede the JD). **HR** copy softens console language, yet **`VALIDATION_PROMPTS` remains security-flavored and shared** across audiences. **`parseValidationLabProtocol`** ties copy shape to UI: a bad edit switches to a **fallback layout** with different badge placement. **E2E** does not cover Validation Lab; coverage is **unit/integration tests** with **string-locked** assertions.

---

## 2. Phase 1 — Artifact inventory

| Artifact | Path | Role |
|----------|------|------|
| Section shell, `armedEggIds`, attention pulse after DOCX download | [`frontend/app/page.tsx`](../frontend/app/page.tsx) | Wraps lab in `SectionFold`; passes clipboard success into `DualityMonitor` log |
| Lab UI layout, `VALIDATION_PROMPTS`, parse vs fallback branching | [`frontend/src/components/ValidationLab.tsx`](../frontend/src/components/ValidationLab.tsx) | Renders **Sample JD → protocol → prompts**; two render paths for protocol |
| Inline link rendering in protocol steps | [`frontend/src/lib/protocolStepRichText.tsx`](../frontend/src/lib/protocolStepRichText.tsx) | `[label](url)` in step lines |
| Protocol headline + numbered-step parser | [`frontend/src/lib/validationLabProtocol.ts`](../frontend/src/lib/validationLabProtocol.ts) | Returns `null` if shape invalid |
| Parser unit tests (locks security/hr protocol shape) | [`frontend/src/lib/validationLabProtocol.test.ts`](../frontend/src/lib/validationLabProtocol.test.ts) | Regression on real `Copy` strings |
| Synthetic JD body + clipboard export | [`frontend/src/lib/sampleJobDescription.ts`](../frontend/src/lib/sampleJobDescription.ts) | NexusFlow text; comment documents intent |
| Sample JD sanity test | [`frontend/src/lib/sampleJobDescription.test.ts`](../frontend/src/lib/sampleJobDescription.test.ts) | Asserts synthetic content |
| `Copy` type — Validation Lab keys | [`frontend/src/copy/types.ts`](../frontend/src/copy/types.ts) | Contract for localized strings |
| Security strings | [`frontend/src/copy/security.ts`](../frontend/src/copy/security.ts) | `validationLab*`, `sampleJob*`, `flowSteps` |
| HR strings | [`frontend/src/copy/hr.ts`](../frontend/src/copy/hr.ts) | Same keys; softened wording |
| Fair test panel (consumes `flowSteps`) | [`frontend/src/components/ExperimentFlowPanel.tsx`](../frontend/src/components/ExperimentFlowPanel.tsx) | Upstream summary; references Validation Lab by name |
| Component tests | [`frontend/src/components/ValidationLab.test.tsx`](../frontend/src/components/ValidationLab.test.tsx) | Prompt rows, copy, badge, links |
| Copy tests | [`frontend/src/copy/copy.test.ts`](../frontend/src/copy/copy.test.ts) | Badge hint semantics |
| Home page tests | [`frontend/app/page.test.tsx`](../frontend/app/page.test.tsx) | DOM order, fair-test text, lab collapsible |
| UI disclosure / examples | [`docs/UI_STYLE_GUIDE.md`](UI_STYLE_GUIDE.md) | `ValidationLab.tsx` cited |
| UX / IA notes | [`docs/UX_UI_REVIEW.md`](UX_UI_REVIEW.md) | ENABLED badge semantics, home IA |
| Disclosure tier refs | [`docs/brand-guide.json`](brand-guide.json) | `ValidationLab.tsx` in `inSection` example |
| Credibility / rename backlog | [`docs/CREDIBILITY_IA_RESEARCH_BRIEF.md`](CREDIBILITY_IA_RESEARCH_BRIEF.md) | HR “Validation Lab” tone, classroom vocabulary |

**Additional notes**

- **E2E:** No Playwright specs reference Validation Lab or fair-test strings under `frontend/e2e/` (grep April 2026).
- **CONTRIBUTING.md:** No guidance on `validationLabManualMirrorProtocol` format or parser contract.
- **Storybook:** No stories for `ValidationLab`.

### 2.1 Parse fallback path (“hidden” UI)

In [`ValidationLab.tsx`](../frontend/src/components/ValidationLab.tsx), `parseValidationLabProtocol(copy.validationLabManualMirrorProtocol)`:

- Returns **`null`** if the string splits into fewer than **two** `\n\n`-separated blocks, or if no lines match `^(n) ` after the first block.
- **Parsed path:** Card with title/subtitle/description, numbered `<ol>`, `ProtocolStepRichText`, then **ENABLED** hint inside `<details>`.
- **Fallback path:** Same string rendered as **plain paragraphs** via `split(/\n\n+/)`, then badge hint as a **visible paragraph** (not inside `<details>`).

Maintainers must treat the protocol string as **schema-bearing**, not free prose.

---

## 3. Phase 2 — Content review

### 3.1 Duplication map (fit gap / NexusFlow / thread order)

| Message | Primary surfaces |
|--------|-------------------|
| Synthetic logistics/AI JD + deliberate CV mismatch + BASE-01 should show moderate/low fit | `sampleJobDescriptionIntro` **and** protocol headline `description` (security + HR) |
| Thread order BASE-00 → JD → BASE-01+CV | Protocol description **and** embedded in several `VALIDATION_PROMPTS` bodies (“after BASE-00 and BASE-01 in the lab protocol”) |
| Optional custom hidden note before run | Protocol (LLM01 / Invisible Hand) **and** egg config UI elsewhere |
| “Open Validation Lab / copy sample JD / use external tool / paste prompts” | `flowSteps` items 4–6 **and** protocol steps (1)–(10) |

**Canonical vs cross-reference (recommendation for a later edit pass):** Pick **one** place for the full “why mismatch + expected BASE-01” explanation (either JD intro **or** protocol description, not both at equal length). Use the other surface for a **one-line pointer**. Keep thread-order rules **only** in the protocol (or only in prompts), not in three places.

### 3.2 Contradiction: fair test step 5 vs lab protocol

- **Security** [`flowSteps[4]`](../frontend/src/copy/security.ts): *“In your external LLM, send the job description alone as the **first message** (before any CV)”*
- **HR** [`flowSteps[4]`](../frontend/src/copy/hr.ts): same pattern.
- **Protocol** (both audiences): Step (2) is BASE-00; step (3) is copy/send **sample JD**. So the **first message** in the external thread should be **BASE-00**, not the JD.

**Severity:** **P0** for reproducibility — users following the fold above the fold can diverge from the lab protocol without noticing.

### 3.3 LLM02 prompt vs eggs

- [`VALIDATION_PROMPTS`](../frontend/src/components/ValidationLab.tsx): `LLM02` has `eggIds: ["metadata-shadow", "incident-mailto"]` and title “Metadata Shadow / Mailto (Insecure Output)”.
- **Badge:** ENABLED if **any** targeted egg was in the last successful run — correct for a combined diagnostic prompt.
- **Copy alignment:** Prompt asks for name, email, and **“Internal Priority Level”** (metadata-forward). Mailto is a **link/social-engineering** angle per egg copy in `security.ts`; the prompt does not mention mailto explicitly. Acceptable as a **single follow-up** that can surface either vector, but **document** that LLM02 is intentionally **dual-target** so future edits do not split the row incorrectly.

### 3.4 Terminology glossary (surfaces)

| Term / pattern | Security | HR | Validation prompts (code) |
|----------------|----------|-----|---------------------------|
| Primary CTA | Inject Eggs | Add signals | “lab protocol”; no HR variant |
| Arming | arm eggs / armed / injected | signals / signaled | “armed” in descriptions N/A — uses “lab protocol” |
| Badge | ENABLED | Enabled | Same IDs; styling from copy |
| Section name | Validation Lab | Validation Lab | N/A |
| Protocol title | External comparative evaluation | Same | — |
| Experiment chrome | RUN THE CV EXPERIMENT | Same label today | — |

HR softens **protocol** and **badge** strings but **not** prompt `title` / `description` / `prompt` bodies (still OWASP-linked and technical).

### 3.5 Audience parity

- **Localized:** `validationLabManualMirrorProtocol`, JD intros/buttons, badge hints, aria labels, `validationLabPromptListCaption` (“Test prompts” vs “Sample prompts”).
- **Not localized:** Entire `VALIDATION_PROMPTS` array (English, security tone, monospace-friendly IDs).

**Decision for product:** Either **accept** prompts as English-only technical artifacts for both audiences, or **scope** moving prompt metadata (and optionally bodies) into `Copy` or shared JSON with HR variants.

### 3.6 Parser fragility

- **Headline block:** First `\n\n`-delimited chunk; line 1 = title; line 2 starting with em/en dash = subtitle; rest = description.
- **Steps:** Lines after first chunk must start with `(n)` to start a step; continuations append to previous step.
- **Risk:** Editing the protocol in `security.ts` / `hr.ts` without preserving shape **silently changes UI** (fallback). **No contributor-facing warning** today.

---

## 4. Phase 3 — Information architecture

### 4.1 Dual entry (fair test vs Validation Lab)

- **Fair test** is high in the page ([`UX_UI_REVIEW.md`](UX_UI_REVIEW.md) home IA) and **repeats** procedural intent.
- **Validation Lab** holds the **authoritative** step sequence and prompts.

**Options (trade-offs only):**

1. **Pointer-only fair test:** Steps 4–6 become “Open Validation Lab and follow the numbered steps” — less duplication; relies on users expanding the lab.
2. **Keep summary + align wording:** Keep short steps but **fix contradictions** (especially step 5 vs BASE-00) and align verbs with protocol.
3. **Anchor link:** Fair test step links to `#validation-lab` — improves discoverability; still need copy alignment.

### 4.2 Visual order vs narrative

Rendered order: **Sample JD** (with intro) → **protocol** (references “prompts below” and “Sample job description panel”) → **prompts**. Reading order is coherent; the **duplicate intros** (JD panel + protocol description) are the main clutter, not the sequence.

### 4.3 Progressive disclosure depth

Three mechanisms: outer `SectionFold`, multiple `CollapsibleCard`s (JD + each prompt), `<details>` for badge hint (parsed path only). **Cognitive load:** high but consistent with “lab bench” metaphor. **Credibility brief** suggests HR rename / less classroom tone — conflicts slightly with deep nesting unless copy is warmed.

### 4.4 Section naming (credibility backlog)

[`CREDIBILITY_IA_RESEARCH_BRIEF.md`](CREDIBILITY_IA_RESEARCH_BRIEF.md) lists **P2** HR Validation Lab rename + copy pass. Security audience may keep “Validation Lab”; HR might use “Try in an AI tool” or similar — **requires** `flowSteps`, `validationLabTitle`, `validationLabCollapsibleAriaLabel`, and possibly Resources cross-links to stay consistent.

---

## 5. Phase 4 — Documentation and test blast radius

**Docs likely touched after a content/IA fix:**

- [`docs/UX_UI_REVIEW.md`](UX_UI_REVIEW.md) — if fair-test steps or badge semantics change.
- [`docs/UI_STYLE_GUIDE.md`](UI_STYLE_GUIDE.md) — if structure or disclosure pattern changes.
- [`docs/CREDIBILITY_IA_RESEARCH_BRIEF.md`](CREDIBILITY_IA_RESEARCH_BRIEF.md) — if HR rename ships.
- [`docs/API.md`](API.md) — only if a user-visible API contract changes (unlikely for copy-only work).

**Tests that encode exact strings (update when copy changes):**

- [`frontend/src/lib/validationLabProtocol.test.ts`](../frontend/src/lib/validationLabProtocol.test.ts) — regexes on live protocol (`BASE-00`, `BASE-01`, tab/baseline wording).
- [`frontend/src/components/ValidationLab.test.tsx`](../frontend/src/components/ValidationLab.test.tsx) — “Copy the BASE-00 prompt below”, prompt IDs, link `name` patterns.
- [`frontend/app/page.test.tsx`](../frontend/app/page.test.tsx) — fair-test bullets including “Open Validation Lab…”, security-specific aria for LLM01 prompt control.
- [`frontend/src/copy/copy.test.ts`](../frontend/src/copy/copy.test.ts) — `Inject Eggs` / `Add signals` in badge hints.

---

## 6. Persona findings (condensed)

| Persona | Finding |
|---------|---------|
| **Security practitioner** | **P0:** Fair-test step 5 contradicts BASE-00-first protocol. Duplication increases risk of partial adherence. |
| **HR / non-specialist** | Section title and fair-test steps still say “Validation Lab”; prompts use “lab protocol” and OWASP jargon — **tone gap**. |
| **Candidate / learner** | Fit-gap explanation is **strong** but **repeated**; may still help retention. |
| **Accessibility** | Parsed vs fallback paths **differ** for badge hint (`<details>` vs always-visible paragraph). If copy breaks parse, SR users get a **different** structure. |
| **Maintainer** | Strings referencing **BASE-00**, **BASE-01**, **LLM01**, **LLM09**, **NexusFlow** appear in: `sampleJobDescription.ts`, `security.ts`, `hr.ts`, `ValidationLab.tsx`, tests. **No CONTRIBUTING note** on protocol format. |

**String reference list (drift hotspots):** `frontend/src/lib/sampleJobDescription.ts`; `frontend/src/copy/security.ts` & `hr.ts` (`flowSteps`, `sampleJobDescriptionIntro`, `validationLabManualMirrorProtocol`); `frontend/src/components/ValidationLab.tsx` (`VALIDATION_PROMPTS`); `frontend/src/copy/types.ts` (comment mentions NexusFlow); tests listed in §5.

---

## 7. Prioritized issues

| ID | Severity | Issue |
|----|----------|--------|
| **VL-01** | **P0** | `flowSteps[4]` says JD is the **first** external message; protocol requires **BASE-00** first (security + HR). |
| **VL-02** | **P1** | Repeated “mismatch / BASE-01 expectation” across JD intro and protocol description — consolidate or cross-reference. |
| **VL-03** | **P1** | `VALIDATION_PROMPTS` not audience-localized; HR sees security phrasing inside prompt bodies. |
| **VL-04** | **P1** | Parser/fallback UX divergence for badge hint; no contributor documentation for protocol schema. |
| **VL-05** | **P2** | Fair test vs Validation Lab overlap — consider shortening fair test to pointer + link. |
| **VL-06** | **P2** | Credibility brief: HR rename / softer “lab” vocabulary — needs coordinated key updates. |
| **VL-07** | **P2** | No E2E coverage for Validation Lab; regressions caught only by unit tests and manual QA. |

---

## 8. Recommendation appendix (implementation-ready hints; no code here)

1. **Fix VL-01 first:** Rewrite step 5 in both `flowSteps` to match protocol (e.g. open Validation Lab, send BASE-00, then JD, then follow protocol) **or** explicitly say “first *content* message after thread setup” if you redefine the model — **must** match step (2)–(3) ordering.
2. **Dedupe narrative:** Shorten either `sampleJobDescriptionIntro` or protocol `description` by ~50% and point to the other.
3. **Prompts in `Copy` or `validationPrompts.security.json` / `.hr.json`:** Improves parity; increases type surface and test updates.
4. **CONTRIBUTING or inline comment:** Document `\n\n` + `(n)` contract and run `npm test -- validationLabProtocol`.
5. **Optional `#validation-lab`:** Add id on existing section if not present for deep link from fair test (verify `SectionFold` exposes id).
6. **E2E (later):** Smoke expand Validation Lab, assert BASE-00 visible, optional clipboard mock — lower priority than VL-01.

---

## 9. Handoff

When implementing, tie each **VL-xx** item to the files in §2, update tests in §5, and follow repo **TDD** expectations for non-trivial logic changes. This memo is the **single review artifact** for the audit plan; the plan file itself was not modified.

---

## 10. Implementation progress (rolling tracker)

Tracks the phased rollout aligned with the Validation Lab implementation plan (VL-01 through VL-07).

| Phase | Scope | Status |
|-------|--------|--------|
| **A** | VL-01 — Fair-test `flowSteps` aligned with BASE-00 → JD protocol | **Done** ([`security.ts`](../frontend/src/copy/security.ts) / [`hr.ts`](../frontend/src/copy/hr.ts) steps 4–5; [`page.test.tsx`](../frontend/app/page.test.tsx); [`UX_UI_REVIEW.md`](UX_UI_REVIEW.md)) |
| **B** | VL-04 doc + VL-02 narrative dedupe + inline copy comments | **Done** — CONTRIBUTING protocol section; shortened protocol `description` (removed duplicate JD/CV/BASE-01 paragraph); `sampleJobDescriptionIntro` carries fit-gap + pointer; [`validationLabProtocol.test.ts`](../frontend/src/lib/validationLabProtocol.test.ts) expectations updated |
| **C** | VL-04 — Unify badge-hint UI when parse fallback | **Done** — shared `ValidationLabMatchBadgeHintDetails`; `manualMirrorProtocolOverride` for tests ([`ValidationLab.tsx`](../frontend/src/components/ValidationLab.tsx)) |
| **D** | VL-03 — Audience-localized validation prompts (`Copy.validationPrompts`) | **Done** — [`types.ts`](../frontend/src/copy/types.ts) `ValidationLabPromptEntry`; security vs HR strings in [`security.ts`](../frontend/src/copy/security.ts) / [`hr.ts`](../frontend/src/copy/hr.ts); [`ValidationLab.tsx`](../frontend/src/components/ValidationLab.tsx) reads `copy.validationPrompts` |
| **E** | VL-05 — Fair test points to Validation Lab protocol (less duplication) | **Done** — `flowSteps` 4–6 in [`security.ts`](../frontend/src/copy/security.ts) / [`hr.ts`](../frontend/src/copy/hr.ts); [`UX_UI_REVIEW.md`](UX_UI_REVIEW.md) |
| **F** | VL-06 — HR section rename / credibility copy | **Done** — HR `validationLabTitle` **Try in an AI tool**; `validationLabCollapsibleAriaLabel` + `flowSteps[3]` updated in [`hr.ts`](../frontend/src/copy/hr.ts); [`CREDIBILITY_IA_RESEARCH_BRIEF.md`](CREDIBILITY_IA_RESEARCH_BRIEF.md) table row updated |
| **G** | VL-07 — E2E smoke for Validation Lab | **Done** — [`frontend/e2e/specs/validation-lab.spec.ts`](../frontend/e2e/specs/validation-lab.spec.ts) (security + HR fold, assert **BASE-00**) |
