# FunversarialCV – UX/UI Review

**Date:** 2025-03-19  
**Environment:** Local dev (http://localhost:3000)  
**Personas:** UX/UI architect (primary, cyber security–experienced); HR professional (secondary); Security professional (tertiary)  
**Method:** Cursor IDE Browser MCP; flows exercised with pause-for-feedback protocol per plan.

---

## Summary

Structured review of the FunversarialCV frontend against the UX/UI plan. All eight flows were executed. Checklist dimensions were assessed from the UX/UI architect perspective, with HR and Security persona notes where relevant. No user feedback was captured at the planned pauses during this run; findings below are from the reviewer (agent) only.

---

## Checklist results (by dimension)

| Dimension | Pass/Fail | Notes |
|-----------|-----------|--------|
| **Clarity and hierarchy** | Pass | Single primary action (Upload / Inject Eggs or Add signals) clear; headings (H1→H2→H3/H4) and sections (hero, drop zone, PII notice, egg configs, Validation Lab, Duality Monitor) distinguishable. Copy differs appropriately for HR vs Security. |
| **Trust and tone** | Pass | PII badge in the top toolbar, optional privacy block (`CollapsibleCard`), and header nav support credibility. HR view avoids jargon; Security view includes “How to verify” and technical copy. Hacker-chic / terminal aesthetic (dark theme, monospace, accents) applied consistently. |
| **Errors and recovery** | Pass (with note) | Oversize: client copy “File is too large” and API 413; E2E covers oversize in `oversize-limit.spec.ts`. Not exercised via browser (no programmatic file input). Server/network: `role="alert"` and retry present in code. Validation Lab / Duality Monitor alerts readable. |
| **Accessibility** | Pass (with note) | Skip to main content link present and first in DOM; focus order logical (Skip → title/nav → Audience → experiment collapsible → …). Resources is a header text link. Focus-visible ring (focus:ring-2 focus:ring-accent) in layout. ARIA on dialog, live regions, expand/collapse (e.g. aria-expanded, aria-controls, aria-labelledby). Skip link click was intercepted by main in test (positioning); keyboard Tab flow works. |
| **Navigation and state** | Pass | Home ↔ Resources via “Resources” and “Back home”; Audience switcher and “Back home” obvious. After success: Download and **Change file** clear; primary pipeline action (**Inject Eggs** / **Add signals**) stays available but is disabled until egg/options config changes from the last successful run—no dead ends. |
| **Security persona (tertiary)** | Pass | “How to verify” expandable discoverable (Security only); Security-specific copy (e.g. PII · client vault badge, Duality Monitor) distinct from HR. Security pro can assess transparency and control. |

---

## Flow-by-flow findings

1. **Land and understand** – Primary action and section hierarchy clear. “Instructions not available. Ensure the app can reach /api/eggs” appeared in some egg regions on initial load (timing/API); rest of page coherent.
2. **Audience switch** – HR vs Security copy and controls differ correctly; “How to verify” only in Security; Duality vs Processing steps terminology appropriate.
3. **Upload and inject eggs** – Demo CV (Clean · DOCX) loaded; Inject Eggs showed injecting state; success state with Download observed; Inject Eggs disabled until config drift. Duality Monitor stages and terminal log updated as expected.
4. **Error paths** – Oversize and server-error UX verified in code and E2E; not triggered in browser session.
5. **Server-PDF consent** – Dialog implemented with role=dialog, aria-modal, labelledby, describedby. Current product is DOCX-only; dialog not reachable in normal flow; E2E hook exists for testing.
6. **Resources** – Clear H1/H2 structure; “Back home” and Audience switcher; OWASP and recommended talk links. Back home returns to `/`.
7. **Keyboard / focus** – Tab order and expand/collapse (How to verify, Duality Monitor) verified. Skip link present; visible focus styles in layout.
8. **Responsiveness** – Viewport 375×667: all key controls and content present; responsive spacing in use.

---

## User feedback from pauses

No feedback was provided at the planned pauses during this run. Future runs can record Pass/Fail/Notes here per flow or dimension.

---

## Mobile-first chrome (2025-03-19; IA update 2026-03-19)

Canonical disclosure rules, defaults, and safe state on context change: [`UI_STYLE_GUIDE.md`](UI_STYLE_GUIDE.md).

- Shared [`SiteChrome`](../frontend/src/components/SiteChrome.tsx): `SiteHeader` (optional `secondaryNav` text link: **Resources** / **Back home**) + `SiteTopBar` (PII badge + audience only). Decorative **Ready / Engine Online** pill removed.
- **Home information architecture:** **Upload** (drop zone + sample CV; one-line `dropzonePiiNotice` for mechanism) → collapsible **How to run a fair test** (includes `positioningLine` + steps; auto-expanded from `md` via `CollapsibleCard` `expandOnWide`) → optional **intro** (security: one line; HR: omitted) → **`CollapsibleCard`** for full **PII / privacy notice** (canonical deep trust copy; out-of-section tier) → **How it runs** / eggs / Validation Lab. Top bar badge is a short label (`piiModeBadge`), not a second tagline. **Fair-test steps 4–5** align with the Validation Lab mirror protocol: **BASE-00** is sent in the external tool **before** the job description (still before any CV), matching numbered steps (2)–(3) inside the lab.
- **Validation Lab ENABLED badge:** The **ENABLED** / **Enabled** pill on a prompt row means the egg(s) that prompt targets were **included in the last successful Inject Eggs (or Add signals) run on this page** (the latest in-session download), not merely that the checkbox is on. Badges clear when a new pipeline run starts (new file, clear, or another successful **Inject Eggs** / **Add signals** after config changes) until the next success. Copy: `validationLabMatchBadgeHint` and `validationMatchBadgeAriaLabel` in [`frontend/src/copy/security.ts`](../frontend/src/copy/security.ts) and [`frontend/src/copy/hr.ts`](../frontend/src/copy/hr.ts); state from `armedEggIds` in [`frontend/app/page.tsx`](../frontend/app/page.tsx) (kept in sync with `lastHardenedConfigRef.eggIds`).
- **Copy dedupe (2026-03-19):** Avoid repeating “in memory / placeholders / nothing stored” across tagline, badge, intro, drop zone, and the privacy fold; one short mechanism near upload + expanded notice for depth. HR top-bar badge example: `Private processing: no CV storage` (`piiModeBadge`).
- **HR:** `SiteHeader` and experiment panel body use `font-sans` where applied; Security keeps `font-mono` in the experiment panel body.
- `AudienceSwitcher`: full-width split buttons on mobile, descriptive `aria-label` with full audience names.
- Viewport: `.min-h-dvh-screen` in `globals.css` (`100vh` + `100dvh` fallback chain) on main shells.
- **Acceptance (manual):** 320–375px width — no horizontal scroll; keyboard Tab through header link, audience, and collapsibles; 200% zoom — focus rings not clipped.

## Follow-up items (optional)

- **Skip link:** Investigate click interception by `<main>` (e.g. z-index or focus management) so “Skip to main content” is reliably activatable by click and keyboard.
- **Instructions not available:** If /api/eggs is sometimes slow or fails on first load, consider loading state or retry so egg “How to check & validate” regions don’t show the fallback message unnecessarily.
- **Oversize UX:** Consider adding the numeric limit (e.g. “Max 4 MB”) in the oversize error message for clarity.
