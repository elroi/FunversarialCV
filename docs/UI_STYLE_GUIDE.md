# FunversarialCV — UI & IA style guide (Phase 1)

**Canonical human-readable** rules for layout, progressive disclosure, and foldable UI on the FunversarialCV frontend. **Brand voice, tone, and vocabulary** stay in [BRAND_COMMUNICATION_STRATEGY.md](BRAND_COMMUNICATION_STRATEGY.md) and [brand-guide.json](brand-guide.json). **Machine-readable disclosure tiers** for agents live under `ui.disclosureTiers` in `brand-guide.json`.

**Last updated:** 2026-03-22 (Phase 1: disclosure, defaults, safe state on change).

---

## Purpose

- Give builders a **single place** to decide which disclosure pattern to use and how it should behave by default.
- Align implementation with **accessibility** expectations shared with [UX_UI_REVIEW.md](UX_UI_REVIEW.md).
- Mark patterns as **shipped** vs **target** so the doc does not over-promise.

---

## Theme and layout primitives

- **Visual metaphor:** Hacker-chic / terminal-first, dark default — see `.cursorrules` and `design` in `brand-guide.json`.
- **`functional-group`:** Wrapper class used for major on-page regions (input channel, engine config). Provides consistent padding and grouping; it is **not** itself a disclosure control.
- **Section captions:** Uppercase, tracked labels (e.g. `text-caption uppercase tracking-[0.2em] text-accent`) introduce a region before primary controls — see [frontend/app/page.tsx](../frontend/app/page.tsx) (`inputChannel`, `engineConfigTitle`).

---

## Disclosure and foldability

Use **one shared primitive** for full-width card-style disclosure: [frontend/src/components/ui/CollapsibleCard.tsx](../frontend/src/components/ui/CollapsibleCard.tsx). It provides a single tab stop, `aria-expanded`, `aria-controls`, a titled `role="region"` body, **▶ / ▼** affordances, and optional `expandOnWide`, `titleClassName`, and outer `className` overrides.

### Tiers

| Tier | ID (`brand-guide.json`) | Intent | Status | Typical implementation |
|------|-------------------------|--------|--------|-------------------------|
| **Section** | `section` | Collapse an **entire** major region to shorten the page; **must not** hide the only path to the primary action without a clear alternative. | **Target** — not uniformly implemented; today sections use static captions + `functional-group`. | Future: section-level wrapper; today: [frontend/app/page.tsx](../frontend/app/page.tsx) regions. |
| **In-section** | `inSection` | Optional detail **inside** a section, **after** the primary control (upload, main CTA). | **Shipped** | `CollapsibleCard` with default title style (uppercase caption). Examples: Sample CV under `DropZone`; egg config cards (e.g. [InvisibleHandConfigCard.tsx](../frontend/src/components/InvisibleHandConfigCard.tsx)). |
| **Out-of-section** | `outOfSection` | Standalone trust or mechanism copy **between** major blocks (not nested under one section caption). | **Shipped** | `CollapsibleCard` + `titleClassName` for sentence-case + panel `className` (e.g. lighter border/background). Example: privacy / PII details on home ([frontend/app/page.tsx](../frontend/app/page.tsx)). |
| **Inline / micro** | `inlineMicro` | Small expansion **inside** running text (verification hints, glossary). | **Shipped** | Local `button` + `aria-expanded` + `aria-controls` + `role="region"` on the revealed block. Example: Security-only “How to verify” in `PiiNoticeBlock` ([frontend/app/page.tsx](../frontend/app/page.tsx)). |

**Chevrons:** `CollapsibleCard` uses **▶ / ▼**. Inline micro-disclosure may use **▸ / ▼** next to anchor text — intentional visual weight difference; do not mix inside the same row without reason.

### `expandOnWide`

Use only when **long instructional** content should default **open** from the `md` breakpoint up and **collapsed** below, to avoid a long mobile scroll while keeping desktop scannable. Implemented via `expandOnWide` on `CollapsibleCard` (syncs to `matchMedia('(min-width: 768px)')`; user toggles still work, but **resize updates state** — the manual choice is not sticky across breakpoint changes unless we add that later).

**Example:** “How to run a fair test” / experiment flow panel on home.

---

## Default state designation

| Principle | Rule |
|-----------|------|
| Optional / supplementary | Default **collapsed** (`defaultExpanded={false}`). |
| Long instructional flows | May use **`expandOnWide`** as above. |
| Out-of-section trust depth | Default **collapsed**; opening is an explicit choice to read long copy. |
| Inline / micro | Default **collapsed**. |
| Egg / engine config cards | Default **collapsed** (dense configuration). |
| Exceptions | Default **expanded** only with a one-line rationale in PR + update to this guide (accessibility + scan length). |

---

## Safe state on change

| Context | Intended behavior |
|---------|-------------------|
| **Viewport crosses `md` (`expandOnWide`)** | **System-driven:** follow `CollapsibleCard` (state syncs to breakpoint). Documented: toggle is not sticky across resize for this pattern. |
| **Audience switch (HR ↔ Security)** | **Reset to tier defaults** for panels whose **meaning** changes (e.g. PII block + Security-only inline verify). Avoid implying stale expanded content after mode change. |
| **New file selected / cleared** | **Preserve** expand state when the panel copy does **not** depend on which file is selected (e.g. privacy, experiment steps). **Reset** when a panel is explicitly tied to the previous file (implement when adding such a panel). |
| **Route navigation (leave and return)** | **Reset** to defaults unless persisted UI is an explicit product decision. |
| **Focus / accessibility** | When collapsing programmatically, do not leave focus inside hidden content; prefer focus on the trigger or the next logical control (incremental code improvements welcome). |

---

## Accessibility checklist (folds)

- Toggle is a **native `button`** (or equivalent semantics) with a clear **`aria-label`** or visible name.
- **`aria-expanded`** reflects open/closed state.
- Content panel has **`id`** referenced by **`aria-controls`**; panel uses **`role="region"`** and **`aria-labelledby`** where appropriate (see `CollapsibleCard`).
- **Visible focus** ring on keyboard focus (`focus-visible:ring-*`).
- **Minimum trigger height** ~44px for touch (`min-h-[44px]` on `CollapsibleCard`).

---

## When not to fold

- Do not place the **only** path to **Upload**, **Harden**, or **Download** inside a collapsed region without a strong onboarding reason.
- Do not use a fold to hide **errors** or **blocking consent**; use dialogs, alerts, or inline error regions as appropriate.

---

## Maintenance

- When adding a new `CollapsibleCard` or changing its props, update **this file** and **`ui.disclosureTiers`** in [brand-guide.json](brand-guide.json) if the pattern is new or the example anchor changes.
- **Phase 2 (optional):** typography by audience, semantic tokens, buttons, live regions, dialogs, motion — see project plan; not required for Phase 1 completeness.

---

## Related documents

- [UX_UI_REVIEW.md](UX_UI_REVIEW.md) — flow checklist and mobile-first chrome notes.
- [BRAND_COMMUNICATION_STRATEGY.md](BRAND_COMMUNICATION_STRATEGY.md) — tone, trust pillars, copy tiers.
