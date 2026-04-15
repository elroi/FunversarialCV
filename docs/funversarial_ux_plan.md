# FunversarialCV — UX Audit Plan
**Site:** https://cv.funversarial.com/  
**Scope:** Desktop · User journey & experience · Both personas  
**Status:** 🔴 2 Critical · 🟡 3 High · 🟢 3 Medium · ✅ 5 Resolved

---

## How to read this file
Each issue has a **status**, a **persona scope**, and a **resolution note** that gets filled in as we work through it.  
Statuses: `Open` · `In Progress` · `Resolved`

---

## Stack & implementation context

**Framework:** Next.js 14 (App Router), TypeScript, deployed to Vercel. Monorepo — all frontend work in `frontend/`.

**Relevant existing systems:**
- Dual-copy: `src/copy/types.ts` (Copy interface) → `src/copy/security.ts` + `src/copy/hr.ts`. All persona-specific text lives here. Type-safe — both files must implement the full interface.
- Audience toggle: `AudienceContext` (`src/contexts/AudienceContext.tsx`) + `AudienceCopyFadeShell` for crossfade. Already working.
- Egg registry: `src/eggs/registry.ts` — each egg declares `owaspMapping` from `OwaspMapping` enum. OWASP labels can be derived programmatically.
- Validation Lab API: `/api/lab/config`, `/api/lab/extract`, `/api/lab/complete` (completion env-gated).

**Key reference docs in repo (review before implementing):**
- `docs/UI_STYLE_GUIDE.md` — progressive-disclosure tiers (may already constrain accordion/reveal patterns)
- `docs/BRAND_COMMUNICATION_STRATEGY.md` — voice & tone
- `docs/IMPLEMENTATION_PLAN.md` — existing phase plan (check for conflicts with our IA changes)

**Key components for our restructure:**
- `frontend/src/components/ExperimentFlowPanel.tsx` — current "How to run a fair test" / checklist panel → becomes Quick Session
- `frontend/src/components/ValidationLab.tsx` — current Full Session component; harness-first order already implemented
- `frontend/app/page.tsx` — main page layout; `SectionFold` wrapper is the "section" disclosure tier (UI_STYLE_GUIDE marks it "Target — not uniformly implemented" — our two-session model implements this target)
- `frontend/src/copy/security.ts` + `frontend/src/copy/hr.ts` — all audience-specific text

**Tests that will break on copy/structure changes (Claude Code must update these):**
- `frontend/src/lib/validationLabProtocol.test.ts` — regex-locked to BASE-00, BASE-01, protocol shape
- `frontend/src/components/ValidationLab.test.tsx` — string-locked to prompt IDs, copy, links
- `frontend/app/page.test.tsx` — fair-test bullets, security aria, hash behavior
- `frontend/src/copy/copy.test.ts` — badge hint strings

**Implementation classification by issue:**
- Copy-only (edit security.ts + hr.ts): C2, H4, H5, M4, parts of M2
- Context/component enhancement (existing system): H3, M3
- New layout/structural work (App Router): C1, C3, H1, H2
- Behaviour/state change: H2, M1

**Already partially/fully shipped (requires re-audit before implementing):**
- HR `experimentFlowLabel` — already "STEP-BY-STEP AI CHECKLIST" (P0-3 from credibility brief done)
- "Validation Lab" — already "Try in an AI tool" in HR mode
- Harness-first Validation Lab order already implemented
- `#validation-lab-guided` deep link already implemented

**Confirmed prior research alignment:**
Our two-session model directly matches CREDIBILITY_IA_RESEARCH_BRIEF "Posture A — Serious dual-audience utility." This work IS the planned v1.1 credibility/IA horizon explicitly deferred after Technical v1 launch (2026-03-24).

---

## Architectural context (root cause of C1)

FCV was built in three phases that were never reconciled into a unified IA:

| Phase | What was added | Nature |
|-------|---------------|--------|
| V1 | Upload → inject → download | Single-purpose tool. Fast, self-contained. |
| V2 | Sample CV | On-ramp. Still within the tool's identity. |
| V3 | External validator (prompts + manual external chat) | Experiment protocol. Different time horizon, different mental mode, no defined end state. |
| V4 (planned) | In-page validator via Ollama / OpenRouter | Closes the loop — makes a fully self-contained full session achievable. |

The page accumulated the memory of how it was built rather than expressing what it's for. The result: two overlapping instruction systems, no single answer to "what is a completed session?", and a checklist that kept growing to cover every edge case without ever converging.

### Agreed architecture direction: Two declared session types

> **Quick session** — "I want to see a prompt-injected CV."  
> ~2 minutes. Sample CV → add signals → download armed CV → done. No external tools, no comparison. Teaches the concept concretely.

> **Full session** — "I want to run a controlled ATS test and see the impact."  
> ~15–20 minutes. Make the CV → run both variants through the validator → compare outputs. Drives the OWASP lesson home end-to-end.

The page opens in Quick session mode by default. Full session is a deliberate opt-in — clearly signposted, not the default cognitive load. V4 (in-page validator) makes the full session self-contained; until then, the external-tab path remains as the full session implementation.

This architecture is the primary resolution strategy for C1 and has cascading effects on H1, H2, M3, and M4.

---

## Critical Issues

### C1 · Two competing checklists
**Status:** In Progress  
**Persona:** Both  
**Root cause:**  
The page hosts two fundamentally different user journeys (tool use vs. experiment protocol) that were appended rather than restructured. The checklists are a symptom — the parent problem is an architectural identity crisis with no defined session completion state.  
**Resolution direction:**  
Redesign the IA around two declared session types (Quick / Full) — see Architectural context above. The 7-step checklist becomes the Quick session flow. The 10-step evaluation block becomes the Full session flow, opt-in. These are not two checklists on one page — they are two modes of the product.  
**Detailed IA proposal:** To be developed next.  
**Resolution:** In progress

---

### C2 · OWASP codes visible to HR persona
**Status:** Resolved  
**Persona:** HR  
**Description:**  
LLM01, LLM02, LLM09 labels with OWASP reference links appear in the sample prompts section, which is present in the HR view. An HR professional encountering "LLM01 OWASP reference" will feel lost, then suspicious. Note: HR prompt titles already partially softened (e.g. "Hidden instructions test (LLM01)") but `(LLM01)` suffix still leaks through — coordinate fix with M4.  
**Recommendation:**  
Suppress OWASP code suffixes in HR prompt titles. Replace with plain language only: "Hidden instruction test", "Document fields and contact links", "Summary bias check". Also suppress `owaspLink` in HR prompt entries.  
**Resolution:** Resolved 2026-04-15. Removed `(LLM01)`, `(LLM02)`, `(LLM09)` suffixes from HR prompt titles and dropped `owaspLink` from HR `validationPrompts` entries. Security copy unchanged. `ValidationLab.test.tsx` split into audience-specific tests. 128 tests passing.

---

### C3 · No clear primary CTA on landing
**Status:** Open  
**Persona:** Both  
**Description:**  
The first action a user can take is buried after: a PII notice, the toggle, the headline, the tagline, a Resources link, an about paragraph, and a collapsible "How to run a fair test". The user reads a wall of content before they can do anything.  
**Recommendation:**  
Elevate the two sample download buttons (Clean / Dirty DOCX) as the primary above-the-fold CTA. Let the user start immediately; explain as they go.  
**Resolution:** Open

---

## High Priority Issues

### H1 · 11+ collapsed sections create decision fatigue
**Status:** Open  
**Persona:** Both  
**Description:**  
How to run a fair test, How we protect your contact details, How it runs, Try in an AI tool, Sample JD, External comparative evaluation, BASE-00, BASE-01, LLM01, LLM02, LLM09 — all collapsed. The user doesn't know which matter, in what order, or whether any can be skipped.  
**Recommendation:**  
Collapse only secondary/advanced content. Sequence the collapsibles with numbered context: "Step 3 of 4: test in AI tool ▶". Primary flow elements should be visible by default.  
**Resolution:** Open

---

### H2 · "What the file says" panel open pre-upload
**Status:** Open  
**Persona:** Both  
**Description:**  
This panel defaults to expanded but is inert until the user has uploaded and processed a CV. An open, empty panel signals broken state.  
**Recommendation:**  
Collapse by default. Auto-expand with a visual cue after a successful "Add signals" run.  
**Resolution:** Open

---

### H3 · Toggle doesn't signal what will change
**Status:** Open  
**Persona:** Both  
**Description:**  
"For security pros / For HR" tells the user the toggle exists but gives no hint of what switching will do. The label is a persona name, not a value proposition.  
**Recommendation:**  
Add a one-line tooltip or sub-label on hover explaining each mode. Consider a brief visual theme shift on switch (e.g. purple/indigo for security, teal/green for HR) to confirm the mode change.  
**Resolution:** Open

---

### H4 · "Clean / Dirty" labels are too technical for HR
**Status:** Resolved  
**Persona:** HR  
**Description:**  
"Dirty · DOCX — See a pre-injected example" sounds alarming in the HR context. "Injected" carries a negative connotation the HR framing is trying to avoid. Note: `cleanCvCta` also uses technical "Clean · DOCX" framing — rename both CTAs together.  
**Recommendation:**  
In HR mode, rename to "Standard CV · DOCX" and "CV with signals · DOCX". Same files, persona-aware labels.  
**Resolution:** Resolved 2026-04-15. `hr.ts` `cleanCvCta` → "Standard CV · DOCX — Start here, then add your own signals ▶"; `dirtyCvCta` → "CV with signals · DOCX — See a pre-added example (no setup needed)". Also fixed `inputChannelIntro` "pre-injected example" → "pre-added example". Security copy unchanged. `page.test.tsx` updated: behavioral tests restored to security-mode regexes, new HR-specific test asserts new labels and absence of old ones. 125 tests passing.

---

### H5 · HR persona copy doesn't answer "why should I care?"
**Status:** Resolved  
**Persona:** HR  
**Description:**  
The HR about paragraph is accurate but passive: "compare before-and-after results". It doesn't land a concrete benefit hook.  
**Recommendation:**  
Reframe with a specific outcome: e.g. "See whether an AI hiring tool treats your candidate differently after small CV changes."  
**Resolution:** Resolved 2026-04-15. `hr.ts` `introLead` → "See whether an AI hiring tool treats a CV differently after small changes. Compare before-and-after results to understand what signals shift the output." Leads with concrete outcome; retains "compare before-and-after results" for test continuity. `page.test.tsx` DOM-order regexes updated. 108 tests passing.

---

## Medium Issues

### M1 · Privacy messaging repeated three times
**Status:** Open  
**Persona:** Both  
**Description:**  
The PII notice appears in the global header bar, in the upload zone, and inside the "How we protect your contact details" collapsible. Repetition can amplify anxiety rather than resolve it.  
**Recommendation:**  
One confident privacy statement in the upload zone. Remove or condense the header bar notice to an icon. Keep the collapsible detail where it is.  
**Resolution:** Open

---

### M2 · Security persona framing not visible on cold load
**Status:** Open  
**Persona:** Security  
**Description:**  
The "authorized security testing" and "LLM research in hiring pipelines" language only appears after toggling. A security professional landing cold may not bother to toggle and will see the HR-framed tagline instead.  
**Recommendation:**  
Either default the toggle to Security for direct/technical traffic, or surface the security framing in meta/SEO context so the right users self-select.  
**Resolution:** Open

---

### M3 · BASE prompts and OWASP labels collapsed in Security mode
**Status:** Open  
**Persona:** Security  
**Description:**  
The prompts and OWASP mapping are exactly the content a security professional came for, but they're collapsed inside accordions. They should be the default expanded state in Security mode.  
**Recommendation:**  
In Security mode, expand BASE prompts and OWASP-labelled sections by default. HR mode keeps them collapsed or hidden.  
**Resolution:** Open

---

### M4 · Technical vocabulary bleeds into HR evaluation steps
**Status:** Resolved  
**Persona:** HR  
**Description:**  
The 10-step external evaluation block uses terms like "signaled CV", "baseline", "BASE-01", "ingestion" — none of which are HR vocabulary. Note: "Validation Lab" title and some `flowSteps` copy has already been softened in HR mode. Full pass still needed on prompt titles (coordinate with C2 — same fix) and prompt bodies inside `VALIDATION_PROMPTS` (currently not audience-localized at all).  
**Recommendation:**  
Audit current state of `hr.ts` before writing new copy. In HR mode: "original CV" / "modified CV" / "comparison run". Prompt titles need OWASP suffix removed (coordinate with C2). Prompt bodies (`VALIDATION_PROMPTS` in `ValidationLab.tsx`) need HR variants added to `Copy` type.  
**Resolution:** Resolved 2026-04-15 (coordinated with C2). OWASP suffixes removed from HR prompt titles; `owaspLink` suppressed in HR entries. Prompt body copy already uses plain HR vocabulary. Remaining gap (prompt bodies fully audience-localized in `Copy` type) deferred — current HR prompt bodies are already plain English and acceptable.

---

## New Issue — from Validation Lab Content Audit (April 2026)

### VL-01 · Contradictory thread order instructions (P0)
**Status:** Resolved  
**Persona:** Both  
**Description:**  
`flowSteps[4]` in both `security.ts` and `hr.ts` told users to "mirror the BASE prompts" without specifying order, causing users to send the JD before BASE-00. The Validation Lab protocol requires BASE-00 as the first message, then the JD, then BASE-01+CV. A user following the Quick Session checklist would run the experiment incorrectly and get unreproducible results. Identified in the April 2026 Validation Lab Content Audit as VL-01.  
**Resolution:** Fixed 2026-04-15. Both `security.ts` and `hr.ts` `flowSteps[4]` rewritten to explicitly state: use the External comparative evaluation block — send BASE-00 first, then the JD, then BASE-01 with the CV, then follow the numbered steps. `page.test.tsx` string-locked regex updated to match new copy. All 111 tests passing.

---

## Progress Log

| Date | Issue | Action |
|------|-------|--------|
| — | — | Audit created |
| — | C1 | Root cause identified: architectural identity crisis across 3 build phases. Two-session model (Quick / Full) agreed as resolution direction. |
| — | All | Full doc synthesis complete. Stack confirmed (Next.js 14, App Router). Prior research aligned. Several issues partially shipped. VL-01 added as new P0 issue from Validation Lab audit. Plan is now Cursor-ready for implementation specs. |
| 2026-04-15 | VL-01 | Fixed flowSteps[4] in security.ts and hr.ts to specify BASE-00-first protocol order. Updated page.test.tsx. All tests green. |
| 2026-04-15 | C2, M4 | Removed OWASP code suffixes from HR prompt titles; dropped owaspLink from HR validationPrompts entries. Split ValidationLab.test.tsx OWASP link test by audience. 128 tests passing. |
| 2026-04-15 | H4 | Renamed HR cleanCvCta/dirtyCvCta to "Standard CV · DOCX" / "CV with signals · DOCX". Fixed inputChannelIntro "pre-injected" → "pre-added". Added HR-specific CTA label test. 125 tests passing. |
| 2026-04-15 | H5 | Rewrote HR introLead to lead with concrete outcome hook. Updated page.test.tsx DOM-order regexes. 108 tests passing. |
