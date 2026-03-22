# Funversarial — Brand communication strategy

This document is the canonical **human-readable** guide for how the Funversarial brand speaks, what it promises, and how to apply that in product copy, UX, and planning. A machine-readable companion lives at [`brand-guide.json`](brand-guide.json); **when the brand changes, update both files together**.

## Purpose and how to use this doc

| Situation | What to do |
|-----------|------------|
| Writing UI copy or marketing | Read **Brand essence**, **Tone and language**, **UX intent**, and **Vocabulary tiers**. Match copy to audience (HR vs security) as in the app’s `AudienceContext` (`frontend/src/contexts/AudienceContext.tsx`) and `frontend/src/copy/`. |
| Layout, progressive disclosure, foldable UI | Use [**UI_STYLE_GUIDE.md**](UI_STYLE_GUIDE.md) for disclosure tiers, default expanded/collapsed rules, and safe state on context change. Tier IDs for agents: `ui.disclosureTiers` in [`brand-guide.json`](brand-guide.json). |
| Planning a feature or experiment | Load [`brand-guide.json`](brand-guide.json) and add a short **Brand check** to your plan: confirm `tone.do` / `tone.dont`, `trustPillars`, and `userExperienceGoals` for the primary persona. |
| Security or privacy review | Use **Trust and architecture as brand** for messaging-level promises; implementation detail stays in README and security docs. |

## Brand essence

**Primary elevator line:** Funversarial is a safe, hands-on lab for exploring how automated systems behave—and how information layers shape outcomes—without breaking trust.

**Mindset tagline:** Explore systems. Understand outcomes. Stay in control.

Together, these say: we are not selling chaos or malice; we sell **clarity through controlled experimentation**. The name *Funversarial* encodes playful rigor and adversarial thinking in the security-research sense (stress-testing assumptions), not encouragement to harm people or break laws.

## What we believe (unified principles)

1. **Understanding, not breaking** — We observe behavior and reveal mechanics of influence; we do not frame the product as teaching illegal or unethical exploitation.
2. **Systems are shapeable** — Inputs influence outputs; small, deliberate changes can produce large, observable effects. That is a literacy insight, not a guarantee of bad outcomes.
3. **A lab, not a lecture** — Insight comes from instrumentation and experimentation in a sandbox-like experience, not from dense theory alone.
4. **Complexity should be approachable** — Advanced ideas are available without dumbing them down; technical and non-technical audiences both deserve language that fits their context.
5. **Curiosity is valuable** — Questioning outcomes and exploring “why” is encouraged; blind trust in opaque systems is not required.
6. **Responsibility matters** — Exploration pairs with ethics: respect for data, safe experimentation, and clarity about intent (red-team / audit framing where appropriate).
7. **The architecture of duality** — Good security literacy means understanding the interplay between human intent and automated logic (“technical handshake”). Data sovereignty is supported by knowing what crosses that boundary.

## Audiences and translation (the universal translator)

Funversarial is a shared space where perspectives align on risk and literacy:

| Audience | What they should get |
|----------|----------------------|
| **Technical professionals** | A tactical toolkit for auditing information flow, red-teaming processes, and validating parsers—precise terms where they earn clarity. |
| **Non-technical professionals** | An interpretability lens: less “black box” mystery, more strategic confidence—plain language by default. |

The product may expose **two modes** (e.g. HR vs security) for the same truth told at different depths. That is intentional: one brand, **tiered vocabulary** (see below).

## Tone and language

### Character

| Trait | Meaning |
|-------|---------|
| Curious | Encourages exploration and questioning |
| Clear | Makes complex ideas understandable |
| Practical | Focused on real interaction, not theory alone |
| Balanced | Depth with accessibility |
| Responsible | Trust and thoughtful use |

### Do

- Be **direct**, **thoughtful**, and **grounded**.
- Allow **light playfulness** (wit, lab metaphors)—never trivializing risk or people.
- Use **persona-appropriate** vocabulary (see tiers below).

### Don’t

- Use **unnecessary jargon** in default / HR-facing surfaces.
- Sound **aggressive** toward people (“trick recruiters,” “destroy parsers”)—prefer systems, processes, and measurable behavior.
- **Sensationalize** or **over-promise** (“unbeatable,” “foolproof”).
- Imply **illegal or unethical** use.

### Vocabulary tiers

| Tier | When to use | Examples |
|------|-------------|----------|
| **Plain (default)** | Primary UI, onboarding, HR mode | explore, understand, configure, download, privacy, scan |
| **Technical (security / audit)** | Security mode, docs for builders | instrument, vector, audit, triage, red team, OWASP, parser |
| **Product lexicon** | Consistent across modes when naming features | Egg, Inject Eggs (security primary action), Add signals (HR), Duality Monitor (define once, link to glossary) |

**Reconciling “strategic language” with “avoid jargon”:** Prefer plain language until the reader has opted into—or clearly benefits from—precision. The brand is **sharp**, not **inaccessible**.

### “Adversarial” in copy

- **OK:** Product family name, technical domain (adversarial ML, adversarial robustness), responsible red-team framing.
- **Avoid in user-facing marketing:** Language that sounds like attacking individuals, cheating, or breaking rules.

## UX intent

When someone uses Funversarial, they should feel:

- “I can explore this myself.”
- “I understand more than I did before.”
- “This is something I can reason about.”
- “I am not dependent on blind trust.”

**Visual and interaction metaphor:** Interactive lab, high contrast, terminal-first **hacker-chic** aesthetic (dark mode default), aligned with project design rules in `.cursorrules`. Serious insights through an engaging, high-contrast lens—not a corporate training portal.

**Interaction and IA details** (folds, defaults, context changes): see [`UI_STYLE_GUIDE.md`](UI_STYLE_GUIDE.md).

## Trust and architecture as brand

Messaging should reflect what the product actually does:

- **Stateless / zero-retention** — Files exist only in volatile processing paths; no long-term storage of uploads as a core promise.
- **PII awareness** — Dehydration/rehydration or sanitization patterns support experimentation without unnecessarily exposing raw sensitive data to processing logic; describe at a **promise** level here, implementation in code and README.
- **Responsible experimentation** — Features are framed as literacy, audit, and resilience testing—not harassment or fraud enablement.

These points are **brand proof points** as well as architecture.

## Product scope

### Today: FunversarialCV

The repository ships **FunversarialCV**—tools to inject OWASP-aligned “eggs” into and audit **professional documents** (CVs/resumes), with scans and privacy-conscious processing. All contributor and roadmap docs should treat this as the **current product scope** unless stated otherwise.

### Vision: broader Funversarial ecosystem (not shipped as one product)

Illustrative future directions for the **family** brand (do not present as available unless built):

- **Funversarial Prompts** — Layering of instructions and defensive input design.
- **Funversarial Policies** — Stress-testing organizational rules against realistic scenarios.
- **Funversarial Fraud** — Awareness patterns for social-engineering resilience (ethical simulation framing).

Label any mention of these clearly as **vision / roadmap**, not a commitment.

## Machine-readable companion

[`docs/brand-guide.json`](brand-guide.json) mirrors this document for agents, scripts, and plan templates. Use `schemaVersion` when evolving the shape of that file. Disclosure tier metadata lives under `ui.disclosureTiers`; the narrative spec is [`UI_STYLE_GUIDE.md`](UI_STYLE_GUIDE.md).

### Brand check (for plans and PRs)

1. Name the primary persona (candidate, HR, security, privacy/compliance, builder).
2. Confirm copy tier (plain vs technical) matches the surface.
3. Verify no `tone.dont` violations and at least one relevant `userExperienceGoal` addressed.
4. If the feature touches data, cite how it upholds `trustPillars` at user-visible level.

---

## Appendix A — Draft comparison matrix (merge notes)

How the two internal drafts were reconciled:

| Theme | Universal architecture draft | Final communication draft | Resolution in this doc |
|-------|-------------------------------|---------------------------|-------------------------|
| Core essence | Safe hands-on lab; systems influenced | Explore / understand / control | Both: elevator line + mindset tagline |
| Principles ×6 | Four principles + duality | Six communication commitments | Merged into seven non-redundant beliefs |
| Tone | Playful + sharp; strategic terms | Direct; avoid jargon and aggression | Tiers + explicit “adversarial” copy rules |
| UX | Lab, terminal, hacker-chic | Four “should feel” bullets | Combined in **UX intent** + aesthetic pointer |
| Trust | Stateless vault, dehydration | Responsibility | **Trust and architecture** section |
| Scope | Ecosystem list with CV pilot | (implicit single brand) | **Product scope**: CV today, vision labeled |

---

## Appendix B — Glossary (product lexicon)

| Term | Meaning |
|------|---------|
| **Egg** | A pluggable transformation mapped to an OWASP LLM risk (or creative category); user-configurable. |
| **Inject Eggs** | Security-mode primary action: run the pipeline to produce an output document with selected eggs applied (HR mode: **Add signals**, same pipeline). |
| **Duality** | Human-facing vs machine-facing layers of the same document; also the security-for-AI / AI-for-security framing. |
| **Instrument / vector / audit / triage** | Technical vocabulary for security-mode copy—signals, paths of influence, structured review, prioritization. |
| **Stateless Vault** | Pattern: dehydrate sensitive patterns for processing, rehydrate for output—brand + architecture name. |

---

## Appendix C — Sources and revision

- **Source drafts (archived in repo):**
  - [docs/brand/drafts/Funversarial_Brand_Architecture_Universal.md](brand/drafts/Funversarial_Brand_Architecture_Universal.md)
  - [docs/brand/drafts/funversarial_brand_communication_final.md](brand/drafts/funversarial_brand_communication_final.md)
  - Index: [docs/brand/drafts/README.md](brand/drafts/README.md)
- **Consolidated guide:** This document and [`brand-guide.json`](brand-guide.json) are the canonical sources for product work; drafts are preserved inputs only.
- **Revision:** Update this file and `brand-guide.json` in the same change when altering brand rules.
